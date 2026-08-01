const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleAuth');
const hod = require('../controllers/hodController');

router.use(authMiddleware, requireRole('hod'));

router.get('/attendance', hod.listAttendance);
router.put('/attendance/:id', hod.updateAttendance);
router.post('/attendance/:id/approve', hod.approveAttendance);
router.post('/attendance/:id/reject', hod.rejectAttendance);

router.get('/monthly-report', hod.getMonthlyReport);
router.get('/monthly-report/pdf', hod.downloadMonthlyReportPdf);

module.exports = router;
