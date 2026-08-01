const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleAuth');
const professor = require('../controllers/professorController');

router.use(authMiddleware, requireRole('professor'));

router.get('/students', professor.myStudents);
router.post('/attendance', professor.submitAttendance);
router.get('/attendance', professor.myAttendance);
router.get('/attendance/:id/pdf', professor.downloadAttendancePdf);
router.get('/students/:id/attendance-summary', professor.getAttendanceSummary);
router.get('/students/:id/attendance-summary/pdf', professor.downloadAttendanceSummaryPdf);

module.exports = router;
