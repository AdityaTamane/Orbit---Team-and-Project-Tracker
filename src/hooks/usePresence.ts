import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { broadcastPresence, leavePresence, onPeers } from '@/lib/realtime'
import type { Presence } from '@/lib/types'
import type { User } from '@/lib/types'

/** Heartbeats this tab's location and returns everyone else's. */
export function usePresence(user: User | null, label: string): Presence[] {
  const location = useLocation()
  const [peers, setPeers] = useState<Presence[]>([])

  useEffect(() => onPeers(setPeers), [])

  useEffect(() => {
    if (!user) return
    const beat = () => broadcastPresence({
      userId: user.id, name: user.name, color: user.avatarColor,
      route: location.pathname, label,
    })
    beat()
    const timer = window.setInterval(beat, 6000)
    const onHide = () => { if (document.hidden) leavePresence(user.id); else beat() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', () => leavePresence(user.id))
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      leavePresence(user.id)
    }
  }, [user, location.pathname, label])

  return peers.filter((p) => p.userId !== user?.id)
}
