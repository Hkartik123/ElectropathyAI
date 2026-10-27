import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { User, JwtPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? '';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in the server environment');
}

export class TokenService {
  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      userId: user.id,
      mobileNumber: user.mobileNumber,
      role: user.role
    };

    // 15-minute Access Token
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    // 7-day Refresh Token
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Persist in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        isRevoked: false
      }
    });

    // We encode userId + rawToken into JWT for transmission
    const refreshToken = jwt.sign({ userId: user.id, token: rawToken }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  async revokeUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true }
    });
  }

  async verifyAndRotateRefreshToken(refreshTokenString: string): Promise<{ accessToken: string; refreshToken: string; user: any } | null> {
    try {
      const decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET) as { userId: string; token: string };
      if (!decoded?.userId || !decoded?.token) return null;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) return null;

      // Find valid unrevoked tokens for this user
      const dbTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });

      let matchedTokenRecord: any = null;
      for (const t of dbTokens) {
        const isMatch = await bcrypt.compare(decoded.token, t.tokenHash);
        if (isMatch) {
          matchedTokenRecord = t;
          break;
        }
      }

      if (!matchedTokenRecord) return null;

      // Revoke the old token (rotation)
      await prisma.refreshToken.update({
        where: { id: matchedTokenRecord.id },
        data: { isRevoked: true }
      });

      // Issue new token pair
      const newTokens = await this.generateTokens(user as any);
      return {
        ...newTokens,
        user
      };
    } catch (err) {
      return null;
    }
  }
}

export const tokenService = new TokenService();
