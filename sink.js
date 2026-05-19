#!/usr/bin/env bun
import { readdirSync, readFileSync, watch } from 'fs'
import { join, basename } from 'path'

const PORT = 3000
const PROJECT = join(import.meta.dir, 'project')
const PREVIEW = join(PROJECT, 'preview')
const UNIFICATION_DATA = join(import.meta.dir, '.planning', 'unification-data.json')

const LAYER_ORDER = ['TOKEN', 'PRIMITIVE', 'COMPOUND', 'UNIQUE', 'COMPOSITION']
const LAYER_LABELS = {
  TOKEN: 'Tokens',
  PRIMITIVE: 'Primitives',
  COMPOUND: 'Compounds',
  UNIQUE: 'Unique Specimens',
  COMPOSITION: 'Compositions',
}

// ── helpers ─────────────────────────────────────────────────────────────────

// Files on disk but intentionally excluded from the sink (Wave 5 will decide their fate).
const SINK_EXCLUDE = new Set([
  'composition-app-reference-index.html',
])

function cards() {
  return readdirSync(PREVIEW)
    .filter(f => f.endsWith('.html') && f !== 'index.html' && !SINK_EXCLUDE.has(f))
    .sort()
}

function scopeStyles(css, id) {
  const safeId = id.replace(/[^a-z0-9]/gi, '-')

  // Namespace every @keyframes name to this card so duplicate names across cards don't collide
  const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1])
  for (const name of names) {
    const prefixed = `${safeId}__${name}`
    css = css
      .replace(new RegExp(`@keyframes\\s+${name}(?=[\\s{])`, 'g'), `@keyframes ${prefixed}`)
      .replace(new RegExp(`(animation-name\\s*:[^;]*)\\b${name}\\b`, 'g'), `$1${prefixed}`)
      .replace(new RegExp(`(animation\\s*:[^;]*)\\b${name}\\b`, 'g'), `$1${prefixed}`)
  }

  // Keyframes must stay at global scope — extract them out, then @scope the rest
  const keyframes = []
  const rest = css.replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*|\{[^{}]*\})*\}/g, m => {
    keyframes.push(m)
    return ''
  })
  const scoped = rest.trim() ? `@scope (#${id}) {\n${rest}\n}` : ''
  return [...keyframes, scoped].filter(Boolean).join('\n')
}

function extract(filename) {
  const html = readFileSync(join(PREVIEW, filename), 'utf8')
  const raw = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(m => m[1])
    .map(s => s
      // Strip page-level resets only. Anchor at line start or after `}` so
      // class selectors ending in `body` or `html` (e.g. `.s-body`) survive.
      .replace(/(?:^|(?<=[}\n]))\s*html\s*,\s*body\s*\{[^}]*\}/gi, '')
      .replace(/(?:^|(?<=[}\n]))\s*html\s*\{[^}]*\}/gi, '')
      .replace(/(?:^|(?<=[}\n]))\s*body\s*\{[^}]*\}/gi, ''))
    .join('\n')
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
  return { raw, body }
}

function loadUnification() {
  return JSON.parse(readFileSync(UNIFICATION_DATA, 'utf8'))
}

function shortLabel(f) {
  return basename(f, '.html')
}

function previewName(file) {
  return file.replace(/^preview\//, '')
}

function anchorId(...parts) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ── page builder ─────────────────────────────────────────────────────────────

function buildPage() {
  const data = loadUnification()
  const allCards = new Set(readdirSync(PREVIEW).filter(f => f.endsWith('.html') && f !== 'index.html' && !SINK_EXCLUDE.has(f)))
  const groups = [...data.groups].sort((a, b) => {
    const layerDelta = LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer)
    if (layerDelta !== 0) return layerDelta
    return data.groups.indexOf(a) - data.groups.indexOf(b)
  })
  const mapped = new Set()
  for (const g of groups) for (const c of g.cards) mapped.add(previewName(c.file))
  const ungrouped = [...allCards].filter(f => !mapped.has(f)).sort()

  const cardCount = groups.reduce((sum, g) => sum + g.cards.length, 0)
  const layerStats = Object.fromEntries(LAYER_ORDER.map(layer => [layer, 0]))
  for (const g of groups) layerStats[g.layer] += g.cards.length

  // Sidebar: layer → family, plus any unmatched preview files.
  const navHtml = [
    ...LAYER_ORDER.map(layer => {
      const layerGroups = groups.filter(g => g.layer === layer)
      if (!layerGroups.length) return ''
      // Make the layer heading itself the jump-link to the layer hero;
      // strip the layer-prefix from each family title so it doesn't repeat the section.
      return `<a class="ng ng-link" href="#layer-${anchorId(layer)}">${LAYER_LABELS[layer] || layer}</a>
        ${layerGroups.map(g => {
          // Label only — the family slug (chip) is internal metadata that just repeats
          // the label or adds nothing useful ("general", "card-shells"). Keep the link clean.
          const familyTitle = (g.title || '').replace(/^[^·]+·\s*/, '').trim() || g.family
          return `<a href="#group-${anchorId(g.layer, g.family)}">${escapeHtml(familyTitle)}</a>`
        }).join('\n')}`
    }),
    ungrouped.length > 0
      ? `<div class="ng">Ungrouped (${ungrouped.length})</div>
         ${ungrouped.map(f => `<a href="#card-${basename(f,'.html')}">${shortLabel(f)}</a>`).join('\n')}`
      : ''
  ].join('\n')

  const renderCard = (card, num, total) => {
    const file = previewName(card.file)
    const id = `card-${basename(file, '.html')}`
    const consumes = Array.isArray(card.consumes) ? card.consumes : []
    const consumeRow = consumes.length
      ? `<div class="consume-row">
          <span class="consume-label">CONSUMES</span>
          <span class="consume-list">${consumes.map(escapeHtml).join('<span class="consume-sep">·</span>')}</span>
        </div>`
      : ''

    if (!allCards.has(file)) {
      return `<div class="specimen missing" id="${id}">
        <div class="specimen-head">
          <span class="card-num">${num}/${total}</span>
          <span class="specimen-label">${escapeHtml(card.name || shortLabel(file))}</span>
        </div>
        <div class="card-missing">file not found in preview/ — was it deleted?</div>
      </div>`
    }
    const { raw, body } = extract(file)
    const styles = raw ? scopeStyles(raw, id) : ''
    const blurb = card.blurb ? `<div class="card-blurb">${escapeHtml(card.blurb)}</div>` : ''
    return `<div class="specimen" id="${id}">
      <div class="specimen-head">
        <span class="card-num">${num}/${total}</span>
        <span class="specimen-label">${escapeHtml(card.name || shortLabel(file))}</span>
      </div>
      ${blurb}
      ${consumeRow}
      ${styles ? `<style>${styles}</style>` : ''}
      <div class="specimen-body">${body}</div>
    </div>`
  }

  const groupSection = g => {
    const cards = g.cards.map((c, i) => renderCard(c, i + 1, g.cards.length)).join('\n')
    // strip the layer prefix from g.title for the H2 (the parent layer-section already says it)
    const familyHeading = (g.title || '').replace(/^[^·]+·\s*/, '').trim() || g.family
    return `<section class="group" id="group-${anchorId(g.layer, g.family)}">
      <div class="group-header">
        <h2>${escapeHtml(familyHeading)}</h2>
      </div>
      ${cards}
    </section>`
  }

  const layerSections = LAYER_ORDER.map(layer => {
    const layerGroups = groups.filter(g => g.layer === layer)
    if (!layerGroups.length) return ''
    return `<section class="layer-section" id="layer-${anchorId(layer)}">
      <div class="layer-header">
        <h1>${escapeHtml(LAYER_LABELS[layer] || layer)}</h1>
        <span class="layer-count">${layerStats[layer]} cards</span>
      </div>
      ${layerGroups.map(groupSection).join('\n')}
    </section>`
  }).join('\n')

  const ungroupedSection = ungrouped.length === 0 ? '' : `
    <section class="group" id="group-ungrouped">
      <div class="group-header"><h2>Ungrouped</h2><span class="phase-tag">UNMAPPED</span></div>
      <div class="card-blurb">These cards exist in preview/ but are not in .planning/unification-data.json.</div>
      ${ungrouped.map((f, i) => renderCard({
        file: `preview/${f}`,
        name: shortLabel(f),
        blurb: 'Preview file exists but is not mapped in the schema.',
        consumes: []
      }, i + 1, ungrouped.length)).join('\n')}
    </section>`

  const cardSections = layerSections + ungroupedSection

  return /* html */`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Emotitone · Kitchen Sink</title>
  <link rel="stylesheet" href="/preview/_card.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--ink);
      color: var(--fg);
      font: var(--t-body);
    }

    /* sidebar */
    #sidebar {
      width: 200px;
      flex-shrink: 0;
      height: 100vh;
      overflow-y: auto;
      background: var(--ink-2);
      border-right: 1px solid var(--hairline);
      scrollbar-width: thin;
      scrollbar-color: var(--ink-5) transparent;
    }
    #sidebar-head {
      padding: 16px 14px 12px;
      border-bottom: 1px solid var(--hairline);
      position: sticky;
      top: 0;
      background: var(--ink-2);
      z-index: 10;
    }
    #sidebar-head .wm {
      font: var(--t-h1);
      letter-spacing: var(--tracking-display);
      text-transform: uppercase;
    }
    #sidebar-head .sub { font: var(--t-caption); color: var(--fg-3); margin-top: 2px; }

    nav { padding: 6px 0 32px; }
    .ng {
      font: var(--t-caption);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--fg-3);
      padding: 12px 14px 3px;
    }
    /* When .ng is itself an <a> jump-link to the layer hero, keep the heading look + add affordance. */
    a.ng-link {
      display: block;
      text-decoration: none;
      cursor: pointer;
    }
    a.ng-link:hover { color: var(--ivory); }
    nav a {
      display: block;
      padding: 4px 14px 4px 18px;
      font: var(--t-caption);
      color: var(--fg-2);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 80ms, background 80ms;
      border-left: 2px solid transparent;
    }
    nav a:hover { color: var(--fg); background: var(--ink-3); }
    nav a.active { color: var(--brass); border-left-color: var(--brass); }

    /* main */
    #main {
      flex: 1;
      height: 100vh;
      overflow-y: auto;
      padding: 32px 36px 80px;
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: var(--ink-5) transparent;
    }

    /* group sections */
    .layer-section {
      margin-bottom: 72px;
      scroll-margin-top: 16px;
    }
    .layer-header {
      display: flex;
      align-items: baseline;
      gap: 14px;
      padding-bottom: 14px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--hairline);
      scroll-margin-top: 16px;
    }
    .layer-header h1 {
      font: var(--t-display-l);
      letter-spacing: var(--tracking-display);
      text-transform: uppercase;
      color: var(--fg);
    }
    .layer-code,
    .layer-count {
      font: var(--t-caption);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ivory-3);
    }
    .layer-code {
      color: var(--brass);
    }
    .group { margin-bottom: 48px; }
    .group-header {
      font: var(--t-h1);
      letter-spacing: var(--tracking-display);
      text-transform: uppercase;
      color: var(--fg);
      padding-bottom: 10px;
      border-bottom: 1px solid var(--hairline);
      margin-bottom: 20px;
      scroll-margin-top: 16px;
    }

    /* specimens */
    .specimen {
      margin-bottom: 16px;
      background: var(--ink-2);
      border-radius: var(--r-md);
      box-shadow: var(--ring);
      overflow: hidden;
      scroll-margin-top: 16px;
    }
    .specimen-label {
      font: var(--t-caption);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--fg-3);
      padding: 7px 14px;
      background: var(--ink-3);
      border-bottom: 1px solid var(--hairline);
    }
    .specimen-body {
      padding: 0;
    }
    /* make .card and .v2-card inside specimens play nice — remove their own radius/shadow since the wrapper handles that */
    .specimen-body .card,
    .specimen-body .v2-card {
      border-radius: 0;
      box-shadow: none;
      width: 100%;
    }

    /* ── unification: group header, recommendation, decisions, badges ─ */
    .group { position: relative; }
    .group-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--hairline);
      margin-bottom: 20px;
      scroll-margin-top: 16px;
    }
    .group-header h2 {
      font: var(--t-h1);
      letter-spacing: var(--tracking-display);
      text-transform: uppercase;
      color: var(--fg);
      margin: 0;
    }
    .group-code {
      font: var(--t-mono);
      font-size: 13px;
      letter-spacing: 0.04em;
      color: var(--brass);
      background: var(--ink);
      padding: 4px 8px;
      border-radius: 3px;
      border: 1px solid var(--ink-5);
      font-weight: 600;
    }
    .phase-tag, .file-tag {
      font: var(--t-caption);
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 2px;
    }
    .phase-tag { background: var(--ink-4); color: var(--ivory-3); }
    .file-tag { background: var(--ink); color: var(--ivory-4); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* specimen head bar */
    .specimen-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 14px;
      background: var(--ink-3);
      border-bottom: 1px solid var(--hairline);
    }
    .card-num {
      font: var(--t-caption);
      font-size: 11px;
      color: var(--ivory-3);
      background: var(--ink);
      padding: 2px 7px;
      border-radius: 2px;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    .specimen-head .specimen-label {
      flex: 1;
      padding: 0;
      background: none;
      border: none;
    }

    .card-blurb {
      font: var(--t-caption);
      color: var(--ivory-3);
      padding: 6px 14px;
      background: var(--ink-3);
      border-bottom: 1px solid var(--hairline);
    }
    .consume-row {
      display: flex;
      gap: 9px;
      align-items: baseline;
      padding: 6px 14px 7px;
      background: var(--ink-2);
      border-bottom: 1px solid var(--hairline);
      font: var(--t-caption);
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ivory-3);
    }
    .consume-label {
      color: var(--brass);
    }
    .consume-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0 7px;
      min-width: 0;
    }
    .consume-sep {
      color: var(--ivory-4);
      margin-left: 7px;
    }
    .card-missing {
      padding: 24px;
      text-align: center;
      color: var(--tomato);
      font: var(--t-caption);
      letter-spacing: 0.12em;
    }
    .specimen.missing { opacity: 0.5; }

    /* stats strip in sidebar */
    .stats-strip {
      display: flex;
      gap: 4px;
      padding: 8px 14px 12px;
      border-bottom: 1px solid var(--hairline);
      flex-wrap: wrap;
    }
    .stat {
      font: var(--t-caption);
      font-size: 10px;
      letter-spacing: 0.06em;
      padding: 2px 6px;
      border-radius: 2px;
    }
    .stat { background: var(--ink-3); color: var(--ivory-3); }

    /* assets */
  </style>
</head>
<body>

<aside id="sidebar">
  <div id="sidebar-head">
    <div class="wm">Emotitone</div>
    <div class="sub">layer/family sink</div>
  </div>
  <div class="stats-strip">
    <span class="stat">${cardCount} cards</span>
    <span class="stat">${groups.length} groups</span>
    <span class="stat">${LAYER_ORDER.filter(layer => layerStats[layer] > 0).length} layers</span>
  </div>
  <nav>${navHtml}</nav>
</aside>

<main id="main">

  <!-- CARD SECTIONS ──────────────────────── -->
  ${cardSections}

</main>

<script>
  // WebSocket live reload
  function connect() {
    const ws = new WebSocket('ws://' + location.host + '/ws')
    ws.onmessage = () => location.reload()
    ws.onclose = () => setTimeout(connect, 1000)
  }
  connect()

  // Active nav highlight
  const links = document.querySelectorAll('nav a')
  const targets = document.querySelectorAll('[id]')
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.remove('active'))
        const a = document.querySelector('nav a[href="#' + e.target.id + '"]')
        if (a) { a.classList.add('active'); a.scrollIntoView({ block: 'nearest' }) }
      }
    })
  }, { rootMargin: '-15% 0px -75% 0px' })
  targets.forEach(t => io.observe(t))
</script>
</body>
</html>`
}

// ── server ───────────────────────────────────────────────────────────────────

const clients = new Set()

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return
      return new Response('WebSocket only', { status: 400 })
    }

    // Kitchen sink — build fresh on every request
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(buildPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Static files from project/
    const file = Bun.file(join(PROJECT, url.pathname))
    return new Response(file)
  },
  websocket: {
    open(ws)    { clients.add(ws) },
    close(ws)   { clients.delete(ws) },
    message()   {}
  }
})

// ── file watcher ─────────────────────────────────────────────────────────────

watch(PROJECT, { recursive: true }, () => {
  for (const ws of clients) ws.send('reload')
})

console.log(`\nEmotitone kitchen sink → http://localhost:${PORT}\n`)
