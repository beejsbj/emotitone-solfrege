#!/usr/bin/env bun
import { readdirSync, readFileSync, watch } from 'fs'
import { join, basename } from 'path'

const PORT = 3000
const PROJECT = join(import.meta.dir, 'project')
const PREVIEW = join(PROJECT, 'preview')

const GROUP_ORDER = ['tokens', 'spacing', 'components', 'brand', 'composition', 'other']
const GROUP_LABELS = {
  tokens: 'Tokens',
  spacing: 'Spacing',
  components: 'Components',
  brand: 'Brand',
  composition: 'Compositions',
  other: 'Other',
}

function groupOf(filename) {
  const name = basename(filename, '.html')
  for (const prefix of GROUP_ORDER) {
    if (name.startsWith(prefix + '-') || name === prefix) return prefix
  }
  return 'other'
}

function cards() {
  return readdirSync(PREVIEW)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .sort()
}

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

function buildPage() {
  const all = cards()
  const byGroup = Object.fromEntries(GROUP_ORDER.map(g => [g, []]))
  for (const f of all) byGroup[groupOf(f)].push(f)

  const renderCard = (file) => {
    const id = `card-${basename(file, '.html')}`
    const { raw, body } = extract(file)
    const styles = raw ? scopeStyles(raw, id) : ''
    return `<div class="specimen" id="${id}">
      <div class="specimen-head"><span class="specimen-label">${escapeHtml(basename(file, '.html'))}</span></div>
      ${styles ? `<style>${styles}</style>` : ''}
      <div class="specimen-body">${body}</div>
    </div>`
  }

  const sections = GROUP_ORDER.filter(g => byGroup[g].length > 0).map(g => `
    <section class="group" id="group-${g}">
      <div class="group-header"><h1>${GROUP_LABELS[g]}</h1><span class="count">${byGroup[g].length}</span></div>
      ${byGroup[g].map(renderCard).join('\n')}
    </section>`).join('\n')

  const nav = GROUP_ORDER.filter(g => byGroup[g].length > 0).map(g => `
    <a class="ng" href="#group-${g}">${GROUP_LABELS[g]}</a>
    ${byGroup[g].map(f => `<a href="#card-${basename(f, '.html')}">${escapeHtml(basename(f, '.html'))}</a>`).join('\n')}
  `).join('\n')

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
nav{padding:6px 0 32px}
.ng{display:block;padding:12px 14px 3px;font:var(--t-caption);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--fg-3);text-decoration:none}
.ng:hover{color:var(--ivory)}
nav a:not(.ng){display:block;padding:4px 14px 4px 18px;font:var(--t-caption);color:var(--fg-2);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:2px solid transparent;transition:color 80ms,background 80ms}
nav a:not(.ng):hover{color:var(--fg);background:var(--ink-3)}
nav a.active{color:var(--brass);border-left-color:var(--brass)}
#main{flex:1;height:100vh;overflow-y:auto;padding:32px 36px 80px;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--ink-5) transparent}
.group{margin-bottom:72px;scroll-margin-top:16px}
.group-header{display:flex;align-items:baseline;gap:14px;padding-bottom:14px;margin-bottom:24px;border-bottom:1px solid var(--hairline);scroll-margin-top:16px}
.group-header h1{font:var(--t-display-l);letter-spacing:var(--tracking-display);text-transform:uppercase;color:var(--fg)}
.count{font:var(--t-caption);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ivory-3)}
.specimen{margin-bottom:16px;background:var(--ink-2);border-radius:var(--r-md);box-shadow:var(--ring);overflow:hidden;scroll-margin-top:16px}
.specimen-head{padding:7px 14px;background:var(--ink-3);border-bottom:1px solid var(--hairline)}
.specimen-label{font:var(--t-caption);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--fg-3)}
.specimen-body{padding:0}
.specimen-body .card{border-radius:0;box-shadow:none;width:100%}
</style></head><body>
<aside id="sidebar">
  <div id="sidebar-head"><div class="wm">Emotitone</div><div class="sub">specimen sink</div></div>
  <nav>${nav}</nav>
</aside>
<main id="main">${sections}</main>
<script>
function connect(){const ws=new WebSocket('ws://'+location.host+'/ws');ws.onmessage=()=>location.reload();ws.onclose=()=>setTimeout(connect,1000)}
connect();
const links=document.querySelectorAll('nav a');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.remove('active'));const a=document.querySelector('nav a[href="#'+e.target.id+'"]');if(a){a.classList.add('active');a.scrollIntoView({block:'nearest'})}}}),{rootMargin:'-15% 0px -75% 0px'});
document.querySelectorAll('[id]').forEach(t=>io.observe(t));
</script></body></html>`
}

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
