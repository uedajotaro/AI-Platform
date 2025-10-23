-- ============================================
-- AIMatch Campus - Initial Database Schema
-- ============================================

-- Users table (all roles)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('admin', 'org', 'instructor', 'learner')),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  oauth_provider TEXT,
  oauth_id TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Organizations (主催者)
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  tax_id TEXT,
  invoice_number TEXT,
  billing_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Instructors (講師)
CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  headline TEXT,
  bio TEXT,
  skills TEXT, -- JSON array
  industries TEXT, -- JSON array
  tools TEXT, -- JSON array
  rate_type TEXT CHECK(rate_type IN ('per_session', 'per_hour', 'per_day')),
  rate_min INTEGER,
  rate_max INTEGER,
  availability_json TEXT, -- JSON
  verified INTEGER DEFAULT 0,
  verification_video_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'approved', 'rejected', 'revision_needed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Events (研修/ウェビナー)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  theme_tags TEXT, -- JSON array
  tool_tags TEXT, -- JSON array
  industry_tags TEXT, -- JSON array
  difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  format TEXT CHECK(format IN ('online', 'offline', 'hybrid')),
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 100,
  recording INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed', 'cancelled')),
  meeting_url TEXT,
  recording_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Jobs (講師募集)
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deliverables TEXT, -- JSON array
  date_range_start DATETIME,
  date_range_end DATETIME,
  onsite INTEGER DEFAULT 0,
  budget_min INTEGER,
  budget_max INTEGER,
  theme_tags TEXT, -- JSON array
  tool_tags TEXT, -- JSON array
  industry_tags TEXT, -- JSON array
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'filled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Applications (応募)
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  instructor_id INTEGER NOT NULL,
  cover_letter TEXT,
  status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'shortlist', 'offered', 'accepted', 'rejected', 'withdrawn')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
  UNIQUE(job_id, instructor_id)
);

-- Bookings (成約/エスクロー)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_type TEXT CHECK(subject_type IN ('event', 'job')),
  subject_id INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  instructor_id INTEGER,
  amount INTEGER NOT NULL,
  escrow_status TEXT DEFAULT 'held' CHECK(escrow_status IN ('held', 'released', 'refunded')),
  contract_url TEXT,
  start_at DATETIME,
  end_at DATETIME,
  stripe_payment_intent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL
);

-- Tickets (チケット/参加券)
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  learner_user_id INTEGER NOT NULL,
  price_paid INTEGER NOT NULL,
  status TEXT DEFAULT 'reserved' CHECK(status IN ('reserved', 'paid', 'cancelled', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (learner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payouts (講師への支払い)
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL,
  booking_id INTEGER,
  amount INTEGER NOT NULL,
  tax_withholding INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Invoices (請求書)
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  booking_id INTEGER,
  number TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  subtotal INTEGER NOT NULL,
  fee INTEGER NOT NULL,
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'issued' CHECK(status IN ('issued', 'paid', 'void')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Materials (教材/資料)
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT CHECK(owner_type IN ('event', 'instructor', 'job')),
  owner_id INTEGER NOT NULL,
  kind TEXT CHECK(kind IN ('slide', 'video', 'doc', 'sample')),
  url TEXT NOT NULL,
  title TEXT,
  visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'registered')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviews (レビュー)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_type TEXT CHECK(subject_type IN ('event', 'booking', 'instructor')),
  subject_id INTEGER NOT NULL,
  reviewer_user_id INTEGER NOT NULL,
  phase TEXT CHECK(phase IN ('immediate', 'after30d')),
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  metrics_json TEXT, -- JSON for 30-day metrics
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tags (タグマスタ)
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT CHECK(kind IN ('theme', 'tool', 'industry', 'outcome')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tag mappings (タグの紐付け)
CREATE TABLE IF NOT EXISTS tag_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id INTEGER NOT NULL,
  subject_type TEXT CHECK(subject_type IN ('event', 'job', 'instructor')),
  subject_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(tag_id, subject_type, subject_id)
);

-- Reports (通報)
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_user_id INTEGER NOT NULL,
  subject_type TEXT CHECK(subject_type IN ('user', 'event', 'job', 'review')),
  subject_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OTP codes for email authentication
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (JWT alternative for stateful auth)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications (通知)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_instructors_user_id ON instructors(user_id);
CREATE INDEX IF NOT EXISTS idx_instructors_verified ON instructors(verified);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_instructor_id ON applications(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_org_id ON bookings(org_id);
CREATE INDEX IF NOT EXISTS idx_bookings_instructor_id ON bookings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_learner_user_id ON tickets(learner_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_subject ON reviews(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_tag_map_subject ON tag_map(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
