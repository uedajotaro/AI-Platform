// ============================================
// Authentication Routes
// ============================================

import { Hono } from 'hono';
import type { Env, User } from '../types';
import { dbHelper, passwordHelper } from '../db';
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

    // Check if user exists BEFORE marking OTP as used
    let user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    console.log(`[AUTH] User exists:`, user ? 'YES' : 'NO');

    if (!user) {
      // New user - require name and role
      if (!name || !role) {
        console.log(`[AUTH] New user but missing name/role. Name: ${name}, Role: ${role}`);
        // Don't mark OTP as used yet - let user retry with name and role
        return c.json({ 
          error: 'Name and role are required for new users',
          is_new_user: true 
        }, 400);
      }

      console.log(`[AUTH] Creating new user: ${name}, role: ${role}`);

      // Mark OTP as used BEFORE creating user
      await dbHelper.execute(
        c.env.DB,
        'UPDATE otp_codes SET used = 1 WHERE id = ?',
        [otpRecord.id]
      );

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

      console.log(`[AUTH] New user created with ID: ${user!.id}`);
    } else {
      // Existing user - mark OTP as used and update email_verified
      console.log(`[AUTH] Existing user found with ID: ${user.id}`);
      
      await dbHelper.execute(
        c.env.DB,
        'UPDATE otp_codes SET used = 1 WHERE id = ?',
        [otpRecord.id]
      );

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

// POST /auth/register - Register with password
auth.post('/register', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Valid email is required' }, 400);
    }

    if (!name || !role) {
      return c.json({ error: 'Name and role are required' }, 400);
    }

    // Validate password strength
    const validation = passwordHelper.validatePassword(password);
    if (!validation.valid) {
      return c.json({ error: validation.message }, 400);
    }

    // Check if user already exists
    const existingUser = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Hash password
    const passwordHash = await passwordHelper.hash(password);

    // Create user
    const result = await dbHelper.execute(
      c.env.DB,
      'INSERT INTO users (email, name, role, password_hash, email_verified) VALUES (?, ?, ?, ?, 0)',
      [email, name, role, passwordHash]
    );

    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE id = ?',
      [result.meta.last_row_id]
    );

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
    console.error('Register error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/login/password - Login with password
auth.post('/login/password', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Find user
    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Check if user has password set
    if (!user.password_hash) {
      return c.json({ error: 'Password not set. Please use OTP login or reset your password.' }, 400);
    }

    // Verify password
    const isValid = await passwordHelper.verify(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Create session
    const token = await createSession(c.env.DB, user.id);

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Password login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/password/reset/request - Request password reset
auth.post('/password/reset/request', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Valid email is required' }, 400);
    }

    // Check if user exists
    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    // Don't reveal if user exists for security
    // Always return success message
    if (!user) {
      return c.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = passwordHelper.generateResetToken();
    const expiresAt = dbHelper.expiresAt(60); // 1 hour

    // Save reset token
    await dbHelper.execute(
      c.env.DB,
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, expiresAt, user.id]
    );

    // TODO: Send email with reset link using SendGrid
    // For now, return token in response (development only)
    
    return c.json({
      message: 'If the email exists, a reset link has been sent',
      dev_reset_token: resetToken, // Remove in production
      dev_reset_url: `${c.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/password/reset/verify - Verify reset token
auth.post('/password/reset/verify', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ error: 'Reset token is required' }, 400);
    }

    // Find user with valid reset token
    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > datetime("now")',
      [token]
    );

    if (!user) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }

    return c.json({ 
      valid: true,
      email: user.email 
    });
  } catch (error) {
    console.error('Password reset verify error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/password/reset/confirm - Reset password with token
auth.post('/password/reset/confirm', async (c) => {
  try {
    const { token, newPassword } = await c.req.json();

    if (!token || !newPassword) {
      return c.json({ error: 'Reset token and new password are required' }, 400);
    }

    // Validate new password strength
    const validation = passwordHelper.validatePassword(newPassword);
    if (!validation.valid) {
      return c.json({ error: validation.message }, 400);
    }

    // Find user with valid reset token
    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > datetime("now")',
      [token]
    );

    if (!user) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }

    // Hash new password
    const passwordHash = await passwordHelper.hash(newPassword);

    // Update password and clear reset token
    await dbHelper.execute(
      c.env.DB,
      'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /auth/password/change - Change password (authenticated)
auth.post('/password/change', authMiddleware, async (c) => {
  try {
    const session = c.get('session');
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current password and new password are required' }, 400);
    }

    // Validate new password strength
    const validation = passwordHelper.validatePassword(newPassword);
    if (!validation.valid) {
      return c.json({ error: validation.message }, 400);
    }

    // Get user
    const user = await dbHelper.queryOne<User>(
      c.env.DB,
      'SELECT * FROM users WHERE id = ?',
      [session.userId]
    );

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // If user has password, verify current password
    if (user.password_hash) {
      const isValid = await passwordHelper.verify(currentPassword, user.password_hash);
      if (!isValid) {
        return c.json({ error: 'Current password is incorrect' }, 401);
      }
    }

    // Hash new password
    const passwordHash = await passwordHelper.hash(newPassword);

    // Update password
    await dbHelper.execute(
      c.env.DB,
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, session.userId]
    );

    return c.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// TODO: Google OAuth implementation
// auth.get('/callback/google', async (c) => { ... });

export default auth;
