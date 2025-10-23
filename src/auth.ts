// ============================================
// Authentication Middleware
// ============================================

import { Context, Next } from 'hono';
import type { Env, SessionData, UserRole } from './types';
import { dbHelper } from './db';

// Simple JWT-like token verification (using sessions table)
export async function verifyToken(db: D1Database, token: string): Promise<SessionData | null> {
  const session = await dbHelper.queryOne<any>(
    db,
    'SELECT s.*, u.role, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime("now")',
    [token]
  );

  if (!session) return null;

  return {
    userId: session.user_id,
    role: session.role,
    email: session.email
  };
}

// Authentication middleware
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const sessionData = await verifyToken(c.env.DB, token);

  if (!sessionData) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Store session data in context
  c.set('session', sessionData);
  await next();
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const session = c.get('session') as SessionData;
    
    if (!session || !allowedRoles.includes(session.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const sessionData = await verifyToken(c.env.DB, token);
    
    if (sessionData) {
      c.set('session', sessionData);
    }
  }

  await next();
}

// Create session token
export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = dbHelper.generateToken(64);
  const expiresAt = dbHelper.expiresAt(30 * 24 * 60); // 30 days

  await dbHelper.execute(
    db,
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );

  return token;
}

// Delete session (logout)
export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await dbHelper.execute(db, 'DELETE FROM sessions WHERE token = ?', [token]);
}

// Clean expired sessions
export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  await dbHelper.execute(db, 'DELETE FROM sessions WHERE expires_at < datetime("now")');
}
