-- Adds the fields needed to compute and print stipend/salary reports.

ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS monthly_stipend_rate NUMERIC(10, 2);
ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS service_end_date DATE;
