/**
 * 활동 로그 유틸리티
 * 사용자 활동을 기록하는 헬퍼 함수들
 */

import { logActivity, ActivityLogInput } from './db';
import { NextRequest } from 'next/server';

// 액션 타입 정의
export const ACTION_TYPES = {
  // 인증 관련
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  
  // 평가 관련
  VIEW_ASSESSMENT: 'view_assessment',
  UPDATE_ASSESSMENT: 'update_assessment',
  SAVE_RESPONSE: 'save_response',
  
  // 조언/가상증빙 관련
  VIEW_ADVICE: 'view_advice',
  GENERATE_ADVICE: 'generate_advice',
  VIEW_VIRTUAL_EVIDENCE: 'view_virtual_evidence',
  GENERATE_VIRTUAL_EVIDENCE: 'generate_virtual_evidence',
  
  // Q&A 관련
  CREATE_QUESTION: 'create_question',
  ANSWER_QUESTION: 'answer_question',
  VIEW_QA: 'view_qa',
  
  // 프로필 관련
  CREATE_PROFILE: 'create_profile',
  SWITCH_PROFILE: 'switch_profile',
  DELETE_PROFILE: 'delete_profile',
  
  // 관리자 관련
  ADMIN_VIEW_USERS: 'admin_view_users',
  ADMIN_UPDATE_USER: 'admin_update_user',
  ADMIN_DELETE_USER: 'admin_delete_user',
  ADMIN_VIEW_STATS: 'admin_view_stats',
  ADMIN_VIEW_LOGS: 'admin_view_logs',
  
  // 시스템 관련
  VIEW_ANNOUNCEMENTS: 'view_announcements',
  PAGE_VIEW: 'page_view',
  API_CALL: 'api_call',
} as const;

// 액션 카테고리 정의
export const ACTION_CATEGORIES = {
  AUTH: 'auth',
  ASSESSMENT: 'assessment',
  ADVICE: 'advice',
  VIRTUAL_EVIDENCE: 'virtual_evidence',
  QA: 'qa',
  PROFILE: 'profile',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

// 요청에서 IP 주소 추출
export function getClientIP(request: NextRequest): string {
  // X-Forwarded-For 헤더 확인 (프록시/로드밸런서 뒤에 있을 때)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // X-Real-IP 헤더 확인 (Nginx)
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // CF-Connecting-IP 헤더 확인 (Cloudflare)
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  
  return 'unknown';
}

// 요청에서 User-Agent 추출
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

// 활동 로그 기록 헬퍼
export function logUserActivity(
  request: NextRequest,
  actionType: string,
  actionCategory: string,
  options: {
    userId?: number | null;
    userEmail?: string | null;
    userName?: string | null;
    itemId?: string | null;
    assessmentType?: string | null;
    details?: Record<string, any> | null;
    sessionId?: string | null;
  } = {}
): number {
  const input: ActivityLogInput = {
    userId: options.userId,
    userEmail: options.userEmail,
    userName: options.userName,
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
    actionType,
    actionCategory,
    itemId: options.itemId,
    assessmentType: options.assessmentType,
    details: options.details ? JSON.stringify(options.details) : null,
    sessionId: options.sessionId,
  };
  
  return logActivity(input);
}

// 로그인 활동 기록
export function logLoginActivity(
  request: NextRequest,
  userId: number,
  userEmail: string,
  userName: string,
  success: boolean
): number {
  return logUserActivity(request, ACTION_TYPES.LOGIN, ACTION_CATEGORIES.AUTH, {
    userId: success ? userId : null,
    userEmail,
    userName: success ? userName : null,
    details: { success, timestamp: new Date().toISOString() },
  });
}

// 회원가입 활동 기록
export function logRegisterActivity(
  request: NextRequest,
  userId: number,
  userEmail: string,
  userName: string
): number {
  return logUserActivity(request, ACTION_TYPES.REGISTER, ACTION_CATEGORIES.AUTH, {
    userId,
    userEmail,
    userName,
    details: { timestamp: new Date().toISOString() },
  });
}

// 평가 항목 조회 활동 기록
export function logAssessmentViewActivity(
  request: NextRequest,
  userId: number,
  userEmail: string,
  userName: string,
  assessmentType: string
): number {
  return logUserActivity(request, ACTION_TYPES.VIEW_ASSESSMENT, ACTION_CATEGORIES.ASSESSMENT, {
    userId,
    userEmail,
    userName,
    assessmentType,
    details: { timestamp: new Date().toISOString() },
  });
}

// 평가 항목 업데이트 활동 기록
export function logAssessmentUpdateActivity(
  request: NextRequest,
  userId: number,
  userEmail: string,
  userName: string,
  itemId: string,
  assessmentType: string,
  changes?: Record<string, any>
): number {
  return logUserActivity(request, ACTION_TYPES.UPDATE_ASSESSMENT, ACTION_CATEGORIES.ASSESSMENT, {
    userId,
    userEmail,
    userName,
    itemId,
    assessmentType,
    details: { changes, timestamp: new Date().toISOString() },
  });
}

// 조언 조회 활동 기록
export function logAdviceViewActivity(
  request: NextRequest,
  userId: number | null,
  userEmail: string | null,
  userName: string | null,
  itemId: string
): number {
  return logUserActivity(request, ACTION_TYPES.VIEW_ADVICE, ACTION_CATEGORIES.ADVICE, {
    userId,
    userEmail,
    userName,
    itemId,
    details: { timestamp: new Date().toISOString() },
  });
}

// 가상증빙 조회 활동 기록
export function logVirtualEvidenceActivity(
  request: NextRequest,
  userId: number | null,
  userEmail: string | null,
  userName: string | null,
  itemId: string,
  generated: boolean
): number {
  const actionType = generated ? ACTION_TYPES.GENERATE_VIRTUAL_EVIDENCE : ACTION_TYPES.VIEW_VIRTUAL_EVIDENCE;
  return logUserActivity(request, actionType, ACTION_CATEGORIES.VIRTUAL_EVIDENCE, {
    userId,
    userEmail,
    userName,
    itemId,
    details: { generated, timestamp: new Date().toISOString() },
  });
}

// 관리자 활동 기록
export function logAdminActivity(
  request: NextRequest,
  adminId: number,
  adminEmail: string,
  adminName: string,
  actionType: string,
  targetInfo?: Record<string, any>
): number {
  return logUserActivity(request, actionType, ACTION_CATEGORIES.ADMIN, {
    userId: adminId,
    userEmail: adminEmail,
    userName: adminName,
    details: { target: targetInfo, timestamp: new Date().toISOString() },
  });
}
