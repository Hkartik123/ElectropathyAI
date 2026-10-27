import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { tokenService } from '../services/tokenService.js';
import { userService } from '../services/userService.js';
import { auditService } from '../services/auditService.js';
import { conversationService } from '../services/conversationService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { adminChatService } from '../services/adminChatService.js';
import { patientContextService } from '../services/patientContextService.js';
import { knowledgeService } from '../services/knowledgeService.js';

export class AdminController {
  /**
   * Dedicated Admin Login
   * POST /api/admin/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }

      const adminUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          role: 'admin'
        }
      });

      if (!adminUser || !adminUser.passwordHash) {
        res.status(401).json({ success: false, message: 'Invalid administrative credentials' });
        return;
      }

      if (!adminUser.isActive) {
        res.status(403).json({ success: false, message: 'Administrator account has been deactivated' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ success: false, message: 'Invalid administrative credentials' });
        return;
      }

      const tokens = await tokenService.generateTokens(adminUser as any);

      // Audit log
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      await auditService.log(adminUser.id, 'ADMIN_LOGIN', adminUser.id, { email }, ip);

      res.status(200).json({
        success: true,
        message: 'Administrator authentication successful',
        tokens,
        admin: {
          id: adminUser.id,
          fullName: adminUser.fullName,
          email: adminUser.email,
          role: adminUser.role,
        }
      });
    } catch (error: any) {
      console.error('[ADMIN login ERROR]', error);
      res.status(500).json({ success: false, message: 'Internal error during admin login' });
    }
  }

  /**
   * System Overview Analytics
   * GET /api/admin/overview
   */
  async getOverview(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers,
        newUsersLast7Days,
        totalConversations,
        totalMessages,
        totalCases,
        casesByStatus,
        knowledgeDocs,
        knowledgeChunks,
        recentActivities
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.conversation.count({ where: { isDeleted: false } }),
        prisma.message.count(),
        prisma.patientCase.count(),
        prisma.patientCase.groupBy({
          by: ['status'],
          _count: { id: true }
        }),
        prisma.knowledgeDocument.count(),
        prisma.knowledgeChunk.count(),
        prisma.auditLog.findMany({
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: { id: true, fullName: true, email: true, mobileNumber: true }
            }
          }
        })
      ]);

      res.status(200).json({
        success: true,
        overview: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            newLast7Days: newUsersLast7Days
          },
          conversations: {
            totalConversations,
            totalMessages
          },
          patientCases: {
            total: totalCases,
            byStatus: casesByStatus.reduce((acc: Record<string, number>, curr: { status: string; _count: { id: number } }) => {
              acc[curr.status] = curr._count.id;
              return acc;
            }, {} as Record<string, number>)
          },
          knowledgeBase: {
            totalDocuments: knowledgeDocs,
            totalChunks: knowledgeChunks
          },
          recentActivities: recentActivities.map((log: any) => ({
            id: log.id,
            adminId: log.adminId,
            action: log.action,
            targetId: log.targetId,
            details: log.details,
            ipAddress: log.ipAddress,
            createdAt: log.createdAt.toISOString(),
            admin: log.admin
          }))
        }
      });
    } catch (error: any) {
      console.error('[ADMIN getOverview ERROR]', error);
      res.status(500).json({ success: false, message: 'Failed to load system overview' });
    }
  }

  /**
   * User Management: List Users
   * GET /api/admin/users
   */
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || '';
      const role = (req.query.role as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await userService.getUsersForAdmin({ search, status, role, page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve users' });
    }
  }

  /**
   * User Details: Profile + Conversations + Patient Cases
   * GET /api/admin/users/:id
   */
  async getUserDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.params.id as string;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          mobileNumber: true,
          fullName: true,
          email: true,
          userType: true,
          role: true,
          preferredLang: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          conversations: {
            where: { isDeleted: false },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: { id: true, title: true, createdAt: true, updatedAt: true }
          },
          patientCases: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, patientName: true, age: true, gender: true, status: true, createdAt: true }
          }
        }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Audit log view
      if (req.user) {
        await auditService.log(req.user.id, 'VIEW_USER_PROFILE', user.id);
      }

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch user details' });
    }
  }

  /**
   * Update User Status (Activate/Deactivate)
   * PATCH /api/admin/users/:id/status
   */
  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.params.id as string;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({ success: false, message: 'isActive boolean is required' });
        return;
      }

      // Prevent self-deactivation by admin
      if (req.user?.id === userId && !isActive) {
        res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own account' });
        return;
      }

      const updated = await userService.setUserActiveStatus(userId, isActive);

      // If deactivated, revoke all their active refresh tokens immediately
      if (!isActive) {
        await tokenService.revokeUserTokens(userId);
      }

      if (req.user) {
        await auditService.log(req.user.id, 'UPDATE_USER_STATUS', userId, { isActive });
      }

      res.status(200).json({ success: true, message: `User account ${isActive ? 'activated' : 'deactivated'}`, user: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
  }

  /**
   * Conversation Management: List all conversations across users
   * GET /api/admin/conversations
   */
  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const search = (req.query.search as string) || '';
      const userId = (req.query.userId as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await conversationService.listAllForAdmin({ search, userId, page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve conversations' });
    }
  }

  /**
   * Conversation Details: Inspect messages
   * GET /api/admin/conversations/:id
   */
  async getConversationDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const convId = req.params.id as string;
      const conv = await conversationService.getAdminConversation(convId);

      if (!conv) {
        res.status(404).json({ success: false, message: 'Conversation not found' });
        return;
      }

      if (req.user) {
        await auditService.log(req.user.id, 'VIEW_CONVERSATION', convId, { userId: conv.userId });
      }

      res.status(200).json({ success: true, conversation: conv });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to inspect conversation' });
    }
  }

  /**
   * Patient Cases: List for admin
   * GET /api/admin/patient-cases
   */
  async getPatientCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = (req.query.status as string) || '';
      const search = (req.query.search as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { patientName: { contains: search, mode: 'insensitive' } },
          { contactNumber: { contains: search } },
          { city: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, cases] = await Promise.all([
        prisma.patientCase.count({ where }),
        prisma.patientCase.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            practitioner: {
              select: { id: true, fullName: true, mobileNumber: true }
            }
          }
        })
      ]);

      res.status(200).json({
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        cases
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to load patient cases' });
    }
  }

  /**
   * Patient Case Details: Inspect single case
   * GET /api/admin/patient-cases/:id
   */
  async getPatientCaseDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const caseId = req.params.id as string;
      const patientCase = await prisma.patientCase.findUnique({
        where: { id: caseId },
        include: {
          practitioner: {
            select: { id: true, fullName: true, mobileNumber: true }
          },
          documents: true
        }
      });

      if (!patientCase) {
        res.status(404).json({ success: false, message: 'Patient case not found' });
        return;
      }

      if (req.user) {
        await auditService.log(req.user.id, 'VIEW_PATIENT_CASE', caseId);
      }

      res.status(200).json({ success: true, case: patientCase });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to inspect patient case' });
    }
  }

  /**
   * Audit Logs
   * GET /api/admin/audit-logs
   */
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await auditService.getLogs(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to load audit logs' });
    }
  }

  /**
   * Admin AI Chatbot Query
   * POST /api/admin/chat
   */
  async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { query, patientId } = req.body;
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ success: false, message: 'A natural language query is required' });
        return;
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const response = await adminChatService.processAdminQuery({
        adminId,
        query: query.trim(),
        patientId,
        ipAddress
      });

      res.status(200).json({ success: true, ...response });
    } catch (error: any) {
      console.error('[ADMIN CHAT CONTROLLER ERROR]', error);
      res.status(500).json({ success: false, message: error.message || 'Internal AI service error' });
    }
  }

  /**
   * Search patients for admin selection
   * GET /api/admin/patients/search
   */
  async searchPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await patientContextService.searchPatients(q, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to search patients' });
    }
  }

  /**
   * Full patient case and medical history summary
   * GET /api/admin/patients/:id/summary
   */
  async getPatientFullSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id as string;
      const profile = await patientContextService.getPatientFullProfile({ caseId: patientId });

      if (!profile) {
        res.status(404).json({ success: false, message: 'Patient profile not found' });
        return;
      }

      if (req.user) {
        await auditService.log(req.user.id, 'VIEW_PATIENT_SUMMARY', patientId);
      }

      res.status(200).json({ success: true, profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve patient summary' });
    }
  }

  /**
   * Approved doctor medicine dataset knowledge chunks
   * GET /api/admin/knowledge
   */
  async getKnowledge(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await knowledgeService.getAllApprovedChunks(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve knowledge chunks' });
    }
  }
}

export const adminController = new AdminController();

