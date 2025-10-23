-- Migration: Add password authentication support
-- Date: 2024-10-23

-- Add password-related columns to users table
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME;

-- Create index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comments for future reference
-- password_hash: Bcrypt hashed password (nullable, users can use OTP-only authentication)
-- password_reset_token: One-time token for password reset flow
-- password_reset_expires: Expiration datetime for reset token (typically 1 hour)
