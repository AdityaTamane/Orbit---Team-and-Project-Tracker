import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { Icon } from '@/components/ui/Icon'
import { Segmented } from '@/components/ui/form'

export function MarkdownView({ body, className }: { body: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(body), [body])
  if (!body?.trim()) return null
  return <div className={clsx('prose-doc', className)} dangerouslySetInnerHTML={{ __html: html }} />
}

const TOOLBAR: { icon: 'bold' | 'italic' | 'code' | 'list' | 'check-square' | 'link' | 'hash' | 'scroll'; title: string; wrap: [string, string] }[] = [
  { icon: 'bold', title: 'Bold', wrap: ['**', '**'] },
  { icon: 'italic', title: 'Italic', wrap: ['*', '*'] },
  { icon: 'code', title: 'Code', wrap: ['`', '`'] },
  { icon: 'hash', title: 'Heading', wrap: ['\n## ', ''] },
  { icon: 'list', title: 'Bullet list', wrap: ['\n- ', ''] },
  { icon: 'check-square', title: 'Task', wrap: ['\n- [ ] ', ''] },
  { icon: 'link', title: 'Link', wrap: ['[', '](https://)'] },
  { icon: 'scroll', title: 'Quote', wrap: ['\n> ', ''] },
]

export function MarkdownEditor({ value, onChange, placeholder, minHeight = 160, autoFocus, onSubmit, compact }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minHeight?: number
  autoFocus?: boolean
  onSubmit?: () => void
  compact?: boolean
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [el, setEl] = useState<HTMLTextAreaElement | null>(null)

  const applyWrap = ([before, after]: [string, string]) => {
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selection = value.slice(start, end)
    const next = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selection.length)
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <div className="flex items-center gap-0.5 border-b border-line bg-sunken/60 px-1.5 py-1">
        {TOOLBAR.slice(0, compact ? 4 : TOOLBAR.length).map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            onClick={() => applyWrap(t.wrap)}
            className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-surface hover:text-ink"
          >
            <Icon name={t.icon} size={14} />
          </button>
        ))}
        <div className="ml-auto">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]}
          />
        </div>
      </div>

      {tab === 'write' ? (
        <textarea
          ref={setEl}
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder ?? 'Write something… Markdown and @mentions work here.'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (onSubmit && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit() }
          }}
          style={{ minHeight }}
          className="w-full resize-y border-0 bg-transparent px-3 py-2.5 text-base leading-6 text-ink placeholder:text-faint focus:outline-none sm:text-sm"
        />
      ) : (
        <div className="px-3 py-2.5" style={{ minHeight }}>
          {value.trim() ? <MarkdownView body={value} /> : <p className="text-sm text-faint">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  )
}
