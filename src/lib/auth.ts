import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const COOKIE_NAME = 'mmp_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function createSessionToken(userId: string) {
  return jwt.sign({ userId }, SESSION_SECRET, { expiresIn: '30d' })
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// Reads the session cookie and returns the logged-in user, or null.
export async function getCurrentUser() {
  const store = cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = verifySessionToken(token)
  if (!payload) return null
  return prisma.user.findUnique({ where: { id: payload.userId } })
}
