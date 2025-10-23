// ============================================
// Notifications Routes
// ============================================

import { Hono } from 'hono';
import type { Env } from '../types';
import { dbHelper } from '../db';
import { authMiddleware } from '../auth';

const notifications = new Hono<{ Bindings: Env }>();

// GET /notifications - Get user's notifications
notifications.get('/', authMiddleware, async (c) => {
  try {
    const session = c.get('session');
    const { unread_only } = c.req.query();

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [session.userId];

    if (unread_only === 'true') {
      sql += ' AND read = 0';
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const results = await dbHelper.query<any>(c.env.DB, sql, params);

    return c.json({ notifications: results });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /notifications/:id/read - Mark notification as read
notifications.post('/:id/read', authMiddleware, async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');

    // Verify ownership
    const notification = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await dbHelper.execute(
      c.env.DB,
      'UPDATE notifications SET read = 1 WHERE id = ?',
      [id]
    );

    return c.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /notifications/read-all - Mark all notifications as read
notifications.post('/read-all', authMiddleware, async (c) => {
  try {
    const session = c.get('session');

    await dbHelper.execute(
      c.env.DB,
      'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0',
      [session.userId]
    );

    return c.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Helper function to create notification (can be called from other routes)
export async function createNotification(
  db: D1Database,
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    await dbHelper.execute(
      db,
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message, link || null]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

export default notifications;
