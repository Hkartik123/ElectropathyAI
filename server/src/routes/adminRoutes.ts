import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

const router = Router();

// Public Admin Login
router.post('/login', (req, res) => adminController.login(req, res));

// Protected Admin Routes
router.use(authenticate, requireAdmin);

router.get('/overview', (req, res) => adminController.getOverview(req, res));
router.get('/users', (req, res) => adminController.getUsers(req, res));
router.get('/users/:id', (req, res) => adminController.getUserDetails(req, res));
router.patch('/users/:id/status', (req, res) => adminController.updateUserStatus(req, res));
router.get('/conversations', (req, res) => adminController.getConversations(req, res));
router.get('/conversations/:id', (req, res) => adminController.getConversationDetails(req, res));
router.get('/patient-cases', (req, res) => adminController.getPatientCases(req, res));
router.get('/patient-cases/:id', (req, res) => adminController.getPatientCaseDetails(req, res));
router.get('/audit-logs', (req, res) => adminController.getAuditLogs(req, res));

// Admin AI Chatbot & Clinical Decision Support Endpoints
router.post('/chat', (req, res) => adminController.chat(req, res));
router.get('/patients/search', (req, res) => adminController.searchPatients(req, res));
router.get('/patients/:id/summary', (req, res) => adminController.getPatientFullSummary(req, res));
router.get('/knowledge', (req, res) => adminController.getKnowledge(req, res));

export default router;
