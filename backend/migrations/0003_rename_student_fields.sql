-- Aligns pg_students with the admin-entry form: Name, Father's Name, Roll Number,
-- Subject Name, Date of Admission, Batch, Date of Joining.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pg_students' AND column_name = 'enrollment_number') THEN
    ALTER TABLE pg_students RENAME COLUMN enrollment_number TO roll_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pg_students' AND column_name = 'department') THEN
    ALTER TABLE pg_students RENAME COLUMN department TO subject_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pg_students' AND column_name = 'academic_year') THEN
    ALTER TABLE pg_students RENAME COLUMN academic_year TO batch;
  END IF;
END $$;

ALTER TABLE pg_students DROP COLUMN IF EXISTS course;
ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS date_of_admission DATE;
