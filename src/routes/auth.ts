// ============================================
// Authentication Routes
// ============================================

import { Hono } from 'hono';
import type { Env, User } from '../types';
import { dbHelper } from '../db';
import { createSession, deleteSession, authMiddleware } from '../auth';

const auth = new Hono<{ Bindings: Env }>();

// POST /auth/login - Email OTP login (send OTP)
auth.post('/login', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Valid email is required' }, 400);
    }

    // Generate OTP
    const code = dbHelper.generateOTP();
    const expiresAt = dbHelper.expiresAt(15); // 15 minutes

    console.log(`[AUTH] Generating OTP for ${email}: ${code}, expires at: ${expiresAt}`);

    // Save OTP to database
    try {
      const result = await dbHelper.execute(
        c.env.DB,
        'INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)',
        [email, code, expiresAt]
      );
      console.log(`[AUTH] OTP saved to database, ID: ${result.meta.last_row_id}`);
    } catch (dbError) {
      console.error('[AUTH] Failed to save OTP to database:', dbError);
      throw dbError;
    }

    // TODO: Send email with OTP using SendGrid
    // For now, return OTP in response (development only)

    return c.json({
      message: 'OTP sent to email',
      dev_otp: code, // Remove in production
      email,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/verify - Verify OTP and create session
auth.post('/verify', async (c) => {
  try {
    const { email, code, name, role } = await c.req.json();

    console.log(`[AUTH] Verifying OTP for ${email}, code: ${code}`);

    if (!email || !code) {
      return c.json({ error: 'Email and code are required' }, 400);
    }

    // Debug: Check all OTP codes for this email
    const allOtps = await dbHelper.query<any>(
      c.env.DB,
      'SELECT id, email, code, expires_at, used, created_at FROM otp_codes WHERE email = ? ORDER BY created_at DESC',
      [email]
    );
    console.log(`[AUTH] All OTP codes for ${email}:`, JSON.stringify(allOtps));

    // Verify OTP
    const otpRecord = await dbHelper.queryOne<any>(
      c.env.DB,
      'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    console.log(`[AUTH] OTP Record found:`, otpRecord ? 'YES' : 'NO');

    if (!otpRecord) {
      // Check if OTP exists but is expired or used
      const anyOtp = await dbHelper.queryOne<any>(
        c.env.DB,
        'SELECT * FROM otp_codes WHERE email = ? AND code = ? ORDER BY created_at DESC LIMIT 1',
        [email, code]
      );

      if (anyOtp) {
        if (anyOtp.used === 1) {
          return c.json({ error: 'OTP already used. Please request a new one.' }, 400);
        }
        if (anyOtp.expires_at <= new Date().toISOString()) {
          return c.json({ error: 'OTP expired. Please request a new one.' }, 400);
        }
      }

      return c.json({ error: 'Invalid OTP code' }, 400);
    }

    // Mark OTP as used
    await dbHelper.execute(
      c.env.DB,
      'UPDATE otp_codes SET used = 1 WHERE id = ?',
      [otpRecord.id]
    );

    // Check if user exists
    let user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // Create new user
      if (!name || !role) {
        return c.json({ error: 'Name and role are required for new users' }, 400);
      }

      const result = await dbHelper.execute(
        c.env.DB,
        'INSERT INTO users (email, name, role, email_verified) VALUES (?, ?, ?, 1)',
        [email, name, role]
      );

      user = await dbHelper.queryOne<User>(
        c.env.DB,
        'SELECT * FROM users WHERE id = ?',
        [result.meta.last_row_id]
      );
    } else {
      // Update email_verified
      await dbHelper.execute(
        c.env.DB,
        'UPDATE users SET email_verified = 1 WHERE id = ?',
        [user.id]
      );
    }

    // Create session
    const token = await createSession(c.env.DB, user!.id);

    return c.json({
      token,
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        avatar_url: user!.avatar_url
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader!.substring(7);

    await deleteSession(c.env.DB, token);

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /auth/me - Get current user
auth.get('/me', authMiddleware, async (c) => {
  try {
    const session = c.get('session');

    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE id = ?',
      [session.userId]
    );

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      email_verified: user.email_verified
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// TODO: Google OAuth implementation
// auth.get('/callback/google', async (c) => { ... });

export default auth;
