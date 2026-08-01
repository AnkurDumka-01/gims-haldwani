-- Adds PG-year leave categorization (CL, Academic Leave, Special/Maternity-Paternity Leave, Absent)
-- to match the GMC Haldwani leave format, and date_of_joining to compute PG training years.

ALTER TABLE pg_students
    ADD COLUMN IF NOT EXISTS date_of_joining DATE;

ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS cl_days INTEGER NOT NULL DEFAULT 0 CHECK (cl_days >= 0),
    ADD COLUMN IF NOT EXISTS academic_leave_days INTEGER NOT NULL DEFAULT 0 CHECK (academic_leave_days >= 0),
    ADD COLUMN IF NOT EXISTS special_leave_days INTEGER NOT NULL DEFAULT 0 CHECK (special_leave_days >= 0),
    ADD COLUMN IF NOT EXISTS absent_days INTEGER NOT NULL DEFAULT 0 CHECK (absent_days >= 0);

ALTER TABLE attendance_records
    DROP COLUMN IF EXISTS days_on_leave;
