import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-erp-secure-multitenant-secret-2026';
const TOKEN_EXPIRY = '7d';

export interface AuthTokenPayload {
  userId: string;
  companyId: string;
  role: UserRole;
  username: string;
  name: string;
}

export interface TenantContext {
  companyId: string;
  userId?: string;
  role?: UserRole;
  username?: string;
}

// Global AsyncLocalStorage for tenant data isolation across async calls
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

// Helper to get active companyId from async context or fallback
export function getActiveCompanyId(explicitId?: string): string {
  if (explicitId && typeof explicitId === 'string' && explicitId.trim()) {
    return explicitId.trim();
  }
  const store = tenantStorage.getStore();
  if (store && store.companyId) {
    return store.companyId;
  }
  return 'comp_default_01';
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      companyId?: string;
    }
  }
}

// =============================================================
// PASSWORD HASHING (Bcrypt)
// =============================================================
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainText, salt);
}

export function hashPasswordSync(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export async function comparePassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false;

  // Check bcrypt hash
  try {
    const isMatch = await bcrypt.compare(plainText, storedHashOrPlain);
    if (isMatch) return true;
  } catch (err) {
    // If not a valid bcrypt hash, check legacy plaintext (for seamless dev migration)
  }

  // Graceful fallback for legacy seed/dev accounts
  return plainText === storedHashOrPlain;
}

// =============================================================
// JWT TOKEN MANAGEMENT
// =============================================================
export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

// =============================================================
// INVITE CODE GENERATOR & FORMATTER
// Example: "X7K9-P2M4"
// =============================================================
const INVITE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude 0, 1, I, O for zero ambiguity

export function generateInviteCode(): string {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += INVITE_CHARS.charAt(Math.floor(Math.random() * INVITE_CHARS.length));
    part2 += INVITE_CHARS.charAt(Math.floor(Math.random() * INVITE_CHARS.length));
  }
  return `${part1}-${part2}`;
}

export function normalizeInviteCode(code: string): string {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// =============================================================
// IN-MEMORY RATE LIMITER FOR AUTH
// =============================================================
interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  ip: string,
  action: string,
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
  }

  if (record.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: record.resetAt };
  }

  record.attempts += 1;
  return { allowed: true, remaining: maxAttempts - record.attempts, resetTime: record.resetAt };
}

export function resetRateLimit(ip: string, action: string) {
  const key = `${ip}:${action}`;
  rateLimitStore.delete(key);
}

// =============================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// =============================================================
function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return authHeader.trim();
  }
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return undefined;
}

export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.companyId) {
      req.user = payload;
      req.companyId = payload.companyId;
      return tenantStorage.run(
        { companyId: payload.companyId, userId: payload.userId, role: payload.role, username: payload.username },
        () => next()
      );
    }
  }

  tenantStorage.run({ companyId: 'comp_default_01' }, () => next());
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in with your company credentials.',
      code: 'UNAUTHORIZED',
    });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.companyId || !payload.userId) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please log in again.',
      code: 'INVALID_TOKEN',
    });
  }

  // Cross-Company Tampering Check:
  // If the request explicitly passes a different companyId in body/query/params, reject immediately!
  const requestedCompanyId =
    req.body?.companyId || req.query?.companyId || req.params?.companyId;

  if (requestedCompanyId && requestedCompanyId !== payload.companyId) {
    return res.status(403).json({
      error: 'Authorization error: Cross-company access is strictly prohibited.',
      code: 'CROSS_COMPANY_ACCESS_DENIED',
    });
  }

  req.user = payload;
  req.companyId = payload.companyId;

  tenantStorage.run(
    { companyId: payload.companyId, userId: payload.userId, role: payload.role, username: payload.username },
    () => next()
  );
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. Your role (${req.user.role}) does not have access to this action.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}
