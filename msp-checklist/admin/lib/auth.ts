import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key-change-in-production';
const COOKIE_NAME = 'admin_auth_token';

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT token generation and verification
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }); // 관리자는 24시간으로 제한
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function verifyAdminToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    // 관리자 권한 확인 (운영자, 관리자, 슈퍼관리자 모두 허용)
    if (!['operator', 'admin', 'superadmin'].includes(payload.role)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// Cookie management
export async function setAuthCookie(token: string): Promise<void> {
  // This will be handled in the API routes
}

export function getAuthCookie(): string | undefined {
  // This will be handled in the API routes
  return undefined;
}

export function clearAuthCookie(): void {
  // This will be handled in the API routes
}