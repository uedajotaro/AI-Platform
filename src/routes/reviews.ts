// ============================================
// Reviews Routes
// ============================================

import { Hono } from 'hono';
import type { Env } from '../types';
import { dbHelper } from '../db';
import { authMiddleware } from '../auth';

const reviews = new Hono<{ Bindings: Env }>();

// POST /reviews - Create review
reviews.post('/', authMiddleware, async (c) => {
  try {
    const session = c.get('session');
    const { subject_type, subject_id, phase, rating, metrics_json, comment } = await c.req.json();

    if (!subject_type || !subject_id || !phase || !rating) {
      return c.json({ error: 'subject_type, subject_id, phase, and rating are required' }, 400);
    }

    if (rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }

    // Check if user has permission to review
    // TODO: Verify user participated in event or booking

    const result = await dbHelper.execute(
      c.env.DB,
      `
        INSERT INTO reviews 
        (subject_type, subject_id, reviewer_user_id, phase, rating, metrics_json, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        subject_type,
        subject_id,
        session.userId,
        phase,
        rating,
        dbHelper.stringifyJSON(metrics_json),
        comment
      ]
    );

    return c.json({ message: 'Review submitted', id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Create review error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /reviews - Get reviews for a subject
reviews.get('/', async (c) => {
  try {
    const { subject_type, subject_id } = c.req.query();

    if (!subject_type || !subject_id) {
      return c.json({ error: 'subject_type and subject_id are required' }, 400);
    }

    const results = await dbHelper.query<any>(
      c.env.DB,
      `
        SELECT r.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar
        FROM reviews r
        JOIN users u ON r.reviewer_user_id = u.id
        WHERE r.subject_type = ? AND r.subject_id = ?
        ORDER BY r.created_at DESC
      `,
      [subject_type, subject_id]
    );

    // Parse JSON fields
    const reviewsList = results.map(row => ({
      ...row,
      metrics_json: dbHelper.parseJSON(row.metrics_json)
    }));

    // Calculate average rating
    const avgRating = reviewsList.length > 0
      ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
      : 0;

    return c.json({
      reviews: reviewsList,
      average_rating: Math.round(avgRating * 10) / 10,
      total_count: reviewsList.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default reviews;
