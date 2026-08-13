-- PHMS eligibility flag on a student. When phms = false, everything behaves exactly as
-- before (normal attendance + stipend flow). When phms = true, stipend_from_college decides
-- whether stipend calculation still applies (true) or is skipped entirely in favour of
-- attendance-only tracking (false) -- see utils/stipendCalculator.js. stipend_from_college
-- is only meaningful while phms = true; it's left NULL otherwise.
ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS phms BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pg_students ADD COLUMN IF NOT EXISTS stipend_from_college BOOLEAN;
