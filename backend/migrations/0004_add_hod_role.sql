-- Adds the Head of Department (HoD) role and its approval stage between
-- professor submission and admin final approval.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'professor', 'hod'));

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('pending', 'hod_approved', 'hod_rejected', 'approved', 'rejected'));

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hod_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hod_reviewed_at TIMESTAMP;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hod_rejection_reason TEXT;
