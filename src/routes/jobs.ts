// ============================================
// Job Routes (講師募集)
// ============================================

import { Hono } from 'hono';
import type { Env, Job } from '../types';
import { dbHelper } from '../db';
import { authMiddleware, requireRole, optionalAuth } from '../auth';
import { recommendInstructors } from '../recommendation';

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

// GET /jobs/:id/recommended - Get recommended instructors for a job
jobs.get('/:id/recommended', authMiddleware, requireRole('org', 'admin'), async (c) => {
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

    // Get recommendations
    const scores = await recommendInstructors(c.env.DB, parseInt(id), 10);

    // Fetch full instructor details
    const instructorIds = scores.map(s => s.instructor_id);
    
    if (instructorIds.length === 0) {
      return c.json({ recommended: [] });
    }

    const placeholders = instructorIds.map(() => '?').join(',');
    const instructors = await dbHelper.query<any>(
      c.env.DB,
      `
        SELECT i.*, u.name, u.email, u.avatar_url
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        WHERE i.id IN (${placeholders})
      `,
      instructorIds
    );

    // Merge scores with instructor data
    const recommended = instructors.map(inst => {
      const scoreData = scores.find(s => s.instructor_id === inst.id);
      return {
        ...inst,
        skills: dbHelper.parseJSON(inst.skills) || [],
        tools: dbHelper.parseJSON(inst.tools) || [],
        industries: dbHelper.parseJSON(inst.industries) || [],
        availability_json: dbHelper.parseJSON(inst.availability_json),
        recommendation_score: scoreData?.score || 0,
        matched_themes: scoreData?.matched_themes || 0,
        matched_tools: scoreData?.matched_tools || 0,
        matched_industries: scoreData?.matched_industries || 0
      };
    });

    // Sort by score
    recommended.sort((a, b) => b.recommendation_score - a.recommendation_score);

    return c.json({ recommended });
  } catch (error) {
    console.error('Get recommended instructors error:', error);
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

    // Update job status to filled
    await dbHelper.execute(
      c.env.DB,
      'UPDATE jobs SET status = "filled", updated_at = datetime("now") WHERE id = ?',
      [jobId]
    );

    // Get instructor details for notification
    const instructor = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT i.*, u.name, u.email FROM instructors i JOIN users u ON i.user_id = u.id WHERE i.id = ?',
      [application.instructor_id]
    );

    // Create notification for instructor (採用通知)
    if (instructor) {
      await dbHelper.execute(
        c.env.DB,
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES (?, "job_accepted", "案件に採用されました", ?, ?)`,
        [
          instructor.user_id,
          `${job.title}の案件に採用されました。主催者と直接連絡を取って契約を進めてください。`,
          `/jobs/${jobId}`
        ]
      );
    }

    // Create notification for organization (採用完了通知)
    await dbHelper.execute(
      c.env.DB,
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, "job_filled", "講師を採用しました", ?, ?)`,
      [
        session.userId,
        `${job.title}の案件で講師を採用しました。講師と直接連絡を取って契約を進めてください。`,
        `/jobs/${jobId}`
      ]
    );

    // NOTE: エスクロー機能は削除しました
    // プラットフォームは講師と企業を繋ぐのみで、決済は当事者間で直接行います
    // 成約記録は applications テーブルの status="accepted" で保持されます

    return c.json({ 
      message: 'Application accepted. Please contact the instructor directly to arrange contract and payment.',
      instructor_email: instructor?.email,
      instructor_name: instructor?.name
    });
  } catch (error) {
    console.error('Accept application error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default jobs;
