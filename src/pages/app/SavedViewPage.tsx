import { useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/misc'
import { WorkView } from '@/components/board/WorkView'
import { useIssues, useLookups, useSavedViews } from '@/hooks/useData'
import { db } from '@/lib/db'
import { toast, useViews } from '@/lib/store'

export function SavedViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const views = useSavedViews()
  const issues = useIssues()
  const { userMap } = useLookups()
  const viewStore = useViews()

  const view = views.find((v) => v.id === id)
  const viewKey = `saved-${id}`

  // Seed the working view state from the saved definition once it loads.
  useEffect(() => {
    if (view) {
      viewStore.set(viewKey, {
        layout: view.layout,
        groupBy: view.groupBy,
        sortBy: view.sortBy,
        filter: view.filter,
        showSubIssues: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.id])

  if (!view) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Icon name="bookmark" size={20} />}
          title="View not found"
          description="It may have been deleted from settings."
          action={<Button variant="primary" onClick={() => navigate('/app/issues')}>All issues</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-xl">{view.icon}</span>}
        title={view.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge className="bg-sunken capitalize text-muted">{view.layout}</Badge>
            <Badge className="bg-sunken text-muted">grouped by {view.groupBy}</Badge>
            {view.shared && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="users" size={10} />Shared</Badge>}
            <span className="text-xs text-faint">by {userMap.get(view.ownerId)?.name ?? 'someone'}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon="save"
              onClick={async () => {
                const current = viewStore.get(viewKey)
                await db.savedViews.update(view.id, {
                  layout: current.layout, groupBy: current.groupBy, sortBy: current.sortBy, filter: current.filter,
                })
                toast.success('View updated')
              }}
            >
              Update view
            </Button>
            <Button
              variant="ghost"
              icon="trash"
              className="text-rose-500"
              onClick={async () => { await db.savedViews.delete(view.id); toast.success('View deleted'); navigate('/app/issues') }}
            >
              Delete
            </Button>
          </>
        }
      />

      <WorkView
        viewKey={viewKey}
        issues={issues}
        defaults={{ layout: view.layout, groupBy: view.groupBy, sortBy: view.sortBy, filter: view.filter }}
        emptyTitle="Nothing matches this view"
        emptyDescription="The saved filters return no issues right now."
      />
    </div>
  )
}
