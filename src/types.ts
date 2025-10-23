// ============================================
// AIMatch Campus - Type Definitions
// ============================================

export type Env = {
  DB: D1Database;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SENDGRID_API_KEY: string;
  JWT_SECRET: string;
  APP_URL: string;
};

export type UserRole = 'admin' | 'org' | 'instructor' | 'learner';

export interface User {
  id: number;
  role: UserRole;
  email: string;
  name: string;
  avatar_url: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  owner_user_id: number;
  name: string;
  tax_id: string | null;
  invoice_number: string | null;
  billing_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Instructor {
  id: number;
  user_id: number;
  headline: string | null;
  bio: string | null;
  skills: string[]; // JSON
  industries: string[]; // JSON
  tools: string[]; // JSON
  rate_type: 'per_session' | 'per_hour' | 'per_day' | null;
  rate_min: number | null;
  rate_max: number | null;
  availability_json: any; // JSON
  verified: number;
  verification_video_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  org_id: number;
  title: string;
  description: string;
  theme_tags: string[]; // JSON
  tool_tags: string[]; // JSON
  industry_tags: string[]; // JSON
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  format: 'online' | 'offline' | 'hybrid';
  start_at: string;
  end_at: string;
  price: number;
  capacity: number;
  recording: number;
  status: 'draft' | 'published' | 'closed' | 'cancelled';
  meeting_url: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: number;
  org_id: number;
  title: string;
  description: string;
  deliverables: string[]; // JSON
  date_range_start: string | null;
  date_range_end: string | null;
  onsite: number;
  budget_min: number | null;
  budget_max: number | null;
  theme_tags: string[]; // JSON
  tool_tags: string[]; // JSON
  industry_tags: string[]; // JSON
  status: 'open' | 'closed' | 'filled';
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: number;
  job_id: number;
  instructor_id: number;
  cover_letter: string | null;
  status: 'applied' | 'shortlist' | 'offered' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  subject_type: 'event' | 'job';
  subject_id: number;
  org_id: number;
  instructor_id: number | null;
  amount: number;
  escrow_status: 'held' | 'released' | 'refunded';
  contract_url: string | null;
  start_at: string | null;
  end_at: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  event_id: number;
  learner_user_id: number;
  price_paid: number;
  status: 'reserved' | 'paid' | 'cancelled' | 'refunded';
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  subject_type: 'event' | 'booking' | 'instructor';
  subject_id: number;
  reviewer_user_id: number;
  phase: 'immediate' | 'after30d';
  rating: number;
  metrics_json: any; // JSON
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  kind: 'theme' | 'tool' | 'industry' | 'outcome';
  name: string;
  slug: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
}

export interface SessionData {
  userId: number;
  role: UserRole;
  email: string;
}
