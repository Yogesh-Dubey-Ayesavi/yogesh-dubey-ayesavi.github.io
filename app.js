'use strict';

/* Portfolio v11 — ported from the Claude Design project.
   Markup and inline styles follow the design file; content comes from
   data.json (built from content/site.json and posts/*.md). */

/* ───────────────────────── Config ───────────────────────── */

const FOCUS_READING_DEFAULT = true;
const WORDS_PER_MIN = 220;
const ALL_LIT = 1e9;

// Light follows the first edition, dark the second; the system setting picks.
const THEMES = {
  paper: { name: 'Newsprint', bg: '#f1ebdf', ink: '#1c1a17', muted: '#5f594f', line: '#cfc6b4', accent: '#2f6b4f', tint: '#e7dfcf' },
  night: { name: 'Late edition', bg: '#131416', ink: '#ece5d8', muted: '#9d978c', line: '#34363a', accent: '#e3b45a', tint: '#1d1f22' },
};

const SECTION_LINES = {
  about: 'About me: who I am and why I build things.',
  writing: 'Writing: notes on what I build and what I learn.',
  post: 'Writing: notes on what I build and what I learn.',
  contact: 'Contact: the best ways to reach me.'
};

const TABS = [['home', 'Front page', '#/'], ['about', 'About', '#/about'], ['writing', 'Writing', '#/writing'], ['contact', 'Contact', '#/contact']];

let D = null;      // site content
let posts = [];    // newest first
let EMAIL = '';

/* ───────────────────────── Helpers ───────────────────────── */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const map = (list, fn) => list.map(fn).join('');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

function parseRoute() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const m = h.match(/^post\/([^/?#]+)/);
  if (m) {
    const i = posts.findIndex((p) => p.slug === decodeURIComponent(m[1]));
    return i >= 0 ? { page: 'post', post: i } : { page: 'writing', post: 0 };
  }
  const p = h.split('/')[0];
  return { page: p === 'work' ? 'writing' : ['about', 'writing', 'contact'].includes(p) ? p : 'home', post: 0 };
}

/* ───────────────────────── State ───────────────────────── */

const state = {
  route: { page: 'home', post: 0 },
  progress: 0,
  active: 0,
  focus: FOCUS_READING_DEFAULT,
  size: window.innerWidth < 600 ? 18 : 21
};

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = darkQuery.matches ? THEMES.night : THEMES.paper;
  const r = document.documentElement.style;
  ['bg', 'ink', 'muted', 'line', 'accent', 'tint'].forEach((k) => r.setProperty('--' + k, t[k]));
}

/* ───────────────────────── Shared pieces ───────────────────────── */

const SVG = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" style="flex:none"';
const ARROW = `<svg ${SVG}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
const ARROW_BACK = `<svg ${SVG}><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>`;
const MINUS = `<svg ${SVG}><path d="M5 12h14"></path></svg>`;
const PLUS = `<svg ${SVG}><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>`;

const MONO = "font-family:'JetBrains Mono',monospace";
const SANS = "font-family:'Bricolage Grotesque',sans-serif";
const KICKER = `${MONO};font-size:13px;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;color:var(--accent)`;
const KICKER12 = `${MONO};font-size:12px;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;color:var(--accent)`;

const btnPrimary = (href, label, extra) =>
  `<a href="${esc(href)}" class="btn btn-primary"${extra || ''}><span>${esc(label)}</span>${ARROW}</a>`;
const btnSecondary = (href, label) =>
  `<a href="${esc(href)}" class="btn btn-secondary"><span>${esc(label)}</span>${ARROW}</a>`;

const secHead = (title, right) => `
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px 20px;flex-wrap:wrap;padding:16px 0 12px;border-bottom:1px solid var(--ink)">
    <span style="${SANS};font-weight:600;font-size:26px;letter-spacing:-0.010em">${esc(title)}</span>
    ${right}
  </div>`;
const secNote = (text) => `<span style="font-size:16px;line-height:22px;color:var(--muted)">${esc(text)}</span>`;

const listRow = (href, label, title, dek) => `
  <a href="${esc(href)}" class="row-link" style="display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 24px;padding:20px 0;border-bottom:1px solid var(--line)">
    <span style="flex:0 0 120px;${MONO};font-size:12px;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted)">${esc(label)}</span>
    <span style="flex:1 1 360px;min-width:0;display:grid;gap:6px">
      <span style="${SANS};font-weight:600;font-size:clamp(16px,1.6vw,20px);line-height:1.05;letter-spacing:-0.010em">${esc(title)}</span>
      <span style="font-size:17px;line-height:25px;color:var(--muted)">${esc(dek)}</span>
    </span>
    <span aria-hidden="true" class="arrow-box">${ARROW}</span>
  </a>`;

// The design's <image-slot>: fills its frame, cropped like object-fit: cover.
const slot = (src, ph, alt, pos) => src
  ? `<span class="slot" data-empty="${esc(emptySlot(ph))}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" style="object-position:${pos || '50% 50%'}" onerror="this.parentNode.innerHTML=this.parentNode.dataset.empty"></span>`
  : `<span class="slot">${emptySlot(ph)}</span>`;
function emptySlot(ph) {
  return `<span class="slot-empty"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"></rect><circle cx="9" cy="10" r="1.6"></circle><path d="m21 16-5-5-9 9"></path></svg><span>${esc(ph)}</span></span><span class="slot-ring"></span>`;
}

const portrait = (src, alt, pos, maxWidth) => `
  <div style="aspect-ratio:1349/1600;width:100%;${maxWidth ? `max-width:${maxWidth};` : ''}border:1px solid var(--ink);position:relative;overflow:hidden;min-width:0">
    ${slot(src, 'Portrait', alt, pos)}
  </div>`;

/* ───────────────────────── Page chrome ───────────────────────── */

function topbar() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `
  <div class="topbar" style="display:flex;justify-content:space-between;align-items:center;gap:10px 24px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--ink);${MONO};font-size:13px;letter-spacing:0.02em;text-transform:uppercase">
    <span>${esc(today)}</span>
    <span>Thanks for stopping by</span>
  </div>`;
}

function masthead(page) {
  if (page === 'home') {
    return `
    <header style="padding:clamp(14px,2vw,24px) 0 10px;border-bottom:4px double var(--ink);display:flex;justify-content:space-between;align-items:end;gap:12px 32px;flex-wrap:wrap">
      <a href="#/" style="text-decoration:none;${SANS};font-weight:600;font-size:clamp(46px,9.2vw,133px);line-height:1.08;padding-bottom:0.06em;letter-spacing:-0.018em">Yogesh Dubey</a>
      <span style="padding-bottom:8px;font-size:18px;line-height:24px;max-width:30ch">Hi, I'm Yogesh. I like solving real problems, and this is where I write about them.</span>
    </header>`;
  }
  return `
    <header style="padding:18px 0 12px;border-bottom:4px double var(--ink);display:flex;justify-content:space-between;align-items:end;gap:12px 32px;flex-wrap:wrap">
      <a href="#/" style="text-decoration:none;${SANS};font-weight:600;font-size:clamp(29px,3.4vw,44px);line-height:1;letter-spacing:-0.018em">Yogesh Dubey</a>
      <span style="font-size:16px;line-height:22px;color:var(--muted);padding-bottom:6px;max-width:42ch">${esc(SECTION_LINES[page] || '')}</span>
    </header>`;
}

function tabs(page) {
  const active = page === 'post' ? 'writing' : page;
  return `<nav class="tabs" aria-label="Sections" style="display:flex;gap:0;flex-wrap:wrap;border-bottom:1px solid var(--ink);${MONO};font-size:13px;font-weight:600;letter-spacing:0.02em;text-transform:uppercase">${map(TABS, ([k, label, href]) => {
    const on = k === active;
    return `<a href="${href}" aria-current="${on ? 'page' : 'false'}" style="text-decoration:none;white-space:nowrap;padding:12px 18px;background:${on ? 'var(--ink)' : 'transparent'};color:${on ? 'var(--bg)' : 'var(--ink)'};border-right:1px solid var(--line);transition:background .2s,color .2s">${label}</a>`;
  })}</nav>`;
}

/* ───────────────────────── Views ───────────────────────── */

function homeView() {
  return `
  <main>
    <section style="display:flex;flex-wrap:wrap;border-bottom:1px solid var(--ink)">
      <article style="flex:2 1 600px;min-width:0;padding:32px clamp(0px,2vw,32px) 36px 0;display:grid;gap:22px;align-content:start">
        <span style="${KICKER}">My mission</span>
        <h1 style="margin:0;${SANS};font-weight:600;font-size:clamp(35px,4.8vw,71px);line-height:1.08;letter-spacing:-0.018em">To create impactful things, that really solve real problems</h1>
        <div style="columns:2 260px;column-gap:28px;column-rule:1px solid var(--line);font-size:19px;line-height:29px">
          <p style="margin:0 0 14px"><span style="float:left;${SANS};font-weight:600;font-size:76px;line-height:0.82;padding:4px 10px 0 0">I</span>'m a problem-solution kind of person. Software is the tool I know best, and it's what I do for a living, but I'm not attached to it.</p>
          <p style="margin:0 0 14px">If a real-life problem needs something else, that's what I'll use. I write about the things I build on the Writing page.</p>
          <p style="margin:6px 0 0">${btnPrimary(posts.some((p) => p.slug === 'my-story-so-far') ? '#/post/my-story-so-far' : '#/about', 'Read my full story')}</p>
        </div>
      </article>
      <aside style="flex:1 1 300px;min-width:0;overflow:hidden;border-left:1px solid var(--ink);padding:32px 0 36px clamp(16px,2vw,28px);display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-content:start">
        ${portrait('assets/portrait-home.webp', 'Portrait of Yogesh Dubey', '50% 50%', '380px')}
        <span style="font-size:15px;color:var(--muted)">That's me, Yogesh Dubey.</span>
      </aside>
    </section>

    ${secHead('Recent writing', btnSecondary('#/writing', `See all writing (${posts.length})`))}
    <div style="display:grid">
      ${map(posts.slice(0, 3), (b) => listRow(b.href, b.date, b.title, b.dek))}
    </div>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px 32px;padding:40px 0 32px;border-bottom:4px double var(--ink)">
      <span style="${SANS};font-weight:600;font-size:clamp(19px,2.0vw,24px);line-height:1;letter-spacing:-0.010em;max-width:24ch">Got a problem worth solving? I'd love to hear about it.</span>
      ${btnPrimary('#/contact', 'How to reach me')}
    </div>
  </main>`;
}

const CELL = 'padding:24px 22px 28px;box-shadow:-1px 0 0 var(--ink),0 -1px 0 var(--ink);display:grid;gap:14px;align-content:start;min-width:0';
const SUB_K = `${MONO};font-weight:600;font-size:13px;letter-spacing:0.01em`;

function aboutView() {
  return `
  <main>
    <div style="border-bottom:4px double var(--ink)">
      <div style="display:flex;flex-wrap:wrap;margin:0 -22px;overflow:hidden">
        <aside style="${CELL};grid-template-columns:minmax(0,1fr);flex:1 1 300px;max-width:460px">
          <div style="aspect-ratio:1349/1600;width:100%;border:1px solid var(--ink);position:relative;overflow:hidden">
            ${slot('assets/portrait-about.webp', 'Portrait', 'Portrait of Yogesh Dubey', '100% 50%')}
          </div>
          <span style="font-size:14px;color:var(--muted);margin-top:-6px">That's me, Yogesh Dubey.</span>
          <div style="display:grid;border-top:2px solid var(--ink)">
            ${map(D.facts, (f) => `
              <div style="display:grid;gap:2px;padding:10px 0;border-bottom:1px solid var(--line)">
                <span style="${MONO};font-size:11px;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted)">${esc(f.k)}</span>
                <span style="font-size:17px;line-height:23px">${esc(f.v)}</span>
              </div>`)}
          </div>
        </aside>
        <article style="${CELL};flex:2 1 520px">
          <span style="${KICKER12}">Profile</span>
          <h1 style="margin:0;${SANS};font-weight:600;font-size:clamp(29px,3.7vw,54px);line-height:1.08;letter-spacing:-0.018em">I've been shipping things since school.</h1>
          <p style="margin:0;font-size:21px;line-height:29px;color:var(--muted)">A software engineer and founder from India, based in Mumbai, who builds the whole stack and cares most about whether it solves a real problem.</p>
          <span style="${MONO};font-size:12px;letter-spacing:0.02em;text-transform:uppercase;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:7px 0">By Yogesh Dubey · Mumbai</span>
          <div style="columns:2 240px;column-gap:24px;column-rule:1px solid var(--line);font-size:17px;line-height:26px;text-align:justify;hyphens:manual">
            <p style="margin:0 0 12px"><span style="float:left;${SANS};font-weight:600;font-size:66px;line-height:0.8;padding:4px 8px 0 0">I</span>'m Yogesh. I build the full stack: mobile apps, backend APIs, cloud infrastructure and AI features. I've been doing it since I was in school.</p>
            <p style="margin:0 0 12px">Right now I'm building Cohostly, a cloud for small apps and tools. You drag and drop a folder, get a live link, and choose who can open and edit it.</p>
            <p style="margin:0 0 12px">I've started several products. Some got real traffic, like Corpintel, a free tool for Indian company filings that reached about 30,000 visitors. I shut one down myself when the market was too early.</p>
            <p style="margin:0 0 12px">I'm a problem-solution kind of person. Software is the tool I know best, but if a real-life problem needs something else, that's what I'll use.</p>
            <p style="margin:0">I'm finishing a Btech in Computer Science at Bhilai Institute of Technology, Raipur, and I've worked with companies in India and Australia.</p>
          </div>
          <blockquote style="margin:4px 0 0;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink);padding:16px 0;display:grid;gap:8px">
            <span style="${KICKER12}">My mission</span>
            <span style="${SANS};font-weight:700;font-size:clamp(17px,1.9vw,24px);line-height:1.04;letter-spacing:-0.010em">“To create impactful things, that really solve real problems”</span>
          </blockquote>
        </article>
      </div>
    </div>

    ${secHead('The record, since 2021', secNote('Newest first. Some overlap, because I often ran things in parallel.'))}
    <div style="border-bottom:4px double var(--ink);columns:2 440px;column-gap:44px;column-rule:1px solid var(--ink);padding:6px 0 18px">
      ${map(D.timeline, (t) => `
        <div style="break-inside:avoid;display:grid;grid-template-columns:112px minmax(0,1fr);gap:4px 16px;padding:12px 0;border-bottom:1px solid var(--line)">
          <span style="${MONO};font-size:12px;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted);padding-top:4px;font-feature-settings:'tnum' 1">${esc(t.d)}</span>
          <span style="display:grid;gap:3px">
            <span style="${SANS};font-weight:600;font-size:19px;line-height:1.15">${esc(t.what)} <span style="font-weight:500;color:var(--muted);font-size:15px">· ${esc(t.role)}</span></span>
            <span style="font-size:16px;line-height:23px">${esc(t.text)}</span>
          </span>
        </div>`)}
    </div>

    <div style="border-bottom:1px solid var(--ink)">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));margin:0 -22px;overflow:hidden">
        <section style="${CELL}">
          <span style="${KICKER12}">What I work with</span>
          ${map(D.skills, (s) => `
            <div style="display:grid;gap:2px;padding-top:10px;border-top:1px solid var(--line)">
              <span style="${SUB_K}">${esc(s.k)}</span>
              <span style="font-size:16px;line-height:23px">${esc(s.v)}</span>
            </div>`)}
        </section>
        <section style="${CELL}">
          <span style="${KICKER12}">Research, awards, open source</span>
          <div style="display:grid;gap:4px;padding-top:10px;border-top:1px solid var(--line)">
            <span style="${SUB_K}">Research paper, JAAFR</span>
            <span style="font-size:16px;line-height:23px">A way to fund free AI agents: brand-safe ads injected into streaming LLM responses on the server, so they stay out of the prompt and past ad blockers. <a href="https://rjwave.org/jaafr/papers/JAAFR2511467.pdf" target="_blank" rel="noopener">Read the paper ↗</a></span>
          </div>
          <div style="display:grid;gap:4px;padding-top:10px;border-top:1px solid var(--line)">
            <span style="${SUB_K}">SIH 2023, finalist</span>
            <span style="font-size:16px;line-height:23px">My team built an index to measure the ESG score of any company.</span>
          </div>
          <div style="display:grid;gap:4px;padding-top:10px;border-top:1px solid var(--line)">
            <span style="${SUB_K}">ChatView, open source</span>
            <span style="font-size:16px;line-height:23px">Contributed features to this Flutter chat UI package, including a typing callback. <a href="https://github.com/SimformSolutionsPvtLtd/chatview/pull/71" target="_blank" rel="noopener">PR #71 ↗</a></span>
          </div>
        </section>
        <section style="${CELL}">
          <span style="${KICKER12}">Education</span>
          <div style="display:grid;gap:4px;padding-top:10px;border-top:1px solid var(--line)">
            <span style="${SANS};font-weight:600;font-size:22px;line-height:1.05">Btech, Computer Science</span>
            <span style="font-size:16px;line-height:23px">Bhilai Institute of Technology, Raipur. 2022 to 2026.</span>
          </div>
          <div style="display:grid;gap:4px;padding-top:10px;border-top:1px solid var(--line)">
            <span style="${SUB_K}">School, finished 2022</span>
            <span style="font-size:16px;line-height:23px">JEE: 89th percentile. School boards: 80%.</span>
          </div>
          ${btnPrimary('#/contact', 'Write to me', ' style="justify-self:start;margin-top:6px"')}
        </section>
      </div>
    </div>
  </main>`;
}

function writingView() {
  const list = posts.length
    ? `<div style="display:grid">${map(posts, (b) => listRow(b.href, `${b.date} · ${b.read.replace(' read', '')}`, b.title, b.dek))}</div>`
    : `<p style="margin:0;padding:32px 0;font-size:19px;color:var(--muted)">No posts yet. Add a Markdown file to the posts folder.</p>`;
  return `
  <main style="border-bottom:4px double var(--ink);padding-bottom:8px">
    ${secHead('All writing', secNote(`${posts.length} pieces, newest first.`))}
    ${list}
  </main>`;
}

function readingView(idx) {
  const post = posts[idx];
  const next = posts[(idx + 1) % posts.length];
  const focusOn = state.focus;
  return `
  <article style="padding:clamp(28px,5vw,64px) 0 96px;border-bottom:1px solid var(--ink)">
    <div class="read-col" style="max-width:720px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:26px">
      <div class="read-tools" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;${MONO};font-size:13px;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted)">
        <a href="#/writing" class="btn btn-secondary" style="justify-content:flex-start">${ARROW_BACK}<span>All writing</span></a>
        <span style="display:flex;align-items:stretch;overflow:hidden;color:var(--ink);background:color-mix(in oklab,var(--bg) 50%,white);border:1px solid var(--line);box-shadow:0 2px 0 var(--line),0 4px 10px rgba(0,0,0,0.06);transition:transform .12s ease,box-shadow .12s ease;text-transform:none;font-size:14px;letter-spacing:0;font-weight:500">
          <button type="button" class="tool-btn" data-act="focus" aria-pressed="${focusOn}" title="Dim the paragraphs you're not reading" style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-right:1px solid var(--line)">
            <span>Focus</span>
            <span data-focus-track style="width:30px;height:16px;box-sizing:border-box;border:2px solid var(--ink);position:relative;transition:background .2s;background:${focusOn ? 'var(--ink)' : 'transparent'}"><span data-focus-dot style="position:absolute;top:2px;left:${focusOn ? '16px' : '2px'};width:8px;height:8px;transition:left .2s;background:${focusOn ? 'var(--bg)' : 'var(--ink)'}"></span></span>
          </button>
          <span style="display:flex;align-items:center;padding:0 12px">Text</span>
          <button type="button" class="tool-btn step" data-act="smaller" aria-label="Smaller text" style="width:40px;display:grid;place-items:center;border-left:1px solid var(--line)">${MINUS}</button>
          <button type="button" class="tool-btn step" data-act="bigger" aria-label="Larger text" style="width:40px;display:grid;place-items:center;border-left:1px solid var(--line)">${PLUS}</button>
        </span>
      </div>
      <div class="read-head" style="display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding-bottom:26px;border-bottom:4px double var(--ink)">
        <span style="${KICKER}">${esc(post.date)} · ${esc(post.read)} · <span data-remaining></span></span>
        <h1 style="margin:0;${SANS};font-weight:600;font-size:clamp(30px,4.1vw,52px);line-height:1.08;letter-spacing:-0.018em">${esc(post.title)}</h1>
        <p class="read-dek" style="margin:0;font-size:24px;line-height:32px;color:var(--muted)">${esc(post.dek)}</p>
        <span style="${MONO};font-size:13px;letter-spacing:0.02em;text-transform:uppercase">By Yogesh Dubey</span>
      </div>
      <div class="paras" data-paras style="display:grid;grid-template-columns:minmax(0,1fr);gap:1.05em;font-size:${state.size}px;line-height:1.62">
        ${map(post.blocks, (html, k) => `<div data-para="${k}" style="opacity:1;transition:opacity .45s ease,filter .45s ease">${html}</div>`)}
      </div>
      <a href="${next.href}" class="row-link" style="display:grid;gap:6px;margin-top:36px;padding-top:22px;border-top:1px solid var(--ink)">
        <span style="${MONO};font-size:13px;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted)">Read next</span>
        <span style="${SANS};font-weight:600;font-size:clamp(19px,2.0vw,26px);line-height:1.02;letter-spacing:-0.010em">${esc(next.title)}</span>
      </a>
    </div>
  </article>`;
}

function contactView() {
  return `
  <main style="padding:clamp(40px,6vw,80px) 0 clamp(48px,7vw,96px);border-bottom:1px solid var(--ink);display:grid;gap:clamp(36px,5vw,64px)">
    <div style="display:grid;gap:18px">
      <span style="${KICKER}">Say hello</span>
      <h1 style="margin:0;${SANS};font-weight:600;font-size:clamp(32px,4.4vw,65px);line-height:1.08;letter-spacing:-0.018em;max-width:16ch">Got a problem worth solving? I'd love to hear about it.</h1>
      <a href="mailto:${esc(EMAIL)}" style="font-size:clamp(26px,3vw,40px);justify-self:start">${esc(EMAIL)}</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));border-top:2px solid var(--ink)">
      ${map(D.links, (l) => `
        <a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''} class="row-link" style="display:grid;gap:6px;padding:20px 20px 20px 0;border-bottom:1px solid var(--line);min-width:0;overflow-wrap:anywhere">
          <span style="${MONO};font-size:12px;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted)">${esc(l.k)}</span>
          <span style="${SANS};font-weight:700;font-size:${l.v.length > 14 ? 'clamp(17px,1.5vw,20px)' : '24px'}">${esc(l.v)} ↗</span>
        </a>`)}
    </div>
  </main>`;
}

const VIEWS = { home: homeView, about: aboutView, writing: writingView, contact: contactView };

/* ───────────────────────── Render ───────────────────────── */

const app = document.getElementById('app');
const bar = document.getElementById('progress');
const isReading = () => state.route.page === 'post';

function render() {
  const { page, post } = state.route;
  applyTheme();
  document.title = page === 'home' ? 'Yogesh Dubey'
    : page === 'post' ? posts[post].title + ' · Yogesh Dubey'
    : page[0].toUpperCase() + page.slice(1) + ' · Yogesh Dubey';
  const view = page === 'post' ? readingView(post) : VIEWS[page]();
  app.innerHTML = topbar() + masthead(page) + tabs(page) + view + `
    <footer style="padding:22px 0 28px;display:flex;justify-content:space-between;gap:12px 28px;flex-wrap:wrap;${MONO};font-size:13px;color:var(--muted);letter-spacing:0.01em">
      <span>© 2026 Yogesh Dubey</span>
      <a href="#/contact">${esc(EMAIL)}</a>
    </footer>`;
  measure();
}

// Reading-mode updates touch only the affected nodes, so scrolling stays cheap.
function paintReading() {
  bar.style.width = isReading() ? (state.progress * 100).toFixed(1) + '%' : '0';
  if (!isReading()) return;
  const item = posts[state.route.post];
  const a = state.active;
  app.querySelectorAll('[data-para]').forEach((p) => {
    const k = +p.dataset.para;
    const lit = !state.focus || a === ALL_LIT || k === a;
    const near = Math.abs(k - a) === 1;
    p.style.opacity = lit ? 1 : near ? 0.4 : 0.22;
    p.style.filter = lit || near ? 'none' : 'blur(0.6px)';
  });
  const left = Math.max(0, Math.ceil(item.words * (1 - state.progress) / WORDS_PER_MIN));
  const rem = app.querySelector('[data-remaining]');
  if (rem) rem.textContent = left ? left + ' min left' : 'done';
}

function measure() {
  if (!isReading()) { state.progress = 0; paintReading(); return; }
  const max = document.documentElement.scrollHeight - innerHeight;
  const progress = max > 0 ? Math.min(1, scrollY / max) : 1;
  const mid = innerHeight * 0.45;
  let best = 0, bd = Infinity;
  app.querySelectorAll('[data-para]').forEach((p) => {
    const r = p.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid);
    if (d < bd) { bd = d; best = +p.dataset.para; }
  });
  if (progress > 0.98) best = ALL_LIT;
  state.progress = progress;
  state.active = best;
  paintReading();
}

let raf = 0;
const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };

window.addEventListener('hashchange', () => {
  state.route = parseRoute();
  state.active = 0;
  state.progress = 0;
  window.scrollTo(0, 0);
  render();
});
darkQuery.addEventListener('change', applyTheme);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'retry-content') return void boot();
  if (btn.dataset.act === 'focus') {
    state.focus = !state.focus;
    btn.setAttribute('aria-pressed', state.focus);
    btn.querySelector('[data-focus-track]').style.background = state.focus ? 'var(--ink)' : 'transparent';
    const dot = btn.querySelector('[data-focus-dot]');
    dot.style.left = state.focus ? '16px' : '2px';
    dot.style.background = state.focus ? 'var(--bg)' : 'var(--ink)';
  } else {
    state.size = btn.dataset.act === 'bigger' ? Math.min(27, state.size + 2) : Math.max(17, state.size - 2);
    app.querySelector('[data-paras]').style.fontSize = state.size + 'px';
  }
  measure();
});

/* ───────────────────────── Boot ───────────────────────── */

async function loadSiteData() {
  let lastError;
  for (const delay of [0, 250, 1000]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const response = await fetch('data.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`data.json returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function boot() {
  loadSiteData()
    .then((data) => {
      D = data;
      EMAIL = data.email;
      posts = data.posts.map((p) => ({ ...p, href: '#/post/' + encodeURIComponent(p.slug) }));
      state.route = parseRoute();
      render();
    })
    .catch((error) => {
      console.error('Could not load the site content', error);
      app.innerHTML = '<div style="padding:48px 0;display:grid;gap:18px;justify-items:start"><p style="margin:0;font-size:19px">Couldn’t load the site content. Please try again.</p><button type="button" class="btn btn-secondary" data-act="retry-content">Retry</button></div>';
    });
}

boot();
