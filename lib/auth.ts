import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_change_in_production';
const COOKIE_NAME = 'tf_token';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  name: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): JWTPayload | null {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export function cookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  };
}

export function generateMeetLink(): string {
  const seg = () =>
    Array.from({ length: 3 }, () =>
      'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    ).join('');
  return `https://meet.google.com/${seg()}-${seg()}-${seg()}`;
}
