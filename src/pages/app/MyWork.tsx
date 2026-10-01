import { useMemo, useState } from 'react'
import { WorkView } from '@/components/board/WorkView'
import { Icon } from '@/components/ui/Icon'
import { PageHeader, Tabs } from '@/components/ui/misc'
import { Stat } from '@/components/ui/Card'
import { useIssues, useLookups, useTimeLogs } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { fmtHours } from '@/lib/format'

type Tab = 'assigned' | 'created' | 'subscribed' | 'done'

export function MyWork() {
  const { user } = useAuth()
  const { stateMap } = useLookups()
  const issues = useIssues()
  const logs = useTimeLogs()
  const [tab, setTab] = useState<Tab>('assigned')

  const mine = useMemo(() => {
    if (!user) return { assigned: [], created: [], subscribed: [], done: [] }
    const live = issues.filter((i) => !i.archivedAt)
    const isClosed = (id: string) => ['completed', 'canceled'].includes(stateMap.get(id)?.category ?? '')
    return {
      assigned: live.filter((i) => i.assigneeId === user.id && !isClosed(i.stateId)),
      created: live.filter((i) => i.reporterId === user.id),
      subscribed: live.filter((i) => i.subscriberIds.includes(user.id) && i.assigneeId !== user.id),
      done: live.filter((i) => i.assigneeId === user.id && isClosed(i.stateId)),
    }
  }, [issues, user, stateMap])

  const myLogs = useMemo(() => logs.filter((l) => l.userId === user?.id), [logs, user])
  const weekMinutes = useMemo(() => {
    const since = Date.now() - 7 * 86400000
    return myLogs.filter((l) => +new Date(l.date) >= since).reduce((s, l) => s + l.minutes, 0)
  }, [myLogs])

  const points = mine.assigned.reduce((s, i) => s + (i.estimate ?? 0), 0)
  const overdue = mine.assigned.filter((i) => i.dueDate && +new Date(i.dueDate) < Date.now()).length

  const current = mine[tab]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="My work"
        subtitle="Everything with your name on it, in one place."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="user" size={19} /></span>}
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'assigned', label: 'Assigned', icon: 'user', count: mine.assigned.length },
              { value: 'created', label: 'Created by me', icon: 'plus', count: mine.created.length },
              { value: 'subscribed', label: 'Following', icon: 'eye', count: mine.subscribed.length },
              { value: 'done', label: 'Recently closed', icon: 'check-circle', count: mine.done.length },
            ]}
          />
        }
      />

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
        <Stat label="Open items" value={mine.assigned.length} hint={`${points} points of work`} icon={<Icon name="list-todo" size={15} className="text-faint" />} />
        <Stat label="Overdue" value={overdue} tone={overdue ? 'bad' : 'good'} hint={overdue ? 'Re-date or drop them' : 'All on time'} icon={<Icon name="clock" size={15} className="text-faint" />} />
        <Stat label="Logged this week" value={fmtHours(weekMinutes)} hint={`${myLogs.length} entries all-time`} icon={<Icon name="timer" size={15} className="text-faint" />} />
        <Stat label="Closed recently" value={mine.done.length} tone="good" hint="Completed or cancelled" icon={<Icon name="check-circle" size={15} className="text-faint" />} />
      </div>

      <WorkView
        key={tab}
        viewKey={`my-work-${tab}`}
        issues={current}
        defaults={{ layout: 'list', groupBy: 'state', sortBy: 'priority' }}
        seed={{ assigneeId: user?.id }}
        emptyTitle="Nothing here yet"
        emptyDescription="When work is assigned to you it shows up here."
      />
    </div>
  )
}
