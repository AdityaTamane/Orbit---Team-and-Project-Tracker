import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Field, Input } from '@/components/ui/form'
import { InlineAlert } from '@/components/ui/misc'
import { useAuth } from '@/lib/auth'
import { useUsers } from '@/hooks/useData'
import { seedDatabase } from '@/lib/seed'
import { toast } from '@/lib/store'

const HIGHLIGHTS = [
  { icon: 'users', title: 'Teams that own their flow', body: 'Every team brings its own workflow, cycles and shared space.' },
  { icon: 'wand', title: 'Projects onboarded in minutes', body: 'A guided wizard scaffolds milestones, a backlog and the docs.' },
  { icon: 'radar', title: 'Monitoring that flags itself', body: 'Health signals, burndowns, workload and forecasts, computed live.' },
] as const

export function Login() {
  const navigate = useNavigate()
  const { login, user, loginAs } = useAuth()
  const users = useUsers()

  const [email, setEmail] = useState('aditya@nimbus.io')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/app" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await login(email, password)
    setBusy(false)
    if (result.ok) navigate('/app')
    else setError(result.error ?? 'Could not sign in.')
  }

  return (
    <div className="min-h-[100dvh] bg-canvas bg-mesh">
      <div className="mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,440px)] lg:gap-16">
        {/* Pitch */}
        <div className="order-2 lg:order-1">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-xl shadow-glow">🛰️</span>
            <div>
              <p className="text-lg font-bold tracking-tight text-ink">Orbit</p>
              <p className="text-xs text-muted">Team, project & delivery tracker</p>
            </div>
          </div>

          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            Build teams, onboard projects, and watch the whole flow in one shared space.
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted">
            Orbit connects the work to the people doing it: issues and cycles, shared docs and decisions,
            automations that keep the board honest, and monitoring that tells you a project is slipping
            before the deadline does.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="card p-3.5">
                <span className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-brand-500/12 text-brand-600 dark:text-brand-300">
                  <Icon name={h.icon} size={16} />
                </span>
                <p className="text-[13px] font-semibold text-ink">{h.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{h.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-faint">
            Runs entirely in your browser — data lives in IndexedDB, nothing is sent anywhere.
          </p>
        </div>

        {/* Sign in */}
        <div className="order-1 lg:order-2">
          <div className="card p-6 shadow-lift">
            <h2 className="text-lg font-bold text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use a demo account below, or your own if you created one.</p>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <Field label="Email">
                <Input type="email" icon="mail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nimbus.io" required />
              </Field>
              <Field label="Password" hint="Every demo account uses demo123">
                <Input type="password" icon="lock" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              {error && <InlineAlert tone="danger">{error}</InlineAlert>}
              <Button type="submit" variant="primary" size="lg" block loading={busy} iconRight="arrow-right">Sign in</Button>
            </form>

            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Jump straight in as</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {users.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    onClick={async () => { await loginAs(u.id); navigate('/app') }}
                    className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-left transition hover:border-brand-500/40 hover:bg-sunken"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">{u.name}</span>
                      <span className="block truncate text-2xs text-faint">{u.title}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Link to="/switch" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">See all accounts</Link>
                <button
                  onClick={async () => { await seedDatabase(true); toast.success('Demo data reset') }}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Reset demo data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
