// ============================================
// Webhook Routes (Stripe, etc.)
// ============================================

import { Hono } from 'hono';
import type { Env } from '../types';
import { dbHelper } from '../db';

const webhooks = new Hono<{ Bindings: Env }>();

// POST /webhooks/stripe - Handle Stripe webhook events
webhooks.post('/stripe', async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      console.error('[WEBHOOK] Missing Stripe signature');
      return c.json({ error: 'Missing signature' }, 400);
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    });

    // Verify webhook signature
    let event;
    try {
      // Note: In production, you need to set STRIPE_WEBHOOK_SECRET
      // For local development with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
      const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } else {
        // Development mode - parse without verification
        console.warn('[WEBHOOK] No webhook secret configured - skipping signature verification');
        event = JSON.parse(body);
      }
    } catch (err: any) {
      console.error('[WEBHOOK] Signature verification failed:', err.message);
      return c.json({ error: 'Invalid signature' }, 400);
    }

    console.log(`[WEBHOOK] Received event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        console.log('[WEBHOOK] Checkout completed:', session.id);

        const ticketId = session.metadata?.ticket_id;
        const eventId = session.metadata?.event_id;

        if (!ticketId || !eventId) {
          console.error('[WEBHOOK] Missing metadata in session');
          break;
        }

        // Update ticket status to paid
        await dbHelper.execute(
          c.env.DB,
          'UPDATE tickets SET status = "paid", paid_at = datetime("now") WHERE id = ?',
          [ticketId]
        );

        console.log(`[WEBHOOK] Ticket ${ticketId} marked as paid`);

        // Create notification for learner
        const ticket = await dbHelper.queryOne<any>(
          c.env.DB,
          'SELECT * FROM tickets WHERE id = ?',
          [ticketId]
        );

        if (ticket) {
          await dbHelper.execute(
            c.env.DB,
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES (?, "purchase", "チケット購入完了", "チケットの購入が完了しました", ?)`,
            [ticket.learner_user_id, `/tickets/${ticketId}`]
          );

          console.log(`[WEBHOOK] Notification created for user ${ticket.learner_user_id}`);
        }

        // TODO: Send email notification via SendGrid

        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        console.log('[WEBHOOK] Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        console.log('[WEBHOOK] Payment failed:', paymentIntent.id);

        // Find ticket by payment intent ID and mark as failed
        const ticket = await dbHelper.queryOne<any>(
          c.env.DB,
          'SELECT * FROM tickets WHERE stripe_payment_intent_id = ?',
          [paymentIntent.id]
        );

        if (ticket) {
          await dbHelper.execute(
            c.env.DB,
            'UPDATE tickets SET status = "cancelled" WHERE id = ?',
            [ticket.id]
          );

          // Create notification
          await dbHelper.execute(
            c.env.DB,
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES (?, "system", "決済失敗", "チケットの決済に失敗しました。再度お試しください。")`,
            [ticket.learner_user_id]
          );

          console.log(`[WEBHOOK] Ticket ${ticket.id} marked as cancelled`);
        }

        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default webhooks;
