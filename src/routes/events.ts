// ============================================
// Event Routes (研修/ウェビナー)
// ============================================

import { Hono } from 'hono';
import type { Env, Event } from '../types';
import { dbHelper } from '../db';
import { authMiddleware, requireRole, optionalAuth } from '../auth';

const events = new Hono<{ Bindings: Env }>();

// GET /events - List events with filters
events.get('/', optionalAuth, async (c) => {
  try {
    const { theme, tool, industry, date_from, price_max, recording, status } = c.req.query();

    let sql = `
      SELECT e.*, o.name as org_name 
      FROM events e
      JOIN organizations o ON e.org_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    } else {
      sql += ' AND e.status = "published"';
    }

    if (date_from) {
      sql += ' AND e.start_at >= ?';
      params.push(date_from);
    }

    if (price_max) {
      sql += ' AND e.price <= ?';
      params.push(price_max);
    }

    if (recording === 'true') {
      sql += ' AND e.recording = 1';
    }

    // TODO: Add filtering by tags

    sql += ' ORDER BY e.start_at ASC LIMIT 50';

    const results = await dbHelper.query<any>(c.env.DB, sql, params);

    // Parse JSON fields
    const eventsList = results.map(row => ({
      ...row,
      theme_tags: dbHelper.parseJSON(row.theme_tags) || [],
      tool_tags: dbHelper.parseJSON(row.tool_tags) || [],
      industry_tags: dbHelper.parseJSON(row.industry_tags) || []
    }));

    return c.json({ events: eventsList });
  } catch (error) {
    console.error('Get events error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /events/:id - Get event details
events.get('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');

    const event = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT e.*, o.name as org_name, o.id as org_id
        FROM events e
        JOIN organizations o ON e.org_id = o.id
        WHERE e.id = ?
      `,
      [id]
    );

    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Parse JSON fields
    event.theme_tags = dbHelper.parseJSON(event.theme_tags) || [];
    event.tool_tags = dbHelper.parseJSON(event.tool_tags) || [];
    event.industry_tags = dbHelper.parseJSON(event.industry_tags) || [];

    // Get ticket count
    const ticketCount = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND status IN ("reserved", "paid")',
      [id]
    );

    event.tickets_sold = ticketCount?.count || 0;
    event.tickets_available = event.capacity - event.tickets_sold;

    return c.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /events - Create event
events.post('/', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const body = await c.req.json();

    const {
      title,
      description,
      theme_tags,
      tool_tags,
      industry_tags,
      difficulty,
      format,
      start_at,
      end_at,
      price,
      capacity,
      recording,
      status
    } = body;

    // Validate required fields
    if (!title || !description || !start_at || !end_at) {
      return c.json({ error: 'Title, description, start_at, and end_at are required' }, 400);
    }

    // Get organization for this user
    const org = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM organizations WHERE owner_user_id = ?',
      [session.userId]
    );

    if (!org) {
      return c.json({ error: 'Organization not found. Please create an organization first.' }, 400);
    }

    // Create event
    const result = await dbHelper.execute(
      c.env.DB,
      `
        INSERT INTO events 
        (org_id, title, description, theme_tags, tool_tags, industry_tags, 
         difficulty, format, start_at, end_at, price, capacity, recording, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        org.id,
        title,
        description,
        dbHelper.stringifyJSON(theme_tags),
        dbHelper.stringifyJSON(tool_tags),
        dbHelper.stringifyJSON(industry_tags),
        difficulty,
        format,
        start_at,
        end_at,
        price || 0,
        capacity || 100,
        recording ? 1 : 0,
        status || 'draft'
      ]
    );

    return c.json({ message: 'Event created', id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Create event error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /events/:id - Update event
events.put('/:id', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const event = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT e.* FROM events e
        JOIN organizations o ON e.org_id = o.id
        WHERE e.id = ? AND o.owner_user_id = ?
      `,
      [id, session.userId]
    );

    if (!event) {
      return c.json({ error: 'Event not found or access denied' }, 403);
    }

    const {
      title,
      description,
      theme_tags,
      tool_tags,
      industry_tags,
      difficulty,
      format,
      start_at,
      end_at,
      price,
      capacity,
      recording,
      status,
      meeting_url
    } = body;

    await dbHelper.execute(
      c.env.DB,
      `
        UPDATE events 
        SET title = ?, description = ?, theme_tags = ?, tool_tags = ?, industry_tags = ?,
            difficulty = ?, format = ?, start_at = ?, end_at = ?, price = ?, capacity = ?,
            recording = ?, status = ?, meeting_url = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
      [
        title || event.title,
        description || event.description,
        dbHelper.stringifyJSON(theme_tags || dbHelper.parseJSON(event.theme_tags)),
        dbHelper.stringifyJSON(tool_tags || dbHelper.parseJSON(event.tool_tags)),
        dbHelper.stringifyJSON(industry_tags || dbHelper.parseJSON(event.industry_tags)),
        difficulty || event.difficulty,
        format || event.format,
        start_at || event.start_at,
        end_at || event.end_at,
        price !== undefined ? price : event.price,
        capacity || event.capacity,
        recording !== undefined ? (recording ? 1 : 0) : event.recording,
        status || event.status,
        meeting_url || event.meeting_url,
        id
      ]
    );

    return c.json({ message: 'Event updated' });
  } catch (error) {
    console.error('Update event error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /events/:id/checkout - Create checkout session for ticket purchase
events.post('/:id/checkout', authMiddleware, requireRole('learner', 'org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { payment_method } = await c.req.json(); // 'card' or 'invoice'

    // Get event details
    const event = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM events WHERE id = ? AND status = "published"',
      [id]
    );

    if (!event) {
      return c.json({ error: 'Event not found or not available' }, 404);
    }

    // Check capacity
    const ticketCount = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND status IN ("reserved", "paid")',
      [id]
    );

    if (ticketCount.count >= event.capacity) {
      return c.json({ error: 'Event is sold out' }, 400);
    }

    // Create ticket reservation
    const result = await dbHelper.execute(
      c.env.DB,
      'INSERT INTO tickets (event_id, learner_user_id, price_paid, status) VALUES (?, ?, ?, "reserved")',
      [id, session.userId, event.price]
    );

    // TODO: Create Stripe payment intent or invoice
    const ticketId = result.meta.last_row_id;

    if (payment_method === 'card') {
      // TODO: Create Stripe checkout session
      return c.json({
        message: 'Checkout session created',
        ticket_id: ticketId,
        payment_url: '#TODO_STRIPE_URL'
      });
    } else {
      // Invoice payment
      return c.json({
        message: 'Invoice payment requested',
        ticket_id: ticketId,
        status: 'reserved'
      });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default events;
