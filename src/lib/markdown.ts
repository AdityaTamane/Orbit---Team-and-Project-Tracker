/**
 * Small, dependency-free Markdown renderer.
 * Input is escaped first, so user content can never inject HTML.
 * Supports: headings, bold/italic/strike, inline + fenced code, links,
 * bullet/ordered/task lists, tables, blockquotes and rules.
 */

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(src: string): string {
  let out = escapeHtml(src)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2" />')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  out = out.replace(/(^|\s)@([a-z][a-z0-9_.-]*)/gi, '$1<span class="mention">@$2</span>')
  return out
}

export function renderMarkdown(src: string): string {
  if (!src?.trim()) return ''
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let i = 0

  const flushTable = (): boolean => {
    if (!/\|/.test(lines[i] ?? '') || !/^\s*\|?[\s:-]+\|/.test(lines[i + 1] ?? '')) return false
    const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    const head = cells(lines[i])
    i += 2
    const body: string[][] = []
    while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
      body.push(cells(lines[i]))
      i += 1
    }
    html.push(
      `<table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>` +
        body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
        '</tbody></table>',
    )
    return true
  }

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i += 1; continue }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const buf: string[] = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1 }
      i += 1
      html.push(`<pre data-lang="${escapeHtml(lang)}"><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }

    if (flushTable()) continue

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      i += 1
      continue
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { html.push('<hr />'); i += 1; continue }

    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i += 1 }
      html.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`)
      continue
    }

    if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+\[[ xX]\]\s+/.test(lines[i])) {
        const done = /\[[xX]\]/.test(lines[i])
        const text = lines[i].replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
        buf.push(`<li class="task"><input type="checkbox" disabled ${done ? 'checked' : ''} />${inline(text)}</li>`)
        i += 1
      }
      html.push(`<ul class="task-list">${buf.join('')}</ul>`)
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`)
        i += 1
      }
      html.push(`<ul>${buf.join('')}</ul>`)
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
        i += 1
      }
      html.push(`<ol>${buf.join('')}</ol>`)
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|\s*>\s?)/.test(lines[i]) && !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])) {
      para.push(lines[i])
      i += 1
    }
    if (para.length) html.push(`<p>${inline(para.join('\n')).replace(/\n/g, '<br />')}</p>`)
  }

  return html.join('\n')
}

/** Plain-text preview for cards and search results. */
export function stripMarkdown(src: string, max = 160): string {
  const text = src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_~`|]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

/** @mentions in a comment body, resolved against the member list. */
export function extractMentions(body: string, users: { id: string; name: string; email: string }[]): string[] {
  const handles = [...body.matchAll(/@([a-z][a-z0-9_.-]*)/gi)].map((m) => m[1].toLowerCase())
  if (!handles.length) return []
  return users
    .filter((u) => {
      const first = u.name.split(' ')[0].toLowerCase()
      const handle = u.email.split('@')[0].toLowerCase()
      return handles.includes(first) || handles.includes(handle)
    })
    .map((u) => u.id)
}
