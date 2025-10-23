// ============================================
// Tags Routes
// ============================================

import { Hono } from 'hono';
import type { Env } from '../types';
import { dbHelper } from '../db';

const tags = new Hono<{ Bindings: Env }>();

// GET /tags - Get all tags by kind
tags.get('/', async (c) => {
  try {
    const { kind } = c.req.query();

    let sql = 'SELECT * FROM tags WHERE 1=1';
    const params: any[] = [];

    if (kind) {
      sql += ' AND kind = ?';
      params.push(kind);
    }

    sql += ' ORDER BY name ASC';

    const results = await dbHelper.query<any>(c.env.DB, sql, params);

    // Group by kind
    const grouped = results.reduce((acc, tag) => {
      if (!acc[tag.kind]) {
        acc[tag.kind] = [];
      }
      acc[tag.kind].push(tag);
      return acc;
    }, {} as Record<string, any[]>);

    return c.json({ tags: kind ? results : grouped });
  } catch (error) {
    console.error('Get tags error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default tags;
