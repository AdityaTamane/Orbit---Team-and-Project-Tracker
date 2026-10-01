import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { useUsers } from '@/hooks/useData'

export function SwitchUser() {
  const navigate = useNavigate()
  const { loginAs, userId } = useAuth()
  const users = useUsers()

  return (
    <div className="min-h-[100dvh] bg-canvas bg-mesh px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Switch account</h1>
            <p className="mt-1 text-sm text-muted">
              Open a second browser tab as a different person to see mentions, presence and live updates flow between you.
            </p>
          </div>
          <Button variant="ghost" icon="arrow-left" onClick={() => navigate(-1)}>Back</Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={async () => { await loginAs(u.id); navigate('/app') }}
              className="card card-hover flex items-center gap-3 p-3 text-left"
            >
              <Avatar user={u} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  {u.id === userId && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">You</Badge>}
                </div>
                <p className="truncate text-xs text-muted">{u.title}</p>
                <p className="mt-0.5 truncate text-2xs text-faint">{u.email}</p>
              </div>
              <Badge className="shrink-0 bg-sunken capitalize text-muted">{u.role}</Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
