// ============================================
// Admin Routes (管理画面)
// ============================================

import { Hono } from 'hono';
import type { Env } from '../types';
import { dbHelper } from '../db';
import { authMiddleware, requireRole } from '../auth';

const admin = new Hono<{ Bindings: Env }>();

// All admin routes require admin role
admin.use('*', authMiddleware, requireRole('admin'));

// GET /admin/instructors/pending - Get pending instructor verifications
admin.get('/instructors/pending', async (c) => {
  try {
    const instructors = await dbHelper.query<any>(
      c.env.DB,
      `
        SELECT i.*, u.name, u.email, u.avatar_url 
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        WHERE i.verification_status = 'pending'
        ORDER BY i.created_at ASC
      `
    );

    // Parse JSON fields
    const results = instructors.map(row => ({
      ...row,
      skills: dbHelper.parseJSON(row.skills) || [],
      industries: dbHelper.parseJSON(row.industries) || [],
      tools: dbHelper.parseJSON(row.tools) || [],
      availability_json: dbHelper.parseJSON(row.availability_json)
    }));

    return c.json({ instructors: results });
  } catch (error) {
    console.error('Get pending instructors error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /admin/instructors/:id/verify - Approve or reject instructor
admin.post('/instructors/:id/verify', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, notes } = await c.req.json(); // status: 'approved' | 'rejected' | 'revision_needed'

    if (!['approved', 'rejected', 'revision_needed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    await dbHelper.execute(
      c.env.DB,
      'UPDATE instructors SET verification_status = ?, verified = ?, updated_at = datetime("now") WHERE id = ?',
      [status, status === 'approved' ? 1 : 0, id]
    );

    // TODO: Send notification to instructor

    return c.json({ message: `Instructor ${status}` });
  } catch (error) {
    console.error('Verify instructor error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /admin/reports - Get all reports
admin.get('/reports', async (c) => {
  try {
    const { status } = c.req.query();

    let sql = `
      SELECT r.*, u.name as reporter_name, u.email as reporter_email
      FROM reports r
      JOIN users u ON r.reporter_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT 100';

    const reports = await dbHelper.query<any>(c.env.DB, sql, params);

    return c.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /admin/reports/:id/action - Take action on report
admin.post('/reports/:id/action', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, admin_notes } = await c.req.json(); // status: 'reviewed' | 'actioned' | 'dismissed'

    if (!['reviewed', 'actioned', 'dismissed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    await dbHelper.execute(
      c.env.DB,
      'UPDATE reports SET status = ?, admin_notes = ?, updated_at = datetime("now") WHERE id = ?',
      [status, admin_notes, id]
    );

    return c.json({ message: `Report ${status}` });
  } catch (error) {
    console.error('Action report error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /admin/tickets/:id/refund - Refund a ticket
admin.post('/tickets/:id/refund', async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();

    // Get ticket
    const ticket = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM tickets WHERE id = ?',
      [id]
    );

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    if (ticket.status === 'refunded') {
      return c.json({ error: 'Ticket already refunded' }, 400);
    }

    // TODO: Process Stripe refund

    // Update ticket status
    await dbHelper.execute(
      c.env.DB,
      'UPDATE tickets SET status = "refunded", updated_at = datetime("now") WHERE id = ?',
      [id]
    );

    // TODO: Send notification to user

    return c.json({ message: 'Ticket refunded successfully' });
  } catch (error) {
    console.error('Refund ticket error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /admin/stats - Get platform statistics
admin.get('/stats', async (c) => {
  try {
    const [
      usersCount,
      instructorsCount,
      orgsCount,
      eventsCount,
      jobsCount,
      ticketsCount,
      revenueSum
    ] = await Promise.all([
      dbHelper.queryOne<any>(c.env.DB, 'SELECT COUNT(*) as count FROM users'),
      dbHelper.queryOne<any>(c.env.DB, 'SELECT COUNT(*) as count FROM instructors WHERE verified = 1'),
      dbHelper.queryOne<any>(c.env.DB, 'SELECT COUNT(*) as count FROM organizations'),
      dbHelper.queryOne<any>(c.env.DB, 'SELECT COUNT(*) as count FROM events WHERE status = "published"'),
      dbHelper.queryOne<any>(c.env.DB, 'SELECT COUNT(*) as count FROM jobs WHERE status = "open"'),
      dbHelper.queryOne<any>(c.env.DB, 'SELECT COUNT(*) as count FROM tickets WHERE status = "paid"'),
      dbHelper.queryOne<any>(c.env.DB, 'SELECT SUM(price_paid) as total FROM tickets WHERE status = "paid"')
    ]);

    return c.json({
      users: usersCount?.count || 0,
      instructors: instructorsCount?.count || 0,
      organizations: orgsCount?.count || 0,
      events: eventsCount?.count || 0,
      jobs: jobsCount?.count || 0,
      tickets_sold: ticketsCount?.count || 0,
      revenue: revenueSum?.total || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /admin/tags - Create new tag
admin.post('/tags', async (c) => {
  try {
    const { kind, name, slug } = await c.req.json();

    if (!kind || !name || !slug) {
      return c.json({ error: 'kind, name, and slug are required' }, 400);
    }

    const result = await dbHelper.execute(
      c.env.DB,
      'INSERT INTO tags (kind, name, slug) VALUES (?, ?, ?)',
      [kind, name, slug]
    );

    return c.json({ message: 'Tag created', id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Create tag error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /admin/tags/:id - Delete tag
admin.delete('/tags/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await dbHelper.execute(c.env.DB, 'DELETE FROM tags WHERE id = ?', [id]);

    return c.json({ message: 'Tag deleted' });
  } catch (error) {
    console.error('Delete tag error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default admin;
