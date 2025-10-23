// ============================================
// Instructor Routes
// ============================================

import { Hono } from 'hono';
import type { Env, Instructor } from '../types';
import { dbHelper } from '../db';
import { authMiddleware, requireRole } from '../auth';

const instructors = new Hono<{ Bindings: Env }>();

// GET /instructors - List instructors with filters
instructors.get('/', async (c) => {
  try {
    const { skill, tool, industry, verified } = c.req.query();

    let sql = `
      SELECT i.*, u.name, u.email, u.avatar_url 
      FROM instructors i
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (verified === 'true') {
      sql += ' AND i.verified = 1';
    }

    // TODO: Add filtering by skills, tools, industries (JSON search)

    sql += ' ORDER BY i.created_at DESC LIMIT 50';

    const results = await dbHelper.query<any>(c.env.DB, sql, params);

    // Parse JSON fields
    const instructors = results.map(row => ({
      ...row,
      skills: dbHelper.parseJSON(row.skills) || [],
      industries: dbHelper.parseJSON(row.industries) || [],
      tools: dbHelper.parseJSON(row.tools) || [],
      availability_json: dbHelper.parseJSON(row.availability_json)
    }));

    return c.json({ instructors });
  } catch (error) {
    console.error('Get instructors error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /instructors/:id - Get instructor details
instructors.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const instructor = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT i.*, u.name, u.email, u.avatar_url 
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        WHERE i.id = ?
      `,
      [id]
    );

    if (!instructor) {
      return c.json({ error: 'Instructor not found' }, 404);
    }

    // Parse JSON fields
    instructor.skills = dbHelper.parseJSON(instructor.skills) || [];
    instructor.industries = dbHelper.parseJSON(instructor.industries) || [];
    instructor.tools = dbHelper.parseJSON(instructor.tools) || [];
    instructor.availability_json = dbHelper.parseJSON(instructor.availability_json);

    // Get reviews
    const reviews = await dbHelper.query<any>(
      c.env.DB,
      `
        SELECT r.*, u.name as reviewer_name 
        FROM reviews r
        JOIN users u ON r.reviewer_user_id = u.id
        WHERE r.subject_type = 'instructor' AND r.subject_id = ?
        ORDER BY r.created_at DESC
      `,
      [id]
    );

    return c.json({ instructor, reviews });
  } catch (error) {
    console.error('Get instructor error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /instructors - Create or update instructor profile
instructors.post('/', authMiddleware, requireRole('instructor'), async (c) => {
  try {
    const session = c.get('session');
    const body = await c.req.json();

    const {
      headline,
      bio,
      skills,
      industries,
      tools,
      rate_type,
      rate_min,
      rate_max,
      availability_json
    } = body;

    // Check if instructor profile exists
    const existing = await dbHelper.queryOne<Instructor>(
      c.env.DB,
      'SELECT * FROM instructors WHERE user_id = ?',
      [session.userId]
    );

    if (existing) {
      // Update
      await dbHelper.execute(
        c.env.DB,
        `
          UPDATE instructors 
          SET headline = ?, bio = ?, skills = ?, industries = ?, tools = ?,
              rate_type = ?, rate_min = ?, rate_max = ?, availability_json = ?,
              updated_at = datetime('now')
          WHERE user_id = ?
        `,
        [
          headline,
          bio,
          dbHelper.stringifyJSON(skills),
          dbHelper.stringifyJSON(industries),
          dbHelper.stringifyJSON(tools),
          rate_type,
          rate_min,
          rate_max,
          dbHelper.stringifyJSON(availability_json),
          session.userId
        ]
      );

      return c.json({ message: 'Profile updated', id: existing.id });
    } else {
      // Create
      const result = await dbHelper.execute(
        c.env.DB,
        `
          INSERT INTO instructors 
          (user_id, headline, bio, skills, industries, tools, rate_type, rate_min, rate_max, availability_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          session.userId,
          headline,
          bio,
          dbHelper.stringifyJSON(skills),
          dbHelper.stringifyJSON(industries),
          dbHelper.stringifyJSON(tools),
          rate_type,
          rate_min,
          rate_max,
          dbHelper.stringifyJSON(availability_json)
        ]
      );

      return c.json({ message: 'Profile created', id: result.meta.last_row_id }, 201);
    }
  } catch (error) {
    console.error('Create/update instructor error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /instructors/:id/apply - Apply to a job
instructors.post('/:id/apply', authMiddleware, requireRole('instructor'), async (c) => {
  try {
    const session = c.get('session');
    const instructorId = c.req.param('id');
    const { job_id, cover_letter } = await c.req.json();

    // Verify instructor belongs to current user
    const instructor = await dbHelper.queryOne<Instructor>(
      c.env.DB,
      'SELECT * FROM instructors WHERE id = ? AND user_id = ?',
      [instructorId, session.userId]
    );

    if (!instructor) {
      return c.json({ error: 'Instructor profile not found or access denied' }, 403);
    }

    // Check if already applied
    const existing = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM applications WHERE job_id = ? AND instructor_id = ?',
      [job_id, instructorId]
    );

    if (existing) {
      return c.json({ error: 'Already applied to this job' }, 400);
    }

    // Create application
    const result = await dbHelper.execute(
      c.env.DB,
      'INSERT INTO applications (job_id, instructor_id, cover_letter) VALUES (?, ?, ?)',
      [job_id, instructorId, cover_letter]
    );

    // TODO: Send notification to job poster

    return c.json({ message: 'Application submitted', id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Apply to job error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default instructors;
