import { Router } from 'express';
import { patientController } from '../controllers/patientController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// All patient routes require authentication
router.use(authenticate);

router.post('/', (req, res) => patientController.createCase(req, res));
router.get('/', (req, res) => patientController.getCases(req, res));
router.get('/:id', (req, res) => patientController.getCaseById(req, res));
router.put('/:id', (req, res) => patientController.updateCase(req, res));

export default router;
