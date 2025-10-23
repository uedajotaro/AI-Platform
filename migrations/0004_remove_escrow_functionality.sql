-- Migration: Remove escrow functionality for job matching
-- Date: 2025-10-23
-- Reason: Platform only connects instructors and organizations
--         Payment and contracts are handled directly between parties

-- Note: bookings table remains in schema but is not used for job matching
-- The table is only used for event bookings (if needed)
-- Job matching success is tracked via applications.status = 'accepted'

-- Add comment columns to clarify booking usage
-- SQLite doesn't support COMMENT, so we'll document here:
-- 
-- For job matching (lecturer ⇄ company):
-- - Platform provides matching only
-- - No escrow or payment processing
-- - Success tracked in applications.status = 'accepted'
-- - Parties handle payment directly
--
-- For events/webinars (platform ticket sales):
-- - Full payment processing via Stripe
-- - bookings table could be used if needed
-- - Currently using tickets table for event registrations

-- No actual schema changes needed - just documentation
