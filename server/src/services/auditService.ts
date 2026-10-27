import { prisma } from '../db/prisma.js';

export class AuditService {
  async log(adminId: string, action: string, targetId?: string, details?: any, ipAddress?: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          adminId,
          action,
          targetId: targetId || null,
          details: details || {},
          ipAddress: ipAddress || null,
        }
      });
    } catch (error) {
      console.error('[AUDIT LOG ERROR]', error);
    }
  }

  async getLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, fullName: true, email: true, mobileNumber: true }
          }
        }
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs
    };
  }
}

export const auditService = new AuditService();
