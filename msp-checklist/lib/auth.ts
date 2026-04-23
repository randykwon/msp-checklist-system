import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COOKIE_NAME = 'msp_auth_token';

// HTTPS 환경인지 확인 (HTTPS 프록시 뒤에 있는 경우도 고려)
const isSecureEnvironment = () => {
  // 명시적으로 HTTPS 사용 설정이 있으면 true
  if (process.env.USE_HTTPS === 'true') return true;
  // 명시적으로 HTTP 사용 설정이 있으면 false
  if (process.env.USE_HTTPS === 'false') return false;
  // 개발 환경이면 false
  if (process.env.NODE_ENV !== 'production') return false;
  // 프로덕션이지만 localhost면 false
  return false; // 기본적으로 HTTP 허용 (Nginx 프록시 환경 고려)
};

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Cookie management - for use in API routes with NextResponse
export function setAuthCookieOnResponse(response: any, token: string) {
  const secure = isSecureEnvironment();
  
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  
  console.log(`[Auth] Cookie set with secure=${secure}, NODE_ENV=${process.env.NODE_ENV}`);
  return response;
}

// Legacy cookie management using next/headers (for server components only)
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  const secure = isSecureEnvironment();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  
  console.log(`[Auth] Cookie set with secure=${secure}, NODE_ENV=${process.env.NODE_ENV}`);
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Remove cookie on response (for API routes)
export function removeAuthCookieOnResponse(response: any) {
  response.cookies.delete(COOKIE_NAME);
  return response;
}

// Get current user from cookie
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  return verifyToken(token);
}
