#!/usr/bin/env bun
import { readdirSync, readFileSync, watch } from 'fs'
import { join, basename } from 'path'

const PORT = 3000
const PROJECT = join(import.meta.dir, 'project')
const PREVIEW = join(PROJECT, 'preview')

// ── schema: four-tier model (TOKEN → PRIMITIVE → COMPOUND → UNIQUE → COMPOSITION)
// inlined here so sink is self-contained. one source of truth for tier+family+blurb.
const LAYER_ORDER = ['TOKEN', 'PRIMITIVE', 'COMPOUND', 'UNIQUE', 'COMPOSITION']
const LAYER_LABELS = {
  TOKEN: 'Tokens',
  PRIMITIVE: 'Primitives',
  COMPOUND: 'Compounds',
  UNIQUE: 'Unique Specimens',
  COMPOSITION: 'Compositions',
}

// Filename convention: <tier>-<name>.html — the tier prefix IS the source of truth.
// Renaming a card to a new tier means moving it in this list AND on disk.
const GROUPS = [
  { layer: 'TOKEN', family: 'color', title: 'Tokens · Color', cards: [
    { file: 'token-ui-colors.html',    name: 'UI Colors',    blurb: 'Chrome token set — neutrals + the one lit signal.' },
    { file: 'token-brand-colors.html', name: 'Brand Colors', blurb: 'Five flat fills for poster, sticker, and brand use only.' },
    { file: 'token-music-colors.html', name: 'Music Colors', blurb: 'Interactive OKLCH music color recipe for chromatic feedback.' },
  ]},
  { layer: 'TOKEN', family: 'typography', title: 'Tokens · Typography', cards: [
    { file: 'token-typography.html', name: 'Typography', blurb: 'Typeface samples, type ramp, tracking, and usage rules.' },
  ]},
  { layer: 'TOKEN', family: 'geometry', title: 'Tokens · Geometry', cards: [
    { file: 'token-spacing-scale.html',  name: 'Spacing Scale',   blurb: 'Eleven-step spacing scale from 2px to 64px.' },
    { file: 'token-spacing-radius.html', name: 'Radii',           blurb: 'Radius tokens from XS through XL plus pill.' },
    { file: 'token-geometry.html',       name: 'Geometry Tokens', blurb: 'Clip-paths, transforms, shadows, and stroke caps as named recipes.' },
  ]},
  { layer: 'TOKEN', family: 'motion', title: 'Tokens · Motion', cards: [
    { file: 'token-motion.html', name: 'Motion', blurb: 'Beat, durations, easings, and named keyframes in one card.' },
  ]},

  { layer: 'PRIMITIVE', family: 'decoration', title: 'Primitives · Decoration', cards: [
    { file: 'primitive-kicker.html', name: 'Kicker', blurb: 'Colored square plus mono all-caps scope label.' },
    { file: 'primitive-marks.html',  name: 'Marks',  blurb: 'Two mark families — structural and notational.' },
    { file: 'primitive-badge.html',  name: 'Badge',  blurb: 'Lets Jazz wordmark in a sharp wire box.' },
  ]},
  { layer: 'PRIMITIVE', family: 'keys', title: 'Primitives · Keys', cards: [
    { file: 'primitive-keys.html', name: 'Keyboard Keys', blurb: 'Diatonic cut-paper key clips for the main octave.' },
  ]},
  { layer: 'PRIMITIVE', family: 'buttons', title: 'Primitives · Buttons', cards: [
    { file: 'primitive-buttons.html', name: 'Icon Buttons', blurb: 'Icon button system — roles and sizes.' },
  ]},
  { layer: 'PRIMITIVE', family: 'knobs', title: 'Primitives · Knobs', cards: [
    { file: 'primitive-knobs-digital.html', name: 'Knobs · Digital', blurb: 'Arc / flat indicators — range, boolean, options, button. UI tokens only.' },
    { file: 'primitive-knobs-analog.html',  name: 'Knobs · Analog',  blurb: 'Seated ring indicators with conic sweep — range, boolean, options, button.' },
  ]},
  { layer: 'PRIMITIVE', family: 'tabs', title: 'Primitives · Tabs', cards: [
    { file: 'primitive-tabs.html', name: 'Off-cut Tabs', blurb: 'Skewed ivory active tab with hard paper geometry.' },
  ]},
  { layer: 'PRIMITIVE', family: 'card-shell', title: 'Primitives · Card Shell', cards: [
    { file: 'primitive-card.html',       name: 'Card',       blurb: 'Fundamental card shell — panel, floating label, decoration-mark slot, title, body.' },
    { file: 'primitive-spine-card.html', name: 'Spine Card', blurb: 'Brand-marked card shell — ink-2 panel, colored spine, dot kicker, jazz stamp. Preset-row variant included.' },
  ]},
  { layer: 'PRIMITIVE', family: 'beat-indicator', title: 'Primitives · Beat Indicator', cards: [
    { file: 'primitive-beat-indicator.html', name: 'Beat Indicator', blurb: 'N-cell row that ticks the bar; downbeat strobes brass.' },
  ]},
  { layer: 'PRIMITIVE', family: 'strips', title: 'Primitives · Strips', cards: [
    { file: 'primitive-bar-tape.html', name: 'Bar Tape', blurb: 'Chromatic 7-segment tape — music-feedback strip.' },
  ]},

  { layer: 'COMPOUND', family: 'pattern-card', title: 'Compounds · Pattern Card', cards: [
    { file: 'compound-pattern-card.html', name: 'Pattern Card', blurb: 'Two shapes — sleek (collapsed, bar-tape footer) and expanded (code-strip, no bar-tape).' },
    { file: 'compound-pattern-reel.html', name: 'Pattern Reel', blurb: 'Stacked deck with click-to-promote active pattern interaction.' },
  ]},

  { layer: 'UNIQUE', family: 'brand', title: 'Unique Specimens · Brand', cards: [
    { file: 'unique-brand-logo.html', name: 'Brand Logo', blurb: 'Emotitone wordmark with solfège subtitle and note glyphs.' },
  ]},
  { layer: 'UNIQUE', family: 'hero', title: 'Unique Specimens · Hero', cards: [
    { file: 'unique-brand-cover.html', name: 'Brand Cover', blurb: 'Brand hero composition.' },
  ]},
  { layer: 'UNIQUE', family: 'code-strip', title: 'Unique Specimens · Code Strip', cards: [
    { file: 'unique-code-strip.html', name: 'Code Strip', blurb: 'Strudel notation row — solfege / degree / raw-note glyphs with duration encoding.' },
  ]},
  { layer: 'UNIQUE', family: 'drawer', title: 'Unique Specimens · Drawer', cards: [
    { file: 'unique-drawer.html', name: 'Drawer', blurb: 'Sliding panel — top and bottom anchors, drag-to-resize handle, snap to closed / designed / full.' },
  ]},

  { layer: 'COMPOSITION', family: 'loading-screen', title: 'Compositions · Loading Screen', cards: [
    { file: 'composition-loading-screen.html', name: 'Loading Screen', blurb: 'App loading screen.' },
  ]},
  { layer: 'COMPOSITION', family: 'top-drawer', title: 'Compositions · Top Drawer', cards: [
    { file: 'composition-top-drawer.html', name: 'Top Drawer', blurb: 'Top drawer — three modes, one ceiling. Instrument picker + visual config.' },
  ]},
]

// ── helpers

function scopeStyles(css, id) {
  const safeId = id.replace(/[^a-z0-9]/gi, '-')
  const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1])
  for (const name of names) {
    const prefixed = `${safeId}__${name}`
    css = css
      .replace(new RegExp(`@keyframes\\s+${name}(?=[\\s{])`, 'g'), `@keyframes ${prefixed}`)
      .replace(new RegExp(`(animation-name\\s*:[^;]*)\\b${name}\\b`, 'g'), `$1${prefixed}`)
      .replace(new RegExp(`(animation\\s*:[^;]*)\\b${name}\\b`, 'g'), `$1${prefixed}`)
  }
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
      .replace(/(?:^|(?<=[}\n]))\s*html\s*,\s*body\s*\{[^}]*\}/gi, '')
      .replace(/(?:^|(?<=[}\n]))\s*html\s*\{[^}]*\}/gi, '')
      .replace(/(?:^|(?<=[}\n]))\s*body\s*\{[^}]*\}/gi, ''))
    .join('\n')
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
  return { raw, body }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function anchorId(...parts) {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── page builder

function buildPage() {
  const onDisk = new Set(readdirSync(PREVIEW).filter(f => f.endsWith('.html') && f !== 'index.html'))
  const mapped = new Set(GROUPS.flatMap(g => g.cards.map(c => c.file)))
  const ungrouped = [...onDisk].filter(f => !mapped.has(f)).sort()

  const cardCount = GROUPS.reduce((s, g) => s + g.cards.length, 0)
  const layerStats = Object.fromEntries(LAYER_ORDER.map(l => [l, 0]))
  for (const g of GROUPS) layerStats[g.layer] += g.cards.length

  const renderCard = (card, num, total) => {
    const id = `card-${basename(card.file, '.html')}`
    if (!onDisk.has(card.file)) {
      return `<div class="specimen missing" id="${id}">
        <div class="specimen-head"><span class="card-num">${num}/${total}</span><span class="specimen-label">${escapeHtml(card.name)}</span></div>
        <div class="card-missing">file not found in preview/ — was it deleted?</div>
      </div>`
    }
    const { raw, body } = extract(card.file)
    const styles = raw ? scopeStyles(raw, id) : ''
    const blurb = card.blurb ? `<div class="card-blurb">${escapeHtml(card.blurb)}</div>` : ''
    return `<div class="specimen" id="${id}">
      <div class="specimen-head"><span class="card-num">${num}/${total}</span><span class="specimen-label">${escapeHtml(card.name)}</span></div>
      ${blurb}
      ${styles ? `<style>${styles}</style>` : ''}
      <div class="specimen-body">${body}</div>
    </div>`
  }

  const groupSection = g => {
    const cards = g.cards.map((c, i) => renderCard(c, i + 1, g.cards.length)).join('\n')
    const familyHeading = (g.title || '').replace(/^[^·]+·\s*/, '').trim() || g.family
    return `<section class="group" id="group-${anchorId(g.layer, g.family)}">
      <div class="group-header"><h2>${escapeHtml(familyHeading)}</h2></div>
      ${cards}
    </section>`
  }

  const layerSections = LAYER_ORDER.map(layer => {
    const layerGroups = GROUPS.filter(g => g.layer === layer)
    if (!layerGroups.length) return ''
    return `<section class="layer-section" id="layer-${anchorId(layer)}">
      <div class="layer-header"><h1>${escapeHtml(LAYER_LABELS[layer])}</h1><span class="layer-count">${layerStats[layer]} cards</span></div>
      ${layerGroups.map(groupSection).join('\n')}
    </section>`
  }).join('\n')

  const ungroupedSection = ungrouped.length === 0 ? '' : `
    <section class="layer-section" id="layer-ungrouped">
      <div class="layer-header"><h1>Ungrouped</h1><span class="layer-count">${ungrouped.length} cards</span></div>
      <div class="card-blurb" style="padding:6px 0;">Preview files on disk not mapped in GROUPS (top of sink.js).</div>
      ${ungrouped.map((f, i) => renderCard({ file: f, name: basename(f, '.html'), blurb: '' }, i + 1, ungrouped.length)).join('\n')}
    </section>`

  const navHtml = LAYER_ORDER.map(layer => {
    const layerGroups = GROUPS.filter(g => g.layer === layer)
    if (!layerGroups.length) return ''
    return `<a class="ng ng-link" href="#layer-${anchorId(layer)}">${LAYER_LABELS[layer]}</a>
      ${layerGroups.map(g => {
        const familyTitle = (g.title || '').replace(/^[^·]+·\s*/, '').trim() || g.family
        return `<a href="#group-${anchorId(g.layer, g.family)}">${escapeHtml(familyTitle)}</a>`
      }).join('\n')}`
  }).join('\n') + (ungrouped.length ? `<a class="ng ng-link" href="#layer-ungrouped">Ungrouped (${ungrouped.length})</a>` : '')

  return /* html */`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><title>Emotitone · Sink</title>
<link rel="stylesheet" href="/preview/_card.css">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{display:flex;height:100vh;overflow:hidden;background:var(--ink);color:var(--fg);font:var(--t-body)}
#sidebar{width:220px;flex-shrink:0;height:100vh;overflow-y:auto;background:var(--ink-2);border-right:1px solid var(--hairline);scrollbar-width:thin;scrollbar-color:var(--ink-5) transparent}
#sidebar-head{padding:16px 14px 12px;border-bottom:1px solid var(--hairline);position:sticky;top:0;background:var(--ink-2);z-index:10}
#sidebar-head .wm{font:var(--t-h1);letter-spacing:var(--tracking-display);text-transform:uppercase}
#sidebar-head .sub{font:var(--t-caption);color:var(--fg-3);margin-top:2px}
.stats-strip{display:flex;gap:4px;padding:8px 14px 12px;border-bottom:1px solid var(--hairline);flex-wrap:wrap}
.stat{font:var(--t-caption);font-size:10px;letter-spacing:0.06em;padding:2px 6px;border-radius:2px;background:var(--ink-3);color:var(--ivory-3)}
nav{padding:6px 0 32px}
.ng{font:var(--t-caption);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--fg-3);padding:12px 14px 3px}
a.ng-link{display:block;text-decoration:none;cursor:pointer}
a.ng-link:hover{color:var(--ivory)}
nav a:not(.ng){display:block;padding:4px 14px 4px 18px;font:var(--t-caption);color:var(--fg-2);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:2px solid transparent;transition:color 80ms,background 80ms}
nav a:not(.ng):hover{color:var(--fg);background:var(--ink-3)}
nav a.active{color:var(--brass);border-left-color:var(--brass)}
#main{flex:1;height:100vh;overflow-y:auto;padding:32px 36px 80px;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--ink-5) transparent}
.layer-section{margin-bottom:72px;scroll-margin-top:16px}
.layer-header{display:flex;align-items:baseline;gap:14px;padding-bottom:14px;margin-bottom:24px;border-bottom:1px solid var(--hairline);scroll-margin-top:16px}
.layer-header h1{font:var(--t-display-l);letter-spacing:var(--tracking-display);text-transform:uppercase;color:var(--fg)}
.layer-count{font:var(--t-caption);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ivory-3)}
.group{margin-bottom:48px}
.group-header{font:var(--t-h1);letter-spacing:var(--tracking-display);text-transform:uppercase;color:var(--fg);padding-bottom:10px;border-bottom:1px solid var(--hairline);margin-bottom:20px;scroll-margin-top:16px}
.specimen{margin-bottom:16px;background:var(--ink-2);border-radius:var(--r-md);box-shadow:var(--ring);overflow:hidden;scroll-margin-top:16px}
.specimen-head{display:flex;align-items:center;gap:10px;padding:7px 14px;background:var(--ink-3);border-bottom:1px solid var(--hairline)}
.card-num{font:var(--t-caption);font-size:11px;color:var(--ivory-3);background:var(--ink);padding:2px 7px;border-radius:2px;letter-spacing:0.04em;font-weight:600}
.specimen-label{font:var(--t-caption);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--fg-3);flex:1}
.card-blurb{font:var(--t-caption);color:var(--ivory-3);padding:6px 14px;background:var(--ink-3);border-bottom:1px solid var(--hairline)}
.specimen-body{padding:0}
.specimen-body .card{border-radius:0;box-shadow:none;width:100%}
.specimen.missing{opacity:0.5}
.card-missing{padding:24px;text-align:center;color:var(--tomato);font:var(--t-caption);letter-spacing:0.12em}
</style></head><body>
<aside id="sidebar">
  <div id="sidebar-head"><div class="wm">Emotitone</div><div class="sub">layer/family sink</div></div>
  <div class="stats-strip">
    <span class="stat">${cardCount} cards</span>
    <span class="stat">${GROUPS.length} groups</span>
    <span class="stat">${LAYER_ORDER.filter(l => layerStats[l] > 0).length} layers</span>
  </div>
  <nav>${navHtml}</nav>
</aside>
<main id="main">${layerSections}${ungroupedSection}</main>
<script>
function connect(){const ws=new WebSocket('ws://'+location.host+'/ws');ws.onmessage=()=>location.reload();ws.onclose=()=>setTimeout(connect,1000)}
connect();
const links=document.querySelectorAll('nav a');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.remove('active'));const a=document.querySelector('nav a[href="#'+e.target.id+'"]');if(a){a.classList.add('active');a.scrollIntoView({block:'nearest'})}}}),{rootMargin:'-15% 0px -75% 0px'});
document.querySelectorAll('[id]').forEach(t=>io.observe(t));
</script></body></html>`
}

// ── server

const clients = new Set()

Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return
      return new Response('WebSocket only', { status: 400 })
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(buildPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }
    return new Response(Bun.file(join(PROJECT, url.pathname)))
  },
  websocket: {
    open(ws)  { clients.add(ws) },
    close(ws) { clients.delete(ws) },
    message() {},
  },
})

watch(PROJECT, { recursive: true }, () => {
  for (const ws of clients) ws.send('reload')
})

console.log(`\nEmotitone sink → http://localhost:${PORT}\n`)
