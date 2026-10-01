import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/form'
import { useCycles, useLookups, useMilestones, useStates } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { createIssue } from '@/lib/issues'
import { toast } from '@/lib/store'
import type { IssueType, Priority } from '@/lib/types'
import {
  AssigneePicker, CyclePicker, DateField, EstimatePicker, LabelPicker, MilestonePicker,
  PriorityPicker, ProjectPicker, StatePicker, TypePicker,
} from './pickers'

export interface CreateIssueSeed {
  teamId?: string
  projectId?: string
  stateId?: string
  cycleId?: string
  parentId?: string
  milestoneId?: string
  type?: IssueType
  assigneeId?: string
}

export function CreateIssueModal({ open, onClose, seed = {}, onCreated }: {
  open: boolean
  onClose: () => void
  seed?: CreateIssueSeed
  onCreated?: (id: string) => void
}) {
  const actorId = useActorId()
  const { teams, users, projects, labels } = useLookups()

  const [teamId, setTeamId] = useState(seed.teamId ?? teams[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<IssueType>(seed.type ?? 'task')
  const [priority, setPriority] = useState<Priority>(0)
  const [stateId, setStateId] = useState(seed.stateId ?? '')
  const [assigneeId, setAssigneeId] = useState<string | undefined>(seed.assigneeId)
  const [projectId, setProjectId] = useState<string | undefined>(seed.projectId)
  const [cycleId, setCycleId] = useState<string | undefined>(seed.cycleId)
  const [milestoneId, setMilestoneId] = useState<string | undefined>(seed.milestoneId)
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [estimate, setEstimate] = useState<number | undefined>()
  const [dueDate, setDueDate] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [another, setAnother] = useState(false)

  const teamStates = useStates(teamId)
  const teamCycles = useCycles(teamId)
  const projectMilestones = useMilestones(projectId)

  useEffect(() => {
    if (!open) return
    setTeamId(seed.teamId ?? teams[0]?.id ?? '')
    setProjectId(seed.projectId)
    setCycleId(seed.cycleId)
    setMilestoneId(seed.milestoneId)
    setStateId(seed.stateId ?? '')
    setAssigneeId(seed.assigneeId)
    setType(seed.type ?? 'task')
    setTitle('')
    setDescription('')
    setLabelIds([])
    setEstimate(undefined)
    setDueDate(undefined)
    setPriority(0)
  }, [open, seed.teamId, seed.projectId, seed.stateId, seed.cycleId, seed.milestoneId, seed.assigneeId, seed.type, teams])

  useEffect(() => {
    if (!teamStates.length) return
    if (!teamStates.some((s) => s.id === stateId)) {
      setStateId(teamStates.find((s) => s.category === 'backlog')?.id ?? teamStates[0].id)
    }
  }, [teamStates, stateId])

  const teamProjects = useMemo(
    () => projects.filter((p) => !teamId || p.teamIds.includes(teamId) || p.id === projectId),
    [projects, teamId, projectId],
  )

  const submit = async () => {
    if (!title.trim() || !teamId) return
    setSaving(true)
    try {
      const issue = await createIssue({
        teamId, title, description, type, priority, stateId: stateId || undefined,
        assigneeId, projectId, cycleId, milestoneId, labelIds, estimate, dueDate,
        parentId: seed.parentId, actorId,
      })
      toast.success(`${issue.key} created`, { label: 'Open', onClick: () => onCreated?.(issue.id) })
      if (another) {
        setTitle('')
        setDescription('')
      } else {
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title={seed.parentId ? 'New sub-issue' : 'New issue'}
      subtitle="Press ⌘↵ to create"
      footer={
        <>
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} className="accent-brand-500" />
            Create more
          </label>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="plus" loading={saving} disabled={!title.trim()} onClick={submit}>Create issue</Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-8 w-auto !text-[13px]">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </Select>
          <TypePicker value={type} onChange={setType} />
        </div>

        <Input
          autoFocus
          placeholder="Issue title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="!text-base font-medium"
        />
        <Textarea
          placeholder="Add a description… Markdown is supported."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px]"
        />

        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <StatePicker states={teamStates} value={stateId} onChange={setStateId} />
          <PriorityPicker value={priority} onChange={setPriority} />
          <AssigneePicker users={users} value={assigneeId} onChange={setAssigneeId} />
          <ProjectPicker projects={teamProjects} value={projectId} onChange={setProjectId} />
          {projectMilestones.length > 0 && <MilestonePicker milestones={projectMilestones} value={milestoneId} onChange={setMilestoneId} />}
          {teamCycles.length > 0 && <CyclePicker cycles={teamCycles.filter((c) => c.status !== 'completed')} value={cycleId} onChange={setCycleId} />}
          <LabelPicker labels={labels} value={labelIds} onChange={setLabelIds} />
          <EstimatePicker value={estimate} onChange={setEstimate} />
          <DateField value={dueDate} onChange={setDueDate} />
        </div>

        {seed.parentId && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Icon name="corner-down-right" size={13} /> This will be created as a sub-issue.
          </p>
        )}
      </div>
    </Modal>
  )
}
