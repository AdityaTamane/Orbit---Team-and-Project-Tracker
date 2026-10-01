import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { WorkView } from '@/components/board/WorkView'
import { CreateIssueModal } from '@/components/issue/CreateIssueModal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/misc'
import { Field, Input, Switch } from '@/components/ui/form'
import { useIssues, useSavedViews } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { db, now, uid } from '@/lib/db'
import { toast, useViews } from '@/lib/store'

export function AllIssues() {
  const navigate = useNavigate()
  const actorId = useActorId()
  const issues = useIssues()
  const savedViews = useSavedViews()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [savingView, setSavingView] = useState(false)
  const [viewName, setViewName] = useState('')
  const [viewShared, setViewShared] = useState(true)
  const viewStore = useViews()

  useEffect(() => {
    if (params.get('new') === '1') {
      setCreating(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const live = useMemo(() => issues, [issues])

  const saveView = async () => {
    const state = viewStore.get('all-issues')
    await db.savedViews.add({
      id: uid('sv'),
      name: viewName.trim() || 'Untitled view',
      icon: '🔎',
      ownerId: actorId,
      shared: viewShared,
      layout: state.layout,
      groupBy: state.groupBy,
      sortBy: state.sortBy,
      filter: state.filter,
      createdAt: now(),
    })
    setSavingView(false)
    setViewName('')
    toast.success('View saved to the sidebar')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="All issues"
        subtitle={`${issues.length} items across every team — filter, group and save the views you keep coming back to.`}
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="list-todo" size={19} /></span>}
        actions={
          <>
            {savedViews.length > 0 && (
              <Button variant="secondary" icon="bookmark" onClick={() => navigate(`/app/views/${savedViews[0].id}`)}>
                Saved views
              </Button>
            )}
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New issue</Button>
          </>
        }
      />

      <WorkView
        viewKey="all-issues"
        issues={live}
        defaults={{ layout: 'list', groupBy: 'state', sortBy: 'priority' }}
        onSaveView={() => setSavingView(true)}
      />

      <CreateIssueModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/app/issues/${id}`)} />

      <Modal
        open={savingView}
        onClose={() => setSavingView(false)}
        title="Save this view"
        subtitle="Filters, grouping and layout are stored together."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSavingView(false)}>Cancel</Button>
            <Button variant="primary" icon="bookmark" onClick={saveView}>Save view</Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <Field label="Name">
            <Input autoFocus value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. Urgent bugs this cycle" />
          </Field>
          <Switch
            checked={viewShared}
            onChange={setViewShared}
            label="Share with the workspace"
            description="Shared views appear in everyone's sidebar."
          />
        </div>
      </Modal>
    </div>
  )
}
