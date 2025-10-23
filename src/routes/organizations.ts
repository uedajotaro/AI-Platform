// ============================================
// Organizations Routes
// ============================================

import { Hono } from 'hono';
import type { Env } from '../types';
import { dbHelper } from '../db';
import { authMiddleware, requireRole } from '../auth';

const organizations = new Hono<{ Bindings: Env }>();

// GET /organizations/me - Get current user's organization
organizations.get('/me', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');

    const org = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM organizations WHERE owner_user_id = ?',
      [session.userId]
    );

    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json({ organization: org });
  } catch (error) {
    console.error('Get organization error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /organizations - Create organization
organizations.post('/', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const { name, tax_id, invoice_number, billing_email } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Organization name is required' }, 400);
    }

    // Check if organization already exists
    const existing = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM organizations WHERE owner_user_id = ?',
      [session.userId]
    );

    if (existing) {
      return c.json({ error: 'Organization already exists for this user' }, 400);
    }

    const result = await dbHelper.execute(
      c.env.DB,
      'INSERT INTO organizations (owner_user_id, name, tax_id, invoice_number, billing_email) VALUES (?, ?, ?, ?, ?)',
      [session.userId, name, tax_id, invoice_number, billing_email]
    );

    return c.json({ message: 'Organization created', id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Create organization error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /organizations/:id - Update organization
organizations.put('/:id', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');
    const { name, tax_id, invoice_number, billing_email } = await c.req.json();

    // Verify ownership
    const org = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM organizations WHERE id = ? AND owner_user_id = ?',
      [id, session.userId]
    );

    if (!org) {
      return c.json({ error: 'Organization not found or access denied' }, 403);
    }

    await dbHelper.execute(
      c.env.DB,
      'UPDATE organizations SET name = ?, tax_id = ?, invoice_number = ?, billing_email = ?, updated_at = datetime("now") WHERE id = ?',
      [name || org.name, tax_id, invoice_number, billing_email, id]
    );

    return c.json({ message: 'Organization updated' });
  } catch (error) {
    console.error('Update organization error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default organizations;
