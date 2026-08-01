# GIMS Haldwani — PG Attendance & Salary Portal

Web portal for tracking medical PG students' ("doctors") monthly attendance for salary/stipend purposes.

- **Professor**: logs in with admin-issued credentials, submits monthly attendance for the PG students mapped to them — working days, days present, and leave broken down into Casual Leave (CL), Academic Leave, Special Leave (Maternity/Paternity), and Absent — tracks approval status, downloads their own approved records as PDF.
- **HoD (Head of Department)**: logs in with admin-issued credentials scoped to one department. Reviews all `pending` submissions from that department's professors, can edit fields, and approves (sends to admin) or rejects (back to the professor) each one.
- **Admin**: creates professor and HoD logins, creates PG student records (including date of joining), maps each student to a supervising professor, does the **final** review/edit/approve/reject on records the HoD has already approved, downloads approved attendance as PDF, and views each student's Annual Attendance & Leave Report and each department's Monthly Report.

Attendance lifecycle: professor submits (`pending`) → HoD approves (`hod_approved`) or rejects (`hod_rejected`, professor resubmits) → admin gives final approval (`approved`, salary-eligible) or rejects (`rejected`). Only `approved` records are ever exported as PDF.

v1 scope is attendance record-keeping and approval, not automatic salary calculation — the approved PDF is handed to accounts for pay processing. A native Android (Kotlin) app is planned as a second phase against the same REST API.

### Department Monthly Report

Matches the institution's actual letter format (attendance of PG students for stipend, sent by the department to the Principal & Dean): for a chosen department + month, lists every student with S.No., Name, Post (JR-01/02/03, auto-derived from PG training year), CL, Absent, Total Present Days, and Remarks, signed off with the department's HoD. Only `approved` (final) records are included. Available under **Monthly Report** for both admin (any department) and HoD (their own department).

### Leave rules & Annual Report

Following the GMC Haldwani leave format, each PG student's approved monthly attendance rolls up into a per-training-year (Year 1 / 2 / 3, computed from their date of joining) and Grand Total report, available from the student's "Annual Report" link (admin: Students page; professor: My Students page). It shows:

- Casual Leave (soft cap: 20/year), Academic Leave (soft cap: 5/year), Special Leave (soft cap: 180 total) — exceeding a cap surfaces a warning but never blocks submission or approval.
- Exam eligibility: a student needs ≥ 751 days present (≈80% of a 3-year program) across their Grand Total to be marked exam-eligible.
- A downloadable PDF of the same Year 1/2/3 + Grand Total table.

## Project structure

```
backend/    Node.js + Express + PostgreSQL REST API
frontend/   React (Vite + Tailwind) web portal
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your PostgreSQL credentials and a strong JWT_SECRET
```

Create the database (name matches `DB_NAME` in `.env`):

```bash
createdb gims_haldwani
```

Run the migration and seed the first admin account (uses `SEED_ADMIN_*` vars from `.env`):

```bash
npm run migrate
npm run seed:admin
```

Start the API:

```bash
npm run dev   # http://localhost:5000
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL should point at the backend, e.g. http://localhost:5000/api
npm run dev             # http://localhost:5173
```

## First-time flow

1. Log in as the seeded admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
2. Create a professor account under **Professors**, and an HoD account under **HoDs** with a matching department.
3. Add a PG student under **Students** (set their date of joining) with that same department, and assign them to the professor.
4. Log in as the professor, submit a month's attendance (present/CL/academic/special/absent) for that student — status starts `pending`.
5. Log in as the HoD, review the pending record under **Attendance Review**, edit if needed, then approve (→ `hod_approved`) or reject.
6. Back as admin, the record now appears under **Attendance** (default `hod_approved` filter); edit if needed, then give final approval (→ `approved`) or reject.
7. Download the approved record as PDF, open the student's **Annual Report**, or generate the department's **Monthly Report** (as admin or HoD) for the letter-format PDF.
