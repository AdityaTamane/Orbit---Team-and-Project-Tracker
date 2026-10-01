import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { User } from './types'

const SESSION_KEY = 'orbit:session'

interface AuthValue {
  user: User | null
  userId: string | null
  ready: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  loginAs: (userId: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))
  const [ready, setReady] = useState(false)

  const user = useLiveQuery(async () => (userId ? ((await db.users.get(userId)) ?? null) : null), [userId], null)

  useEffect(() => {
    // Session is only "ready" once we know whether the stored id resolves.
    if (!userId) { setReady(true); return }
    db.users.get(userId).then((found) => {
      if (!found) {
        localStorage.removeItem(SESSION_KEY)
        setUserId(null)
      }
      setReady(true)
    })
  }, [userId])

  useEffect(() => {
    if (userId) db.users.update(userId, { lastSeenAt: new Date().toISOString() })
  }, [userId])

  const value = useMemo<AuthValue>(() => ({
    user: user ?? null,
    userId,
    ready,
    isAdmin: !!user && (user.role === 'owner' || user.role === 'admin'),
    async login(email, password) {
      const found = await db.users.where('email').equals(email.trim().toLowerCase()).first()
      if (!found) return { ok: false, error: 'No account with that email.' }
      if (found.password !== password) return { ok: false, error: 'Incorrect password.' }
      localStorage.setItem(SESSION_KEY, found.id)
      setUserId(found.id)
      return { ok: true }
    },
    async loginAs(id) {
      localStorage.setItem(SESSION_KEY, id)
      setUserId(id)
    },
    logout() {
      localStorage.removeItem(SESSION_KEY)
      setUserId(null)
    },
  }), [user, userId, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Convenience for mutations that need an actor id. */
export function useActorId(): string {
  return useAuth().userId ?? 'u_aditya'
}
