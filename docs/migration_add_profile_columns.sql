-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add missing profile columns
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- All statements use ADD COLUMN IF NOT EXISTS — safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists phone                          text,
  add column if not exists career_interests               text,
  add column if not exists google_calendar_token          text,
  add column if not exists google_calendar_refresh_token  text,
  add column if not exists google_calendar_token_expiry   text;
