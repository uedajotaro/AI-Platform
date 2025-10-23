// ============================================
// Job Routes (講師募集)
// ============================================

import { Hono } from 'hono';
import type { Env, Job } from '../types';
import { dbHelper } from '../db';
import { authMiddleware, requireRole, optionalAuth } from '../auth';

const jobs = new Hono<{ Bindings: Env }>();

// GET /jobs - List jobs with filters
jobs.get('/', optionalAuth, async (c) => {
  try {
    const { theme, tool, industry, status } = c.req.query();

    let sql = `
      SELECT j.*, o.name as org_name 
      FROM jobs j
      JOIN organizations o ON j.org_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND j.status = ?';
      params.push(status);
    } else {
      sql += ' AND j.status = "open"';
    }

    // TODO: Add filtering by tags

    sql += ' ORDER BY j.created_at DESC LIMIT 50';

    const results = await dbHelper.query<any>(c.env.DB, sql, params);

    // Parse JSON fields
    const jobs = results.map(row => ({
      ...row,
      deliverables: dbHelper.parseJSON(row.deliverables) || [],
      theme_tags: dbHelper.parseJSON(row.theme_tags) || [],
      tool_tags: dbHelper.parseJSON(row.tool_tags) || [],
      industry_tags: dbHelper.parseJSON(row.industry_tags) || []
    }));

    return c.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /jobs/:id - Get job details
jobs.get('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');

    const job = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT j.*, o.name as org_name, o.id as org_id
        FROM jobs j
        JOIN organizations o ON j.org_id = o.id
        WHERE j.id = ?
      `,
      [id]
    );

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Parse JSON fields
    job.deliverables = dbHelper.parseJSON(job.deliverables) || [];
    job.theme_tags = dbHelper.parseJSON(job.theme_tags) || [];
    job.tool_tags = dbHelper.parseJSON(job.tool_tags) || [];
    job.industry_tags = dbHelper.parseJSON(job.industry_tags) || [];

    return c.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /jobs - Create job posting
jobs.post('/', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const body = await c.req.json();

    const {
      title,
      description,
      deliverables,
      date_range,
      onsite,
      budget_min,
      budget_max,
      theme_tags,
      tool_tags,
      industry_tags
    } = body;

    // Validate required fields
    if (!title || !description) {
      return c.json({ error: 'Title and description are required' }, 400);
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

    // Create job
    const result = await dbHelper.execute(
      c.env.DB,
      `
        INSERT INTO jobs 
        (org_id, title, description, deliverables, date_range_start, date_range_end, 
         onsite, budget_min, budget_max, theme_tags, tool_tags, industry_tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        org.id,
        title,
        description,
        dbHelper.stringifyJSON(deliverables),
        date_range?.start || null,
        date_range?.end || null,
        onsite ? 1 : 0,
        budget_min,
        budget_max,
        dbHelper.stringifyJSON(theme_tags),
        dbHelper.stringifyJSON(tool_tags),
        dbHelper.stringifyJSON(industry_tags)
      ]
    );

    // TODO: Notify matching instructors

    return c.json({ message: 'Job created', id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Create job error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /jobs/:id/close - Close job posting
jobs.post('/:id/close', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');

    // Verify ownership
    const job = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT j.* FROM jobs j
        JOIN organizations o ON j.org_id = o.id
        WHERE j.id = ? AND o.owner_user_id = ?
      `,
      [id, session.userId]
    );

    if (!job) {
      return c.json({ error: 'Job not found or access denied' }, 403);
    }

    await dbHelper.execute(
      c.env.DB,
      'UPDATE jobs SET status = "closed", updated_at = datetime("now") WHERE id = ?',
      [id]
    );

    return c.json({ message: 'Job closed' });
  } catch (error) {
    console.error('Close job error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /jobs/:id/candidates - Get applications for a job
jobs.get('/:id/candidates', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const id = c.req.param('id');

    // Verify ownership
    const job = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT j.* FROM jobs j
        JOIN organizations o ON j.org_id = o.id
        WHERE j.id = ? AND o.owner_user_id = ?
      `,
      [id, session.userId]
    );

    if (!job) {
      return c.json({ error: 'Job not found or access denied' }, 403);
    }

    // Get applications
    const applications = await dbHelper.query<any>(
      c.env.DB,
      `
        SELECT a.*, 
               i.headline, i.bio, i.skills, i.tools, i.industries, i.rate_type, i.rate_min, i.rate_max,
               u.name, u.email, u.avatar_url
        FROM applications a
        JOIN instructors i ON a.instructor_id = i.id
        JOIN users u ON i.user_id = u.id
        WHERE a.job_id = ?
        ORDER BY a.created_at DESC
      `,
      [id]
    );

    // Parse JSON fields
    const candidates = applications.map(row => ({
      ...row,
      skills: dbHelper.parseJSON(row.skills) || [],
      tools: dbHelper.parseJSON(row.tools) || [],
      industries: dbHelper.parseJSON(row.industries) || []
    }));

    return c.json({ candidates });
  } catch (error) {
    console.error('Get candidates error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /jobs/:id/candidates/:applicationId/accept - Accept application
jobs.post('/:id/candidates/:applicationId/accept', authMiddleware, requireRole('org', 'admin'), async (c) => {
  try {
    const session = c.get('session');
    const jobId = c.req.param('id');
    const applicationId = c.req.param('applicationId');

    // Verify ownership and get job details
    const job = await dbHelper.queryOne<any>(
      c.env.DB,
      `
        SELECT j.*, o.id as org_id FROM jobs j
        JOIN organizations o ON j.org_id = o.id
        WHERE j.id = ? AND o.owner_user_id = ?
      `,
      [jobId, session.userId]
    );

    if (!job) {
      return c.json({ error: 'Job not found or access denied' }, 403);
    }

    // Get application
    const application = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM applications WHERE id = ? AND job_id = ?',
      [applicationId, jobId]
    );

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Update application status
    await dbHelper.execute(
      c.env.DB,
      'UPDATE applications SET status = "accepted", updated_at = datetime("now") WHERE id = ?',
      [applicationId]
    );

    // Create booking (escrow)
    const amount = job.budget_max || job.budget_min || 0;
    await dbHelper.execute(
      c.env.DB,
      `
        INSERT INTO bookings 
        (subject_type, subject_id, org_id, instructor_id, amount, start_at, end_at)
        VALUES ('job', ?, ?, ?, ?, ?, ?)
      `,
      [jobId, job.org_id, application.instructor_id, amount, job.date_range_start, job.date_range_end]
    );

    // Update job status
    await dbHelper.execute(
      c.env.DB,
      'UPDATE jobs SET status = "filled", updated_at = datetime("now") WHERE id = ?',
      [jobId]
    );

    // TODO: Send notification to instructor

    return c.json({ message: 'Application accepted and booking created' });
  } catch (error) {
    console.error('Accept application error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default jobs;
