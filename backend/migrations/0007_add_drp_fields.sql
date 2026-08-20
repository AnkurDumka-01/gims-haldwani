-- DRP (District Residency Programme) posting marker on a monthly attendance record.
--
-- When is_drp is true, the student was on DRP for [drp_from_date, drp_to_date] during
-- (or overlapping) this month. The normal present/leave day fields are still entered and
-- used exactly as before (including toward the JR tenure calculation in
-- utils/attendanceSummary.js) -- DRP does not change how this record's own numbers are
-- read. It only marks that those numbers are provisional for this record: every report
-- touching a DRP-flagged record must carry the disclaimer "subject to verification of
-- working days and absent from DRP completion certificate issued by competent authority",
-- since actual day-level accounting for a DRP posting is confirmed later against that
-- certificate, not tracked live in this system.
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_drp BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS drp_from_date DATE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS drp_to_date DATE;
