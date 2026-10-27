import { prisma } from '../db/prisma.js';

class ConversationService {
  /**
   * List conversations belonging to the authenticated user
   */
  async listUserConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({
        where: { userId, isDeleted: false }
      }),
      prisma.conversation.findMany({
        where: { userId, isDeleted: false },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { messages: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, role: true, createdAt: true }
          }
        }
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title || 'Untitled Consultation',
        language: c.language,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    };
  }

  /**
   * Create a new conversation for authenticated user
   */
  async createConversation(userId: string, data: { title?: string; language?: string; initialMessage?: string }) {
    const title = data.title?.trim() || (data.initialMessage ? data.initialMessage.slice(0, 40) + '...' : 'New Consultation');
    const language = data.language || 'en';

    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          userId,
          title,
          language,
          isDeleted: false
        }
      });

      if (data.initialMessage) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            role: 'user',
            content: data.initialMessage
          }
        });
      }

      return conv;
    });
  }

  /**
   * Get a conversation and its message history (Strict ownership check!)
   */
  async getConversation(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isDeleted: false
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conv) {
      return null;
    }

    return conv;
  }

  /**
   * Update conversation title (Strict ownership check!)
   */
  async updateTitle(userId: string, conversationId: string, title: string) {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, isDeleted: false }
    });

    if (!existing) return null;

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { title: title.trim() }
    });
  }

  /**
   * Soft-delete a conversation (Strict ownership check!)
   */
  async softDelete(userId: string, conversationId: string) {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, isDeleted: false }
    });

    if (!existing) return null;

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { isDeleted: true }
    });
  }

  /**
   * Add a message to a conversation (Strict ownership check & atomic timestamp touch)
   */
  async addMessage(
    userId: string,
    conversationId: string,
    messageData: { role: 'user' | 'assistant' | 'system'; content: string; feedback?: string; metadata?: any }
  ) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, isDeleted: false }
    });

    if (!conv) return null;

    return prisma.$transaction(async (tx) => {
      const newMsg = await tx.message.create({
        data: {
          conversationId,
          role: messageData.role,
          content: messageData.content,
          feedback: messageData.feedback || null,
          metadata: messageData.metadata || null
        }
      });

      // Touch updatedAt on conversation
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      return newMsg;
    });
  }

  /**
   * ADMIN: List all conversations across all users with search
   */
  async listAllForAdmin(params: { search?: string; userId?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
        { user: { mobileNumber: { contains: params.search } } },
      ];
    }

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, mobileNumber: true, role: true }
          },
          _count: {
            select: { messages: true }
          }
        }
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      conversations
    };
  }

  /**
   * ADMIN: Get single conversation messages with user info
   */
  async getAdminConversation(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: { id: true, fullName: true, mobileNumber: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }
}

export const conversationService = new ConversationService();
