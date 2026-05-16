#!/usr/bin/env bun
import { readdirSync, readFileSync, watch } from 'fs'
import { join, basename } from 'path'

const PORT = 3000
const PROJECT = join(import.meta.dir, 'project')
const PREVIEW = join(PROJECT, 'preview')

const GROUPS = [
  { id: 'type',         label: 'Type',         prefixes: ['type-'] },
  { id: 'colors',       label: 'Colors',        prefixes: ['colors-'] },
  { id: 'spacing',      label: 'Spacing',       prefixes: ['spacing-'] },
  { id: 'brand',        label: 'Brand',         prefixes: ['brand-'] },
  { id: 'components',   label: 'Components',    prefixes: ['components-'] },
  { id: 'compositions', label: 'Compositions',  prefixes: ['composition-'] },
  { id: 'motion',       label: 'Motion',        prefixes: ['mot-', 'motion-'] },
  { id: 'principles',   label: 'Principles',    prefixes: ['principles'] },
]

// ── helpers ─────────────────────────────────────────────────────────────────

function cards() {
  return readdirSync(PREVIEW).filter(f => f.endsWith('.html') && f !== 'index.html').sort()
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
      .replace(/\bhtml\s*,\s*body\s*\{[^}]*\}/gi, '')
      .replace(/\bhtml\s*\{[^}]*\}/gi, '')
      .replace(/\bbody\s*\{[^}]*\}/gi, ''))
    .join('\n')
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
  return { raw, body }
}

function grouped() {
  const out = Object.fromEntries(GROUPS.map(g => [g.id, []]))
  for (const f of cards()) {
    for (const g of GROUPS) {
      if (g.prefixes.some(p => f.startsWith(p))) { out[g.id].push(f); break }
    }
  }
  return out
}

function shortLabel(f) {
  return basename(f, '.html')
}

// ── page builder ─────────────────────────────────────────────────────────────

function buildPage() {
  const byGroup = grouped()

  const navHtml = [
    `<div class="ng">Tokens</div>
     <a href="#tok-neutrals">Neutrals</a>
     <a href="#tok-brass">Brass</a>
     <a href="#tok-jazz">Jazz Accents</a>
     <a href="#tok-chromatic">Chromatic</a>
     <a href="#tok-type">Typography</a>
     <a href="#tok-spacing">Spacing</a>
     <a href="#tok-radii">Radii</a>
     <a href="#tok-motion">Motion</a>`,
    ...GROUPS.map(g => `
     <div class="ng">${g.label}</div>
     ${byGroup[g.id].map(f => `<a href="#card-${basename(f,'.html')}">${shortLabel(f)}</a>`).join('\n')}`),
    `<div class="ng">Assets</div>
     <a href="#assets">Images</a>
     <div class="ng">UI Kit</div>
     <a href="#mobile-kit">Mobile</a>`
  ].join('\n')

  const cardSections = GROUPS.map(g => {
    const cardHtml = byGroup[g.id].map(f => {
      const { raw, body } = extract(f)
      const id = `card-${basename(f, '.html')}`
      const styles = raw ? scopeStyles(raw, id) : ''
      return `<div class="specimen" id="${id}">
        <div class="specimen-label">${shortLabel(f)}</div>
        ${styles ? `<style>${styles}</style>` : ''}
        <div class="specimen-body">${body}</div>
      </div>`
    }).join('\n')
    return `<section class="group" id="group-${g.id}">
      <h2 class="group-header">${g.label}</h2>
      ${cardHtml}
    </section>`
  }).join('\n')

  const assetFiles = readdirSync(join(PROJECT, 'assets')).filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f))
  const assetGrid = assetFiles.map(f =>
    `<div class="asset-card">
       <img src="/assets/${f}" alt="${f}">
       <div class="asset-name">${f}</div>
     </div>`
  ).join('\n')

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

    /* tokens */
    .tok-section { margin-bottom: 48px; }
    .tok-sub {
      font: var(--t-label);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--fg-3);
      margin: 24px 0 10px;
      scroll-margin-top: 24px;
    }
    .tok-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 6px;
    }
    .swatch {
      border-radius: var(--r-sm);
      overflow: hidden;
      box-shadow: var(--ring);
      /* override _card.css fixed 56×56 sizing */
      width: 100%;
      height: auto;
      flex-shrink: 1;
    }
    .swatch-block { height: 44px; }
    .swatch-meta { padding: 5px 8px; background: var(--ink-3); }
    .swatch-name { font: var(--t-caption); color: var(--fg-2); }
    .swatch-val  { font: var(--t-caption); color: var(--fg-3); font-size: 10px; }

    .type-row {
      padding: 9px 0;
      border-bottom: 1px solid var(--hairline-2);
      display: flex;
      align-items: baseline;
      gap: 16px;
    }
    .type-row:last-child { border: none; }
    .type-lbl { font: var(--t-caption); color: var(--fg-3); width: 110px; flex-shrink: 0; letter-spacing: var(--tracking-label); text-transform: uppercase; }

    .sp-row { display: flex; align-items: center; gap: 10px; padding: 3px 0; }
    .sp-bar  { background: var(--ink-5); height: 12px; border-radius: 2px; }
    .sp-lbl  { font: var(--t-caption); color: var(--fg-3); width: 52px; flex-shrink: 0; }
    .sp-val  { font: var(--t-caption); color: var(--fg-2); }

    .radii-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
    .radius-block { display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .radius-box { width: 48px; height: 48px; background: var(--ink-4); box-shadow: var(--ring); }
    .radius-lbl { font: var(--t-caption); color: var(--fg-3); text-align: center; }

    .easing-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
    .easing-demo { background: var(--ink-3); border-radius: var(--r-sm); box-shadow: var(--ring); padding: 12px; }
    .easing-name { font: var(--t-caption); color: var(--fg-3); letter-spacing: var(--tracking-label); text-transform: uppercase; margin-bottom: 8px; }
    .easing-track { height: 28px; background: var(--ink-2); border-radius: var(--r-xs); position: relative; overflow: hidden; }
    .easing-ball { position: absolute; left: 4px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; background: var(--brass); border-radius: var(--r-xs); transition: left var(--dur-panel); }
    .easing-demo:hover .easing-ball { left: calc(100% - 24px); }
    .easing-demo[data-ease="swing"]   .easing-ball { transition-timing-function: var(--ease-swing); }
    .easing-demo[data-ease="stab"]    .easing-ball { transition-timing-function: var(--ease-stab); }
    .easing-demo[data-ease="brush"]   .easing-ball { transition-timing-function: var(--ease-brush); }
    .easing-demo[data-ease="sustain"] .easing-ball { transition-timing-function: var(--ease-sustain); }
    .easing-demo[data-ease="bend"]    .easing-ball { transition-timing-function: var(--ease-bend); }
    .easing-demo[data-ease="paper"]   .easing-ball { transition-timing-function: var(--ease-paper); }

    .beat-demo { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
    .beat-box { width: 36px; height: 36px; background: var(--ink-4); border-radius: var(--r-xs); box-shadow: var(--ring); animation: beat var(--beat) var(--ease-cut) infinite; }

    /* group sections */
    .group { margin-bottom: 56px; }
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
    /* make .card inside specimens play nice — remove its own border-radius/shadow since the wrapper handles that */
    .specimen-body .card {
      border-radius: 0;
      box-shadow: none;
      width: 100%;
    }

    /* inner box for token sections */
    .tok-box {
      background: var(--ink-3);
      border-radius: var(--r-sm);
      box-shadow: var(--ring);
      padding: 18px 22px;
    }

    /* assets */
    .assets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .asset-card { background: var(--ink-3); border-radius: var(--r-sm); box-shadow: var(--ring); overflow: hidden; }
    .asset-card img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .asset-name { font: var(--t-caption); color: var(--fg-3); padding: 7px 10px; }

    /* mobile kit */
    .mobile-wrap { display: inline-block; background: var(--ink-3); padding: 14px; border-radius: calc(var(--r-xl) + 14px); box-shadow: var(--ring); }
    #mobile-frame { display: block; width: 390px; height: 844px; border: none; border-radius: var(--r-xl); overflow: hidden; }
  </style>
</head>
<body>

<aside id="sidebar">
  <div id="sidebar-head">
    <div class="wm">Emotitone</div>
    <div class="sub">kitchen sink</div>
  </div>
  <nav>${navHtml}</nav>
</aside>

<main id="main">

  <!-- TOKENS ─────────────────────────────── -->
  <div class="tok-section">
    <h2 class="group-header" id="tokens">Tokens</h2>

    <div class="tok-sub" id="tok-neutrals">Neutrals</div>
    <div class="tok-grid">
      <div class="swatch"><div class="swatch-block" style="background:var(--ink)"></div><div class="swatch-meta"><div class="swatch-name">--ink</div><div class="swatch-val">#0A0908</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ink-2)"></div><div class="swatch-meta"><div class="swatch-name">--ink-2</div><div class="swatch-val">#141210</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ink-3)"></div><div class="swatch-meta"><div class="swatch-name">--ink-3</div><div class="swatch-val">#1B1815</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ink-4)"></div><div class="swatch-meta"><div class="swatch-name">--ink-4</div><div class="swatch-val">#25211D</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ink-5)"></div><div class="swatch-meta"><div class="swatch-name">--ink-5</div><div class="swatch-val">#3A352F</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ivory)"></div><div class="swatch-meta"><div class="swatch-name">--ivory</div><div class="swatch-val">#F4EFE6</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ivory-2)"></div><div class="swatch-meta"><div class="swatch-name">--ivory-2</div><div class="swatch-val">#C9C2B5</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ivory-3)"></div><div class="swatch-meta"><div class="swatch-name">--ivory-3</div><div class="swatch-val">#8E867A</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--ivory-4)"></div><div class="swatch-meta"><div class="swatch-name">--ivory-4</div><div class="swatch-val">#514B42</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--glass)"></div><div class="swatch-meta"><div class="swatch-name">--glass</div><div class="swatch-val">rgba(20,20,20,.72)</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--scrim)"></div><div class="swatch-meta"><div class="swatch-name">--scrim</div><div class="swatch-val">rgba(0,0,0,.55)</div></div></div>
    </div>

    <div class="tok-sub" id="tok-brass">Brass</div>
    <div class="tok-grid">
      <div class="swatch"><div class="swatch-block" style="background:var(--brass)"></div><div class="swatch-meta"><div class="swatch-name">--brass</div><div class="swatch-val">#e0a93a</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--brass-hi)"></div><div class="swatch-meta"><div class="swatch-name">--brass-hi</div><div class="swatch-val">#f5d278</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--brass-lo)"></div><div class="swatch-meta"><div class="swatch-name">--brass-lo</div><div class="swatch-val">#c89230</div></div></div>
      <div class="swatch"><div class="swatch-block brass"></div><div class="swatch-meta"><div class="swatch-name">.brass</div><div class="swatch-val">gradient + sheen</div></div></div>
    </div>

    <div class="tok-sub" id="tok-jazz">Jazz Accents</div>
    <div class="tok-grid">
      <div class="swatch"><div class="swatch-block" style="background:var(--tomato)"></div><div class="swatch-meta"><div class="swatch-name">--tomato</div><div class="swatch-val">#d8362a</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--saffron)"></div><div class="swatch-meta"><div class="swatch-name">--saffron</div><div class="swatch-val">#f0b137</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--plum)"></div><div class="swatch-meta"><div class="swatch-name">--plum</div><div class="swatch-val">#6b3fa0</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--grape)"></div><div class="swatch-meta"><div class="swatch-name">--grape</div><div class="swatch-val">#4b1e78</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--coral)"></div><div class="swatch-meta"><div class="swatch-name">--coral</div><div class="swatch-val">#e96a4a</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--pine)"></div><div class="swatch-meta"><div class="swatch-name">--pine</div><div class="swatch-val">#1f4d3f</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--bone)"></div><div class="swatch-meta"><div class="swatch-name">--bone</div><div class="swatch-val">#efe6d0</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--paper)"></div><div class="swatch-meta"><div class="swatch-name">--paper</div><div class="swatch-val">#f1e9d8</div></div></div>
    </div>

    <div class="tok-sub" id="tok-chromatic">Chromatic Notes</div>
    <div class="tok-grid">
      <div class="swatch"><div class="swatch-block" style="background:var(--note-do)"></div><div class="swatch-meta"><div class="swatch-name">--note-do</div><div class="swatch-val">C · orange</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-ra)"></div><div class="swatch-meta"><div class="swatch-name">--note-ra</div><div class="swatch-val">C# · gold</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-re)"></div><div class="swatch-meta"><div class="swatch-name">--note-re</div><div class="swatch-val">D · lime</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-me)"></div><div class="swatch-meta"><div class="swatch-name">--note-me</div><div class="swatch-val">D# · green</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-mi)"></div><div class="swatch-meta"><div class="swatch-name">--note-mi</div><div class="swatch-val">E · emerald</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-fa)"></div><div class="swatch-meta"><div class="swatch-name">--note-fa</div><div class="swatch-val">F · cyan</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-fi)"></div><div class="swatch-meta"><div class="swatch-name">--note-fi</div><div class="swatch-val">F# · sky</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-se)"></div><div class="swatch-meta"><div class="swatch-name">--note-se</div><div class="swatch-val">G♭ · indigo</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-sol)"></div><div class="swatch-meta"><div class="swatch-name">--note-sol</div><div class="swatch-val">G · violet</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-le)"></div><div class="swatch-meta"><div class="swatch-name">--note-le</div><div class="swatch-val">G# · magenta</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-la)"></div><div class="swatch-meta"><div class="swatch-name">--note-la</div><div class="swatch-val">A · pink</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-te)"></div><div class="swatch-meta"><div class="swatch-name">--note-te</div><div class="swatch-val">A# · rose</div></div></div>
      <div class="swatch"><div class="swatch-block" style="background:var(--note-ti)"></div><div class="swatch-meta"><div class="swatch-name">--note-ti</div><div class="swatch-val">B · coral</div></div></div>
    </div>

    <div class="tok-sub" id="tok-type">Typography</div>
    <div class="tok-box">
      <div class="type-row"><span class="type-lbl">display-xl</span><span style="font:var(--t-display-xl);letter-spacing:var(--tracking-display);text-transform:uppercase">Emotitone</span></div>
      <div class="type-row"><span class="type-lbl">display-l</span><span style="font:var(--t-display-l);letter-spacing:var(--tracking-display);text-transform:uppercase">Jazz is Feeling</span></div>
      <div class="type-row"><span class="type-lbl">display-m</span><span style="font:var(--t-display-m);letter-spacing:var(--tracking-display);text-transform:uppercase">Play. Learn. Emote.</span></div>
      <div class="type-row"><span class="type-lbl">h1</span><span style="font:var(--t-h1);letter-spacing:var(--tracking-display);text-transform:uppercase">C Major · 3 · 7d left</span></div>
      <div class="type-row"><span class="type-lbl">h2</span><span style="font:var(--t-h2);letter-spacing:var(--tracking-display);text-transform:uppercase">Soft Glass Preset</span></div>
      <div class="type-row"><span class="type-lbl">label</span><span style="font:var(--t-label);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--fg-3)">sound · all sounds · 992</span></div>
      <div class="type-row"><span class="type-lbl">body</span><span style="font:var(--t-body)">piano · c major · 3 · 7d left</span></div>
      <div class="type-row"><span class="type-lbl">body-s</span><span style="font:var(--t-body-s);color:var(--fg-2)">contrabass, clavinet, music box</span></div>
      <div class="type-row"><span class="type-lbl">mono</span><span style="font:var(--t-mono);color:var(--fg-3)">&#60; { Do@0.282 ~@0.041 Ra } &#62;</span></div>
    </div>

    <div class="tok-sub" id="tok-spacing">Spacing</div>
    <div class="tok-box" style="display:flex;flex-direction:column;gap:5px;">
      <div class="sp-row"><span class="sp-lbl">--s-1</span><div class="sp-bar" style="width:2px"></div><span class="sp-val">2px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-2</span><div class="sp-bar" style="width:4px"></div><span class="sp-val">4px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-3</span><div class="sp-bar" style="width:6px"></div><span class="sp-val">6px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-4</span><div class="sp-bar" style="width:8px"></div><span class="sp-val">8px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-5</span><div class="sp-bar" style="width:12px"></div><span class="sp-val">12px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-6</span><div class="sp-bar" style="width:16px"></div><span class="sp-val">16px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-7</span><div class="sp-bar" style="width:20px"></div><span class="sp-val">20px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-8</span><div class="sp-bar" style="width:24px"></div><span class="sp-val">24px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-9</span><div class="sp-bar" style="width:32px"></div><span class="sp-val">32px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-10</span><div class="sp-bar" style="width:48px"></div><span class="sp-val">48px</span></div>
      <div class="sp-row"><span class="sp-lbl">--s-11</span><div class="sp-bar" style="width:64px"></div><span class="sp-val">64px</span></div>
    </div>

    <div class="tok-sub" id="tok-radii">Radii</div>
    <div class="tok-box">
      <div class="radii-row">
        <div class="radius-block"><div class="radius-box" style="border-radius:0"></div><div class="radius-lbl">0<br><span style="color:var(--fg-3)">poster</span></div></div>
        <div class="radius-block"><div class="radius-box" style="border-radius:var(--r-xs)"></div><div class="radius-lbl">--r-xs<br><span style="color:var(--fg-3)">4px</span></div></div>
        <div class="radius-block"><div class="radius-box" style="border-radius:var(--r-sm)"></div><div class="radius-lbl">--r-sm<br><span style="color:var(--fg-3)">8px</span></div></div>
        <div class="radius-block"><div class="radius-box" style="border-radius:var(--r-md)"></div><div class="radius-lbl">--r-md<br><span style="color:var(--fg-3)">14px</span></div></div>
        <div class="radius-block"><div class="radius-box" style="border-radius:var(--r-lg)"></div><div class="radius-lbl">--r-lg<br><span style="color:var(--fg-3)">18px</span></div></div>
        <div class="radius-block"><div class="radius-box" style="border-radius:var(--r-xl)"></div><div class="radius-lbl">--r-xl<br><span style="color:var(--fg-3)">24px</span></div></div>
        <div class="radius-block"><div class="radius-box" style="border-radius:var(--r-pill)"></div><div class="radius-lbl">--r-pill<br><span style="color:var(--fg-3)">999px</span></div></div>
      </div>
    </div>

    <div class="tok-sub" id="tok-motion">Motion — Easings (hover to animate)</div>
    <div class="easing-grid">
      <div class="easing-demo" data-ease="swing"><div class="easing-name">--ease-swing</div><div class="easing-track"><div class="easing-ball"></div></div></div>
      <div class="easing-demo" data-ease="stab"><div class="easing-name">--ease-stab</div><div class="easing-track"><div class="easing-ball"></div></div></div>
      <div class="easing-demo" data-ease="brush"><div class="easing-name">--ease-brush</div><div class="easing-track"><div class="easing-ball"></div></div></div>
      <div class="easing-demo" data-ease="sustain"><div class="easing-name">--ease-sustain</div><div class="easing-track"><div class="easing-ball"></div></div></div>
      <div class="easing-demo" data-ease="bend"><div class="easing-name">--ease-bend</div><div class="easing-track"><div class="easing-ball"></div></div></div>
      <div class="easing-demo" data-ease="paper"><div class="easing-name">--ease-paper</div><div class="easing-track"><div class="easing-ball"></div></div></div>
    </div>
    <div class="beat-demo">
      <div class="beat-box"></div>
      <span style="font:var(--t-caption);color:var(--fg-3)">--beat: 500ms · .beat-pulse</span>
    </div>
  </div>

  <!-- CARD SECTIONS ──────────────────────── -->
  ${cardSections}

  <!-- ASSETS ─────────────────────────────── -->
  <section class="group" id="assets">
    <h2 class="group-header">Reference Assets</h2>
    <div class="assets-grid">${assetGrid}</div>
  </section>

  <!-- MOBILE KIT ─────────────────────────── -->
  <section class="group" id="mobile-kit">
    <h2 class="group-header">Mobile UI Kit</h2>
    <div class="mobile-wrap">
      <iframe id="mobile-frame" src="/ui_kits/mobile/index.html"></iframe>
    </div>
  </section>

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
