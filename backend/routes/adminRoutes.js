const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleAuth');
const admin = require('../controllers/adminController');
const attendance = require('../controllers/attendanceAdminController');
const salary = require('../controllers/salaryController');
const studentImport = require('../controllers/studentImportController');
const attendanceThreshold = require('../controllers/attendanceThresholdController');

// In-memory (never written to disk) -- rows go straight to Postgres, and a 5MB cap is
// generous for a student roster spreadsheet while ruling out a stray huge-file upload.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware, requireRole('admin'));

// Professors
router.post('/professors', admin.createProfessor);
router.get('/professors', admin.listProfessors);
router.patch('/professors/:id/status', admin.updateProfessorStatus);
router.put('/professors/:id', admin.updateProfessor);

// Heads of Department
router.post('/hods', admin.createHod);
router.get('/hods', admin.listHods);
router.patch('/hods/:id/status', admin.updateHodStatus);
router.put('/hods/:id', admin.updateHod);

// PG Students
router.post('/students', admin.createStudent);
router.get('/students', admin.listStudents);
router.put('/students/:id', admin.updateStudent);
router.delete('/students/:id', admin.deleteStudent);
router.post('/students/:id/assign-professor', admin.assignProfessor);
router.get('/students/import-template', studentImport.downloadTemplate);
router.post('/students/import', upload.single('file'), studentImport.importStudents);
router.get('/students/:id/attendance-summary', attendance.getAttendanceSummary);
router.get('/students/:id/attendance-summary/pdf', attendance.downloadAttendanceSummaryPdf);

// Attendance review
router.get('/attendance', attendance.listAttendance);
router.get('/attendance/:id', attendance.getAttendance);
router.put('/attendance/:id', attendance.updateAttendance);
router.post('/attendance/:id/approve', attendance.approveAttendance);
router.post('/attendance/:id/reject', attendance.rejectAttendance);
router.get('/attendance/:id/pdf', attendance.downloadAttendancePdf);

// Department monthly report
router.get('/monthly-report', attendance.getMonthlyReport);
router.get('/monthly-report/pdf', attendance.downloadMonthlyReportPdf);

// Stipend / salary reports
router.get('/salary/individual-report', salary.getIndividualReport);
router.get('/salary/individual-report/pdf', salary.downloadIndividualReportPdf);
router.get('/salary/individual-report/certificate', salary.downloadIndividualCertificatePdf);

// Attendance threshold report (dashboard)
router.get('/reports/attendance-threshold', attendanceThreshold.getAttendanceThresholdReport);
router.get('/reports/attendance-threshold/pdf', attendanceThreshold.downloadAttendanceThresholdReportPdf);
router.get('/salary/batch-report', salary.getBatchReport);
router.get('/salary/batch-report/pdf', salary.downloadBatchReportPdf);

module.exports = router;
