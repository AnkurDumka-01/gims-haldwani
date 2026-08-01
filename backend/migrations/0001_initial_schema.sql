-- Users: admins and professors. PG students are not login accounts.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'professor')),
    department VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PG students ("doctors"), each mapped to one supervising professor. Admin owns this data.
CREATE TABLE IF NOT EXISTS pg_students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    enrollment_number VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(255) NOT NULL,
    course VARCHAR(255),
    academic_year VARCHAR(20),
    professor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly attendance summary per student, submitted by the mapped professor.
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES pg_students(id) ON DELETE CASCADE,
    professor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    total_working_days INTEGER NOT NULL CHECK (total_working_days >= 0),
    days_present INTEGER NOT NULL CHECK (days_present >= 0),
    days_on_leave INTEGER NOT NULL DEFAULT 0 CHECK (days_on_leave >= 0),
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, month, year)
);

-- Audit trail for approve/reject/edit actions on attendance records.
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    meta JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_professor ON pg_students(professor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_professor ON attendance_records(professor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
