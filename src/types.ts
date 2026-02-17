export type Contact = {
  id: string;
  owner_id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null; // shown as "Job Title"
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  status: string; // kept for DB compatibility; no longer shown in UI
  created_at: string;
};

export type ContactMeeting = {
  id: string;
  owner_id: string;
  contact_id: string;
  meeting_date: string; // YYYY-MM-DD
  title: string | null;
  notes: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  my_linkedin_url: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  resume_text: string | null;
};

export type Application = {
  id: string;
  owner_id: string;
  company: string;
  link: string | null;
  date_applied: string | null; // YYYY-MM-DD
  status: string;
  contact_id: string | null;
  created_at: string;
};

export type Page =
  | "contacts"
  | "contact_details"
  | "applications"
  | "settings"
  | "onboarding"
  | "profile"
  | "network_watchlist"
  | "outreach_emails";

export type WatchlistTarget = {
  id: string;
  owner_id: string;
  person_name: string;
  company: string;
  role: string | null;
  status: string; // "not_contacted" | "contacted" | "scheduled" | "completed" | "follow_up_sent"
  next_action_date: string | null; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
};

export type ScheduledOutreach = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  channel: string; // "sms" | "linkedin" | "email"
  subject: string | null;
  message: string;
  scheduled_at: string; // ISO 8601 timestamptz
  status: string; // "scheduled" | "sent" | "skipped"
  created_at: string;
};

export type FieldMap = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  company?: string;
  title?: string;
  status?: string;
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};
