import { Router } from 'express';
import { conversationController } from '../controllers/conversationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// All conversation routes require user authentication
router.use(authenticate);

router.get('/', (req, res) => conversationController.list(req, res));
router.post('/', (req, res) => conversationController.create(req, res));
router.post('/chat-init', (req, res) => conversationController.chatInit(req, res));
router.get('/:id', (req, res) => conversationController.getOne(req, res));
router.patch('/:id', (req, res) => conversationController.update(req, res));
router.delete('/:id', (req, res) => conversationController.remove(req, res));
router.post('/:id/messages', (req, res) => conversationController.appendMessage(req, res));
router.post('/:id/chat', (req, res) => conversationController.chat(req, res));

export default router;
