-- ============================================================
-- ROWSC Student Management Portal
-- Migration: 001_create_students.sql
-- Run once against your PostgreSQL database:
--   psql -U postgres -d rowsc_portal -f migrations/001_create_students.sql
-- ============================================================

-- Create database (run separately as superuser if needed)
-- CREATE DATABASE rowsc_portal;

CREATE TABLE IF NOT EXISTS students (
  id                          SERIAL PRIMARY KEY,

  -- ── Core Identity ──────────────────────────────────────────
  first_name                  VARCHAR(100),
  last_name                   VARCHAR(100),
  middle_name                 VARCHAR(100),
  email                       VARCHAR(255) UNIQUE,
  cell_phone                  VARCHAR(30),
  home_phone                  VARCHAR(30),
  date_of_birth               DATE,
  gender                      VARCHAR(50),
  ssn_last4                   CHAR(4),

  -- ── Address ────────────────────────────────────────────────
  address_street              VARCHAR(255),
  address_city                VARCHAR(100),
  address_state               VARCHAR(50),
  address_zip                 VARCHAR(20),

  -- ── Program Enrollment ─────────────────────────────────────
  program                     VARCHAR(150) NOT NULL,
  program_category            VARCHAR(100),
  enrollment_date             DATE DEFAULT CURRENT_DATE,
  start_date                  DATE,
  expected_graduation_date    DATE,
  graduation_date             DATE,
  status                      VARCHAR(50) DEFAULT 'Active',

  -- ── Emergency Contact ──────────────────────────────────────
  emergency_contact_name      VARCHAR(200),
  emergency_contact_phone     VARCHAR(30),
  emergency_contact_relation  VARCHAR(100),

  -- ── Education Background ───────────────────────────────────
  highest_education           VARCHAR(100),
  high_school_name            VARCHAR(200),
  high_school_grad_year       INT,
  ged_certificate             BOOLEAN DEFAULT FALSE,

  -- ── Employment ─────────────────────────────────────────────
  currently_employed          BOOLEAN DEFAULT FALSE,
  employer_name               VARCHAR(200),
  employer_phone              VARCHAR(30),

  -- ── Financial Aid / Funding ────────────────────────────────
  funding_source              VARCHAR(150),
  financial_aid_status        VARCHAR(100),
  scholarship                 BOOLEAN DEFAULT FALSE,
  scholarship_name            VARCHAR(200),

  -- ── Jotform Metadata ───────────────────────────────────────
  jotform_submission_id       VARCHAR(100) UNIQUE,
  jotform_submission_date     TIMESTAMPTZ,
  intake_source               VARCHAR(50) DEFAULT 'jotform',

  -- ── Certifications & Exams ─────────────────────────────────
  state_exam_date             DATE,
  state_exam_passed           BOOLEAN,
  certification_name          VARCHAR(200),
  certification_expiry        DATE,
  license_number              VARCHAR(100),

  -- ── Attendance & Academic Progress ─────────────────────────
  attendance_percentage       NUMERIC(5,2),
  gpa                         NUMERIC(4,2),
  units_completed             INT DEFAULT 0,
  units_required              INT,

  -- ── Admin Notes ────────────────────────────────────────────
  admin_notes                 TEXT,
  intake_notes                TEXT,
  counselor_name              VARCHAR(150),
  referring_agency            VARCHAR(200),

  -- ── Documents ──────────────────────────────────────────────
  drive_link                  TEXT,
  photo_url                   TEXT,

  -- ── WIOA / Workforce Fields ────────────────────────────────
  wioa_enrolled               BOOLEAN DEFAULT FALSE,
  wioa_participant_id         VARCHAR(100),
  wioa_case_manager           VARCHAR(150),
  veteran_status              BOOLEAN DEFAULT FALSE,
  disability_status           BOOLEAN DEFAULT FALSE,
  homeless_status             BOOLEAN DEFAULT FALSE,
  ex_offender_status          BOOLEAN DEFAULT FALSE,
  snap_recipient              BOOLEAN DEFAULT FALSE,
  tanf_recipient              BOOLEAN DEFAULT FALSE,

  -- ── Health / Compliance ────────────────────────────────────
  background_check_date       DATE,
  background_check_passed     BOOLEAN,
  drug_test_date              DATE,
  drug_test_passed            BOOLEAN,
  immunization_complete       BOOLEAN DEFAULT FALSE,
  hipaa_signed                BOOLEAN DEFAULT FALSE,
  enrollment_agreement_signed BOOLEAN DEFAULT FALSE,

  -- ── Raw Jotform Payload (for unmapped fields) ───────────────
  raw_jotform_payload         JSONB,

  -- ── System Timestamps ──────────────────────────────────────
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_last_name    ON students(last_name);
CREATE INDEX IF NOT EXISTS idx_students_program      ON students(program);
CREATE INDEX IF NOT EXISTS idx_students_status       ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_email        ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_jotform_id   ON students(jotform_submission_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at   ON students(created_at DESC);

-- ── Admin Users Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'admin',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-update updated_at trigger ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed default admin (change password immediately!) ──────────
-- Password: Admin@ROWSC2024 (bcrypt hash — regenerate for production)
INSERT INTO admin_users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@rowsc.edu',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlpF8XF4mCqEfJ4v9u1gGa8ey',
  'superadmin'
) ON CONFLICT (username) DO NOTHING;
