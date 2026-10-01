/**
 * Cross-tab realtime bus.
 * Dexie's liveQuery already propagates data changes between tabs, so this channel
 * carries only ephemeral signals: presence heartbeats, typing indicators and nudges.
 */
import type { Presence } from './types'

type BusEvent =
  | { kind: 'presence'; payload: Presence }
  | { kind: 'presence:leave'; payload: { userId: string } }
  | { kind: 'ping'; payload: { from: string; message: string; to?: string } }

type Handler = (e: BusEvent) => void

const CHANNEL = 'orbit-bus'
const handlers = new Set<Handler>()

let channel: BroadcastChannel | null = null
if (typeof BroadcastChannel !== 'undefined') {
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (e) => handlers.forEach((h) => h(e.data as BusEvent))
}

export function publish(event: BusEvent): void {
  channel?.postMessage(event)
}

export function subscribe(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

/* ── Presence registry (in-memory, per tab) ─────────────────── */

const peers = new Map<string, Presence>()
const peerListeners = new Set<(p: Presence[]) => void>()
const STALE_MS = 20_000

function emitPeers() {
  const list = [...peers.values()].filter((p) => Date.now() - p.at < STALE_MS)
  peerListeners.forEach((l) => l(list))
}

subscribe((e) => {
  if (e.kind === 'presence') {
    peers.set(e.payload.userId, e.payload)
    emitPeers()
  } else if (e.kind === 'presence:leave') {
    peers.delete(e.payload.userId)
    emitPeers()
  }
})

setInterval(emitPeers, 8000)

export function onPeers(listener: (p: Presence[]) => void): () => void {
  peerListeners.add(listener)
  emitPeers()
  return () => peerListeners.delete(listener)
}

export function broadcastPresence(p: Omit<Presence, 'at'>): void {
  publish({ kind: 'presence', payload: { ...p, at: Date.now() } })
}

export function leavePresence(userId: string): void {
  publish({ kind: 'presence:leave', payload: { userId } })
}
