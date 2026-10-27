import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { User, UserType, PreferredLang } from '../types/index.js';
import { normalizePhoneNumber } from '../utils/phone.js';

class UserService {
  async findByMobile(mobileNumber: string): Promise<User | null> {
    const norm = normalizePhoneNumber(mobileNumber);
    if (!norm.isValid) return null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { mobileNumber: norm.e164 },
          { mobileNumber: norm.national10Digit }
        ]
      }
    });

    if (!user) return null;

    // Seamless migration: If previously stored without E.164 country code, upgrade in place
    if (user.mobileNumber !== norm.e164) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { mobileNumber: norm.e164 }
        });
      } catch {
        // Keep existing if conflict
      }
    }

    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      fullName: user.fullName || undefined,
      email: user.email || undefined,
      userType: (user.userType as UserType) || undefined,
      preferredLang: user.preferredLang as PreferredLang,
      role: user.role as any,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    if (!user) return null;

    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      fullName: user.fullName || undefined,
      email: user.email || undefined,
      userType: (user.userType as UserType) || undefined,
      preferredLang: user.preferredLang as PreferredLang,
      role: user.role as any,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() }
    });
  }

  async createFromMobile(mobileNumber: string): Promise<User> {
    const norm = normalizePhoneNumber(mobileNumber);
    if (!norm.isValid) {
      throw new Error(norm.error || 'Invalid mobile number format for account creation.');
    }

    // Check for existing account to prevent duplicates
    const existing = await this.findByMobile(norm.e164);
    if (existing) {
      return existing;
    }

    const user = await prisma.user.create({
      data: {
        mobileNumber: norm.e164,
        preferredLang: 'en',
        role: 'patient', // Default role is always patient
        isActive: true,
      }
    });

    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      fullName: user.fullName || undefined,
      email: user.email || undefined,
      userType: (user.userType as UserType) || undefined,
      preferredLang: user.preferredLang as PreferredLang,
      role: user.role as any,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Safe profile update: strictly prevents role escalation to admin!
   */
  async updateProfile(
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      userType?: UserType;
      preferredLang?: PreferredLang;
      passwordHash?: string;
    }
  ): Promise<User> {
    const dataToUpdate: any = {};
    if (updates.fullName !== undefined) dataToUpdate.fullName = updates.fullName;
    if (updates.email !== undefined) dataToUpdate.email = updates.email;
    if (updates.passwordHash !== undefined) dataToUpdate.passwordHash = updates.passwordHash;
    if (updates.userType !== undefined) {
      dataToUpdate.userType = updates.userType;
      // Strictly prevent escalating to 'admin'
      if (updates.userType === 'practitioner') {
        dataToUpdate.role = 'practitioner';
      } else if (updates.userType === 'student' || updates.userType === 'researcher' || updates.userType === 'patient') {
        dataToUpdate.role = 'patient';
      }
    }
    if (updates.preferredLang !== undefined) dataToUpdate.preferredLang = updates.preferredLang;

    const user = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      fullName: user.fullName || undefined,
      email: user.email || undefined,
      userType: (user.userType as UserType) || undefined,
      preferredLang: user.preferredLang as PreferredLang,
      role: user.role as any,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Paginated user list for Admin Dashboard
   */
  async getUsersForAdmin(params: { search?: string; status?: string; role?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { mobileNumber: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.status === 'active') where.isActive = true;
    if (params.status === 'inactive') where.isActive = false;
    if (params.role) where.role = params.role;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mobileNumber: true,
          fullName: true,
          email: true,
          userType: true,
          role: true,
          isActive: true,
          preferredLang: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversations: true,
              patientCases: true,
            }
          }
        }
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users
    };
  }

  async setUserActiveStatus(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        mobileNumber: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      }
    });
  }

  async setPassword(userId: string, plainPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }
}

export const userService = new UserService();
