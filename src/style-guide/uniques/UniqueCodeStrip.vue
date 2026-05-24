<template>
  <section class="preview-port preview-port--unique-code-strip">
    <div class="card">
      <div class="label">CODE STRIP · STRUDEL NOTATION ROW</div>

      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <!-- hero: canonical solfège display with duration stamps -->
        <div class="var-cell">
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="syl fa">Fa</span><span class="dur">@0.0398</span>
              <span class="rest">~</span>
              <span class="syl fa">Fa</span><span class="dur">@0.028</span>
              <span class="rest">~</span>
              <span class="syl la lit">La</span><span class="dur">@0.2031</span>
              <span class="rest">~</span>
              <span class="syl sol">Sol</span><span class="dur">@0.09</span>
            </div>
          </div>
        </div>

        <!-- anatomy spec table -->
        <div class="anatomy">
          <div class="row"><b>Row</b><div>ink-2 bg · 1px hairline · 36px min-h</div></div>
          <div class="row"><b>Chevron</b><div>mono 11px · ivory-4 · leading glyph</div></div>
          <div class="row"><b>Glyph</b><div>Jazz 16 · --note-* per syllable</div></div>
          <div class="row"><b>Duration</b><div>JBM 9 · ivory-3 · @N.NNNN</div></div>
          <div class="row"><b>Rest</b><div>~ · mono 11 · ivory-4 · gap between</div></div>
          <div class="row"><b>Brackets</b><div>{ } , · mono 11 · ivory-4 · group</div></div>
          <div class="row"><b>Lit glyph</b><div>text-shadow in own hue + 5px sq dot</div></div>
          <div class="row"><b>Color rule</b><div>--note-* on glyphs only · chrome = ivory</div></div>
        </div>
      </div>

      <div class="section-head">Variants</div>
      <div class="variants-full" style="grid-template-columns:1fr">

        <!-- Display mode: solfège -->
        <div class="var-cell">
          <div class="var-name">01 · Display: Solfège · Do Re Mi</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="syl do">Do</span><span class="dur">@0.282</span>
              <span class="rest">~</span>
              <span class="syl re">Re</span><span class="dur">@0.128</span>
              <span class="rest">~</span>
              <span class="syl mi">Mi</span><span class="dur">@0.1225</span>
              <span class="rest">~</span>
              <span class="syl fa">Fa</span>
              <span class="rest">~</span>
              <span class="syl sol">Sol</span><span class="dur">@0.25</span>
              <span class="rest">~</span>
              <span class="syl la">La</span>
              <span class="rest">~</span>
              <span class="syl ti">Ti</span><span class="dur">@0.0675</span>
            </div>
          </div>
          <div class="var-sub">Jazz face · chromatic by seat · italic duration stamps</div>
        </div>

        <!-- Display mode: scale degree -->
        <div class="var-cell">
          <div class="var-name">02 · Display: Scale Degree · 1&#x0302; 2&#x0302; 3&#x0302;</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="deg do">1&#x0302;</span><span class="dur">@0.282</span>
              <span class="rest">~</span>
              <span class="deg re">2&#x0302;</span><span class="dur">@0.128</span>
              <span class="rest">~</span>
              <span class="deg mi">3&#x0302;</span><span class="dur">@0.1225</span>
              <span class="rest">~</span>
              <span class="deg fa">4&#x0302;</span>
              <span class="rest">~</span>
              <span class="deg sol">5&#x0302;</span><span class="dur">@0.25</span>
              <span class="rest">~</span>
              <span class="deg la">6&#x0302;</span>
              <span class="rest">~</span>
              <span class="deg ti">7&#x0302;</span><span class="dur">@0.0675</span>
            </div>
          </div>
          <div class="var-sub">Mono face · caret degree hat · same chromatic coloring</div>
        </div>

        <!-- Display mode: raw notes -->
        <div class="var-cell">
          <div class="var-name">03 · Display: Raw Notes · C D E</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="raw do">C</span><span class="dur">@0.282</span>
              <span class="rest">~</span>
              <span class="raw re">D</span><span class="dur">@0.128</span>
              <span class="rest">~</span>
              <span class="raw mi">E</span><span class="dur">@0.1225</span>
              <span class="rest">~</span>
              <span class="raw fa">F</span>
              <span class="rest">~</span>
              <span class="raw sol">G</span><span class="dur">@0.25</span>
              <span class="rest">~</span>
              <span class="raw la">A</span>
              <span class="rest">~</span>
              <span class="raw ti">B</span><span class="dur">@0.0675</span>
            </div>
          </div>
          <div class="var-sub">Mono face · pitch letter · chromatic coloring preserved</div>
        </div>

        <!-- Duration: width-bar representation -->
        <div class="var-cell">
          <div class="var-name">04 · Duration: Width bars (proportional)</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="syl do">Do</span><span class="dur-bar" style="color:var(--note-do);width:28px"></span>
              <span class="rest">~</span>
              <span class="syl re">Re</span><span class="dur-bar" style="color:var(--note-re);width:14px"></span>
              <span class="rest">~</span>
              <span class="syl mi lit">Mi</span><span class="dur-bar" style="color:var(--note-mi);width:22px"></span>
              <span class="rest">~</span>
              <span class="syl fa">Fa</span><span class="dur-bar" style="color:var(--note-fa);width:8px"></span>
              <span class="rest">~</span>
              <span class="syl sol">Sol</span><span class="dur-bar" style="color:var(--note-sol);width:36px"></span>
            </div>
          </div>
          <div class="var-sub">Bar width proportional to @duration · no numeric stamp</div>
        </div>

        <!-- Duration: stacked note-over-duration -->
        <div class="var-cell">
          <div class="var-name">05 · Duration: Stacked note-over-duration</div>
          <div class="cs" style="padding: 10px 12px;">
            <span class="chev">&lt;</span>
            <div class="seq" style="align-items: flex-start;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <span class="syl do">Do</span>
                <div style="font-size:9px;color:var(--ivory-3);border-top:1px solid var(--hairline);width:20px;text-align:center;padding-top:2px">@0.25</div>
              </div>
              <span class="rest">~</span>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <span class="syl re">Re</span>
                <div style="font-size:9px;color:var(--ivory-3);border-top:1px solid var(--hairline);width:20px;text-align:center;padding-top:2px">@0.125</div>
              </div>
              <span class="rest">~</span>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <span class="syl mi">Mi</span>
                <div style="font-size:9px;color:var(--ivory-3);border-top:1px solid var(--hairline);width:20px;text-align:center;padding-top:2px">@0.375</div>
              </div>
              <span class="rest">~</span>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <span class="syl fa">Fa</span>
                <div style="font-size:9px;color:var(--ivory-3);border-top:1px solid var(--hairline);width:20px;text-align:center;padding-top:2px">@0.0625</div>
              </div>
              <span class="rest">~</span>
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <span class="syl sol">Sol</span>
                <div style="font-size:9px;color:var(--ivory-3);border-top:1px solid var(--hairline);width:20px;text-align:center;padding-top:2px">@0.5</div>
              </div>
            </div>
          </div>
          <div class="var-sub">Solfège glyph · decimal duration below · hairline divider</div>
        </div>

        <!-- Duration: no duration, sparse -->
        <div class="var-cell">
          <div class="var-name">06 · Duration: None (sparse input mode)</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq spaced" style="gap:14px">
              <span class="syl do">Do</span>
              <span class="rest">~</span>
              <span class="syl mi">Mi</span>
              <span class="rest">~</span>
              <span class="syl sol">Sol</span>
              <span class="rest">~</span>
              <span class="syl mi">Mi</span>
              <span class="rest">~</span>
              <span class="syl do">Do</span>
            </div>
          </div>
          <div class="var-sub">No @timestamp · equal duration implied · entry mode</div>
        </div>

        <!-- Rest-heavy row -->
        <div class="var-cell">
          <div class="var-name">07 · Rest-heavy · syncopated rhythm</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="rest">~</span><span class="dur">@0.0415</span>
              <span class="syl fa">Fa</span><span class="dur">@0.0398</span>
              <span class="rest">~</span><span class="dur">@0.3289</span>
              <span class="syl la">La</span><span class="dur">@0.2031</span>
              <span class="rest">~</span><span class="dur">@0.09</span>
              <span class="rest">~</span><span class="dur">@0.0413</span>
              <span class="syl la">La</span><span class="dur">@0.0813</span>
            </div>
          </div>
          <div class="var-sub">Most tokens are rests · matches live screenshot pattern</div>
        </div>

        <!-- Grouped chords with brackets -->
        <div class="var-cell">
          <div class="var-name">08 · Chord groups · bracket notation</div>
          <div class="cs">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="br">{</span>
              <span class="syl do">Do</span>
              <span class="sep">,</span>
              <span class="syl mi">Mi</span><span class="acc">&#x266D;</span>
              <span class="sep">,</span>
              <span class="syl sol">Sol</span>
              <span class="br">}</span>
              <span class="rest">~</span>
              <span class="syl la">La</span><span class="dur">@0.5</span>
              <span class="rest">~</span>
              <span class="syl ti">Ti</span>
            </div>
          </div>
          <div class="var-sub">{ } groups simultaneous notes · , separates voices</div>
        </div>

        <!-- Dense layout -->
        <div class="var-cell">
          <div class="var-name">09 · Layout: Dense · compact glyph size</div>
          <div class="cs dense">
            <span class="chev">&lt;</span>
            <div class="seq">
              <span class="syl do">Do</span><span class="dur">@.28</span>
              <span class="rest">~</span>
              <span class="syl re">Re</span>
              <span class="rest">~</span>
              <span class="syl mi">Mi</span><span class="dur">@.12</span>
              <span class="rest">~</span>
              <span class="syl fa">Fa</span>
              <span class="rest">~</span>
              <span class="syl sol">Sol</span><span class="dur">@.25</span>
              <span class="rest">~</span>
              <span class="syl la">La</span><span class="dur">@.09</span>
              <span class="rest">~</span>
              <span class="syl ti">Ti</span>
              <span class="rest">~</span>
              <span class="syl do">Do</span><span class="dur">@.14</span>
              <span class="rest">~</span>
              <span class="syl re">Re</span>
              <span class="rest">~</span>
              <span class="syl mi">Mi</span>
            </div>
          </div>
          <div class="var-sub">13px glyph · 3px gap · max tokens in row</div>
        </div>

      </div>

      <div class="caption">
        Punctuation steps back so syllables wear the chromatic light.
        Duration stamps stay mono-mute — the eye skips unless scanning for timing.
        The lit glyph glows in its own hue and trails a filled square.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   CODE STRIP — Strudel notation row.
   Leading chevron + chromatic syllables colored by --note-*
   + mono duration stamps + tilde rests + punctuation brackets.
   Music feedback primitive: --note-* on glyphs, ink/ivory for chrome.
   ===================================================================== */

/* ── core primitive ─────────────────────────────────────────────────── */
.cs {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ink-2);
  border: 1px solid var(--hairline);
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  overflow: hidden;
  min-height: 36px;
}

/* chevron lead */
.cs .chev {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ivory-4);
  flex: 0 0 auto;
  letter-spacing: 0;
}

/* scrollable notation sequence */
.cs .seq {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 1;
  min-width: 0;
  flex-wrap: nowrap;
  overflow-x: hidden;
}

/* rest marker */
.cs .seq .rest {
  color: var(--ivory-4);
  font-size: 11px;
}

/* bracket / group punctuation — prominent brace treatment */
.cs .seq .br {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

/* comma separator */
.cs .seq .sep {
  color: var(--ivory-4);
  font-size: 10px;
}

/* duration stamp */
.cs .seq .dur {
  color: var(--ivory-3);
  font-size: 9px;
  letter-spacing: 0.04em;
  margin-left: -4px;
}

/* accidental modifier (flat/sharp) */
.cs .seq .acc {
  color: var(--ivory-3);
  font-size: 9px;
  margin-left: -4px;
}

/* solfège syllable — display face, chromatic color */
.cs .seq .syl {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.cs .seq .syl.do  { color: var(--note-do); }
.cs .seq .syl.re  { color: var(--note-re); }
.cs .seq .syl.mi  { color: var(--note-mi); }
.cs .seq .syl.fa  { color: var(--note-fa); }
.cs .seq .syl.sol { color: var(--note-sol); }
.cs .seq .syl.la  { color: var(--note-la); }
.cs .seq .syl.ti  { color: var(--note-ti); }

/* degree display — Lets Jazz style */
.cs .seq .deg {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.02em;
}
.cs .seq .deg.do  { color: var(--note-do); }
.cs .seq .deg.re  { color: var(--note-re); }
.cs .seq .deg.mi  { color: var(--note-mi); }
.cs .seq .deg.fa  { color: var(--note-fa); }
.cs .seq .deg.sol { color: var(--note-sol); }
.cs .seq .deg.la  { color: var(--note-la); }
.cs .seq .deg.ti  { color: var(--note-ti); }

/* raw note letter display — Lets Jazz style */
.cs .seq .raw {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.cs .seq .raw.do  { color: var(--note-do); }
.cs .seq .raw.re  { color: var(--note-re); }
.cs .seq .raw.mi  { color: var(--note-mi); }
.cs .seq .raw.fa  { color: var(--note-fa); }
.cs .seq .raw.sol { color: var(--note-sol); }
.cs .seq .raw.la  { color: var(--note-la); }
.cs .seq .raw.ti  { color: var(--note-ti); }

/* currently sounding — glow in own hue */
.cs .seq .syl.lit {
  text-shadow: 0 0 14px currentColor;
}
.cs .seq .syl.lit::after {
  content: "";
  display: inline-block;
  width: 5px; height: 5px;
  background: currentColor;
  margin-left: 3px;
  vertical-align: 3px;
}

/* width-bar duration representation */
.dur-bar {
  display: inline-block;
  height: 4px;
  background: currentColor;
  opacity: 0.55;
  vertical-align: 5px;
  margin-left: 2px;
}

/* wrapped two-row layout */
.cs.wrapped .seq {
  flex-wrap: wrap;
  row-gap: 4px;
}

/* dense variant — tighter gap */
.cs.dense .seq { gap: 3px; }
.cs.dense .seq .syl { font-size: 13px; }

/* spaced variant */
.cs.spaced .seq { gap: 12px; }

/* ── shared grammar ─────────────────────────────────────────────────── */
.section-head {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}
.section-head:first-child { margin-top: 6px; }

.anatomy-wrap {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-top: 8px;
}
.anatomy {
  display: grid;
  align-content: start;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-3);
}
.anatomy .row {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--ink-5);
}
.anatomy .row:last-child { border-bottom: 0; }
.anatomy .row b { color: var(--ivory); font-weight: 700; }

.variants-full {
  display: grid;
  gap: 10px;
}

/* ── variant cell wrapper ───────────────────────────────────────────── */
.var-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.var-name {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
}
.var-sub {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-top: 2px;
}
</style>
