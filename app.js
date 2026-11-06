'use strict';

/* ───────────────────────── Config ───────────────────────── */

const DEFAULT_THEME = 'paper';
const FOCUS_READING_DEFAULT = true;
const THEME_KEY = 'yd-theme7';

const THEMES = {
  paper: { name: 'Newsprint', bg: '#f1ebdf', ink: '#1c1a17', muted: '#5f594f', line: '#cfc6b4', accent: '#2f6b4f', tint: '#e7dfcf' },
  night: { name: 'Late edition', bg: '#131416', ink: '#ece5d8', muted: '#9d978c', line: '#34363a', accent: '#e3b45a', tint: '#1d1f22' },
  salmon: { name: 'Pink paper', bg: '#f6e3d3', ink: '#2a1d17', muted: '#6e5548', line: '#e0c4b0', accent: '#1f5d73', tint: '#efd5c1' },
  indigo: { name: 'Blueprint', bg: '#1c2547', ink: '#f2ebd9', muted: '#a8adc2', line: '#364070', accent: '#f2c14e', tint: '#242e56' }
};

/* ───────────────────────── Content ─────────────────────────
   Loaded from data.json, which `npm run build` generates from
   content/site.json and posts/*.md. Edit those files, not this one. */

let D = null;      // site content
let posts = [];    // newest first
let EMAIL = '';

const SECTION_LINES = {
  about: 'About me: who I am and why I build things.',
  work: 'Work: the things I have built so far.',
  writing: 'Writing: notes on what I build and what I learn.',
  post: 'Writing: notes on what I build and what I learn.',
  contact: 'Contact: the best ways to reach me.'
};

const TABS = [['home', 'Front page', '#/'], ['about', 'About', '#/about'], ['work', 'Work', '#/work'], ['writing', 'Writing', '#/writing'], ['contact', 'Contact', '#/contact']];

const WORDS_PER_MIN = 220;

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
    if (i >= 0) return { page: 'post', post: i };
    return { page: 'writing', post: 0 };
  }
  const p = h.split('/')[0];
  return { page: ['about', 'work', 'writing', 'contact'].includes(p) ? p : 'home', post: 0 };
}

/* ───────────────────────── State ───────────────────────── */

const state = {
  theme: THEMES[store.get(THEME_KEY)] ? store.get(THEME_KEY) : DEFAULT_THEME,
  route: { page: 'home', post: 0 },
  progress: 0,
  active: 0,
  focus: FOCUS_READING_DEFAULT,
  size: 21
};
const ALL_LIT = 1e9;

function applyTheme() {
  const t = THEMES[state.theme] || THEMES.paper;
  const r = document.documentElement.style;
  ['bg', 'ink', 'muted', 'line', 'accent', 'tint'].forEach((k) => r.setProperty('--' + k, t[k]));
}

/* ───────────────────────── Views ───────────────────────── */

const frame = (cls, src, alt, ph, pos) => `
  <div class="frame ${cls}">
    ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" style="object-position:${pos || '50% 50%'}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:${esc(JSON.stringify(ph))}}))">`
          : `<span class="ph">${esc(ph)}</span>`}
  </div>`;

function topbar() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `
  <div class="topbar">
    <span>${esc(today)}</span>
    <span>Thanks for stopping by</span>
    <span class="editions" role="group" aria-label="Edition">
      <span>Edition</span>
      ${map(Object.keys(THEMES), (k) => {
        const t = THEMES[k];
        return `<button type="button" class="swatch" data-theme="${k}" title="${esc(t.name)}" aria-label="${esc(t.name)} edition" aria-pressed="${k === state.theme}" style="background:${t.bg}"><span style="background:${t.accent}"></span></button>`;
      })}
    </span>
  </div>`;
}

function masthead(page) {
  if (page === 'home') {
    return `
    <header class="masthead home">
      <a href="#/" class="name">Yogesh Dubey</a>
      <span class="tagline">Hi, I'm Yogesh. I like solving real problems, and this is where I write about them.</span>
    </header>`;
  }
  return `
    <header class="masthead inner">
      <a href="#/" class="name">Yogesh Dubey</a>
      <span class="tagline">${esc(SECTION_LINES[page] || '')}</span>
    </header>`;
}

function tabs(page) {
  const active = page === 'post' ? 'writing' : page;
  return `<nav class="tabs" aria-label="Sections">${map(TABS, ([k, label, href]) =>
    `<a href="${href}"${k === active ? ' aria-current="page"' : ''}>${label}</a>`)}</nav>`;
}

function homeView() {
  return `
  <main>
    <section class="lead">
      <article>
        <span class="kicker lg">Today's front page · My mission</span>
        <h1 class="headline">To create impactful things, that really solve real problems</h1>
        <div class="body-cols">
          <p><span class="drop">I</span>'m a problem-solution kind of person. Software is the tool I know best, and it's what I do for a living, but I'm not attached to it.</p>
          <p>If a real-life problem needs something else, that's what I'll use. Lately that has meant AI agents, and you can read about two of them on the Work page.</p>
          <p class="sans" style="font-size:15px;font-weight:700"><a href="#/about">Read my full story →</a></p>
        </div>
      </article>
      <aside>
        ${frame('portrait', 'assets/portrait-home.webp', 'Portrait of Yogesh Dubey', 'Portrait')}
        <span class="it muted" style="font-size:15px">That's me, Yogesh Dubey.</span>
      </aside>
    </section>

    <div class="double">
      <div class="sec-head">
        <span class="t">Inside today's paper</span>
        <span class="s">Each of these has its own page. Pick one.</span>
      </div>
      <div class="cells w300">
        <section class="cell">
          <a href="#/work" class="kicker plain">Work →</a>
          ${map(D.workTeasers, (p) => `
            <a href="#/work" class="card-link" style="gap:8px">
              <span class="headline" style="font-stretch:82%;font-size:30px;line-height:1;letter-spacing:-0.02em">${esc(p.name)}</span>
              <span class="dek" style="font-size:17px;line-height:24px">${esc(p.short)}</span>
              <span class="justify" style="font-size:16px;line-height:24px;color:var(--ink)">${esc(p.blurb)}</span>
            </a>`)}
          <a href="#/work" class="link-sm">Read both stories on the Work page →</a>
        </section>
        <section class="cell">
          <a href="#/writing" class="kicker plain">Writing →</a>
          ${map(posts.slice(0, 3), (b) => `
            <a href="${b.href}" class="card-link" style="gap:6px">
              <span class="sans" style="font-weight:700;font-size:20px;line-height:1.15;letter-spacing:-0.01em">${esc(b.title)}</span>
              <span class="dek" style="font-size:16px;line-height:22px">${esc(b.dek)}</span>
              <span class="meta">${esc(b.date)} · ${esc(b.read)}</span>
            </a>`)}
          <a href="#/writing" class="link-sm">All writing →</a>
        </section>
        <section class="cell">
          <span class="kicker">Say hello</span>
          <span class="headline" style="font-stretch:82%;font-size:32px;line-height:1;letter-spacing:-0.02em">Got a problem worth solving? I'd love to hear about it.</span>
          <p class="justify" style="font-size:17px;line-height:26px">Tell me what the problem is and who it affects. A few lines is plenty, and I read everything that comes in.</p>
          <a href="#/contact" class="boxbtn">How to reach me →</a>
        </section>
      </div>
    </div>
  </main>`;
}

function aboutView() {
  return `
  <main>
    <div class="double">
      <div class="cells flex">
        <aside class="cell" style="grid-template-columns:minmax(0,1fr);flex:1 1 300px;max-width:460px">
          ${frame('portrait', 'assets/portrait-about.webp', 'Portrait of Yogesh Dubey', 'Portrait', '0% 50%')}
          <span class="caption">That's me, Yogesh Dubey.</span>
          <div class="facts">
            ${map(D.facts, (f) => `<div><span class="k">${esc(f.k)}</span><span class="v">${esc(f.v)}</span></div>`)}
          </div>
        </aside>
        <article class="cell" style="flex:2 1 520px">
          <span class="kicker">Profile</span>
          <h1 class="headline" style="font-stretch:78%;font-size:clamp(40px,5.5vw,80px);line-height:0.94">I've been shipping things since school.</h1>
          <p class="dek" style="font-size:21px;line-height:29px">A software engineer and founder from India, based in Mumbai, who builds the whole stack and cares most about whether it solves a real problem.</p>
          <span class="byline">By Yogesh Dubey · Mumbai</span>
          <div class="body-cols" style="columns:2 240px">
            <p><span class="drop" style="font-size:66px">I</span>'m Yogesh. I build the full stack: mobile apps, backend APIs, cloud infrastructure and AI features. I've been doing it since I was in school.</p>
            <p>Right now I'm building Cohostly, a cloud for small apps and tools. You drag and drop a folder, get a live link, and choose who can open and edit it.</p>
            <p>I've started several products. Some got real traffic, like Corpintel, a free tool for Indian company filings that reached about 30,000 visitors. I shut one down myself when the market was too early.</p>
            <p>I'm a problem-solution kind of person. Software is the tool I know best, but if a real-life problem needs something else, that's what I'll use.</p>
            <p>I'm finishing a Btech in Computer Science at Bhilai Institute of Technology, Raipur, and I've worked with companies in India and Australia.</p>
          </div>
          <blockquote class="mission">
            <span class="kicker">My mission</span>
            <span class="q">“To create impactful things, that really solve real problems”</span>
          </blockquote>
        </article>
      </div>
    </div>

    <div class="sec-head">
      <span class="t">The record, since 2021</span>
      <span class="s">Newest first. Some overlap, because I often ran things in parallel.</span>
    </div>
    <div class="double timeline">
      ${map(D.timeline, (t) => `
        <div class="row">
          <span class="d">${esc(t.d)}</span>
          <span>
            <span class="what">${esc(t.what)} <span class="role">· ${esc(t.role)}</span></span>
            <span class="text">${esc(t.text)}</span>
          </span>
        </div>`)}
    </div>

    <div class="single">
      <div class="cells w280">
        <section class="cell">
          <span class="kicker">What I work with</span>
          ${map(D.skills, (s) => `<div class="sub" style="gap:2px"><span class="k">${esc(s.k)}</span><span class="v">${esc(s.v)}</span></div>`)}
        </section>
        <section class="cell">
          <span class="kicker">Research, awards, open source</span>
          <div class="sub">
            <span class="k">Research paper, JAAFR</span>
            <span class="v">A way to fund free AI agents: brand-safe ads injected into streaming LLM responses on the server, so they stay out of the prompt and past ad blockers. <a href="https://rjwave.org/jaafr/papers/JAAFR2511467.pdf" target="_blank" rel="noopener">Read the paper ↗</a></span>
          </div>
          <div class="sub">
            <span class="k">SIH 2023, finalist</span>
            <span class="v">My team built an index to measure the ESG score of any company.</span>
          </div>
          <div class="sub">
            <span class="k">ChatView, open source</span>
            <span class="v">Contributed features to this Flutter chat UI package, including a typing callback. <a href="https://github.com/SimformSolutionsPvtLtd/chatview/pull/71" target="_blank" rel="noopener">PR #71 ↗</a></span>
          </div>
        </section>
        <section class="cell">
          <span class="kicker">Education</span>
          <div class="sub">
            <span class="headline" style="font-stretch:85%;font-size:26px;line-height:1.05;letter-spacing:normal">Btech, Computer Science</span>
            <span class="v">Bhilai Institute of Technology, Raipur. 2022 to 2026.</span>
          </div>
          <div class="sub">
            <span class="k">School, finished 2022</span>
            <span class="v">JEE: 89th percentile. School boards: 80%.</span>
          </div>
          <a href="#/contact" class="boxbtn" style="margin-top:6px">Write to me →</a>
        </section>
      </div>
    </div>
  </main>`;
}

function workView() {
  return `
  <main>
    ${map(D.projects, (p) => `
      <article class="double">
        <div class="cells w420">
          <div class="cell">
            <span class="kicker">Story ${esc(p.num)} · ${esc(p.kicker)}</span>
            <h2 class="headline" style="font-stretch:80%;font-size:clamp(36px,4.4vw,60px);line-height:0.95;letter-spacing:-0.035em">${esc(p.headline)}</h2>
            <p class="dek" style="font-size:20px;line-height:28px">${esc(p.dek)}</p>
            <span class="byline">By Yogesh Dubey</span>
            <div class="body-cols" style="columns:2 220px">
              <p><span class="drop">${esc(p.drop)}</span>${esc(p.first)}</p>
              ${map(p.paras, (t) => `<p>${esc(t)}</p>`)}
            </div>
          </div>
          <div class="cell" style="grid-template-columns:minmax(0,1fr)">
            ${frame('', p.src, p.caption, p.ph).replace('class="frame "', 'class="frame" style="aspect-ratio:1200/630"')}
            <span class="caption">${esc(p.caption)}</span>
            <div class="glance">
              <span class="sans" style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase">At a glance</span>
              ${map(p.glance, (g) => `<span><b>${esc(g.k)}:</b> ${esc(g.v)}</span>`)}
            </div>
            <a href="${esc(p.href)}" class="link-sm"${p.external ? ' target="_blank" rel="noopener"' : ''}>${esc(p.linkLabel)}</a>
          </div>
        </div>
      </article>`)}
  </main>`;
}

function writingView() {
  if (!posts.length) return `<main class="single" style="padding:48px 0"><p class="dek" style="font-size:21px">No posts yet. Add a Markdown file to the posts folder.</p></main>`;
  const lead = posts[0];
  return `
  <main>
    <div class="double">
      <div class="cells w420">
        <a href="${lead.href}" class="cell plain hov">
          <span class="kicker">Latest · ${esc(lead.date)} · ${esc(lead.read)}</span>
          <span class="headline" style="font-stretch:80%;font-size:clamp(38px,4.8vw,64px);line-height:0.95;letter-spacing:-0.035em">${esc(lead.title)}</span>
          <span class="dek" style="font-size:21px;line-height:29px">${esc(lead.dek)}</span>
        </a>
        <a href="${lead.href}" class="cell plain" tabindex="-1">
          <span class="byline">By Yogesh Dubey</span>
          <span class="justify" style="font-size:17px;line-height:26px">${esc(lead.excerpt)}</span>
          <span class="justify" style="font-size:17px;line-height:26px">${esc(lead.excerpt2)}</span>
          <span class="link-sm" style="text-decoration:underline">Keep reading →</span>
        </a>
      </div>
    </div>
    <div class="sec-head">
      <span class="t">More from the writing desk</span>
      <span class="s">${posts.length} pieces so far</span>
    </div>
    <div class="single">
      <div class="cells w280">
        ${map(posts.slice(1), (b) => `
          <a href="${b.href}" class="cell plain hov">
            <span class="kicker">${esc(b.date)} · ${esc(b.read)}</span>
            <span class="headline" style="font-stretch:85%;font-size:28px;line-height:1;letter-spacing:-0.02em">${esc(b.title)}</span>
            <span class="dek" style="font-size:17px;line-height:24px">${esc(b.dek)}</span>
            <span class="justify" style="font-size:16px;line-height:24px;color:var(--ink)">${esc(b.excerpt)}</span>
            <span class="link-sm" style="text-decoration:underline">Read it →</span>
          </a>`)}
      </div>
    </div>
  </main>`;
}

function postView(pi) {
  const post = posts[pi];
  const next = posts[(pi + 1) % posts.length];
  return `
  <article class="post">
    <div class="col">
      <div class="tools">
        <a href="#/writing" class="plain">← All writing</a>
        <span>
          <button type="button" data-act="focus" aria-pressed="${state.focus}">Focus <span data-focus-label>${state.focus ? 'on' : 'off'}</span></button>
          <button type="button" data-act="smaller" aria-label="Smaller text">A−</button>
          <button type="button" data-act="bigger" aria-label="Larger text" style="font-size:17px">A+</button>
        </span>
      </div>
      <div style="display:grid;gap:16px;padding-bottom:26px;border-bottom:4px double var(--ink)">
        <span class="kicker lg">${esc(post.date)} · ${esc(post.read)} · <span data-remaining></span></span>
        <h1 class="headline" style="font-stretch:80%;font-size:clamp(42px,6vw,76px);line-height:0.95;letter-spacing:-0.035em">${esc(post.title)}</h1>
        <p class="dek" style="font-size:24px;line-height:32px">${esc(post.dek)}</p>
        <span class="sans" style="font-size:13px;letter-spacing:0.04em;text-transform:uppercase">By Yogesh Dubey</span>
      </div>
      <div class="paras" data-paras style="font-size:${state.size}px">
        ${map(post.blocks, (html, k) => `<div data-para="${k}">${html}</div>`)}
      </div>
      <a href="${next.href}" class="next">
        <span class="sans" style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">Read next</span>
        <span class="headline" style="font-stretch:85%;font-size:clamp(26px,3vw,38px);line-height:1.02;letter-spacing:-0.02em">${esc(next.title)}</span>
      </a>
    </div>
  </article>`;
}

function contactView() {
  return `
  <main class="contact">
    <div style="display:grid;gap:18px">
      <span class="kicker lg">Say hello</span>
      <h1 class="headline" style="font-stretch:78%;font-size:clamp(44px,6.5vw,96px);line-height:0.95;max-width:16ch">Got a problem worth solving? I'd love to hear about it.</h1>
      <a href="mailto:${esc(EMAIL)}" style="font-size:clamp(26px,3vw,40px);justify-self:start">${esc(EMAIL)}</a>
    </div>
    <div class="links">
      ${map(D.links, (l) => `
        <a href="${esc(l.href)}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>
          <span class="sans muted" style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase">${esc(l.k)}</span>
          <span class="sans" style="font-weight:700;font-size:24px">${esc(l.v)} ↗</span>
        </a>`)}
    </div>
  </main>`;
}

const VIEWS = { home: homeView, about: aboutView, work: workView, writing: writingView, contact: contactView };

/* ───────────────────────── Render ───────────────────────── */

const app = document.getElementById('app');
const bar = document.getElementById('progress');

function render() {
  const { page, post } = state.route;
  applyTheme();
  document.title = page === 'home' ? 'Yogesh Dubey'
    : page === 'post' ? posts[post].title + ' · Yogesh Dubey'
    : page[0].toUpperCase() + page.slice(1) + ' · Yogesh Dubey';
  app.innerHTML = topbar() + masthead(page) + tabs(page) +
    (page === 'post' ? postView(post) : VIEWS[page]()) + `
    <footer>
      <span>© 2026 Yogesh Dubey</span>
      <a href="#/contact">${esc(EMAIL)}</a>
    </footer>`;
  measure();
}

// Reading-mode updates touch only the affected nodes, so scrolling stays cheap.
function paintReading() {
  const isPost = state.route.page === 'post';
  bar.style.width = isPost ? (state.progress * 100).toFixed(1) + '%' : '0';
  if (!isPost) return;
  const post = posts[state.route.post];
  const a = state.active;
  app.querySelectorAll('[data-para]').forEach((p) => {
    const k = +p.dataset.para;
    const lit = !state.focus || a === ALL_LIT || k === a;
    const near = Math.abs(k - a) === 1;
    p.style.opacity = lit ? 1 : near ? 0.4 : 0.22;
    p.style.filter = lit || near ? 'none' : 'blur(0.6px)';
  });
  const left = Math.max(0, Math.ceil(post.words * (1 - state.progress) / WORDS_PER_MIN));
  const rem = app.querySelector('[data-remaining]');
  if (rem) rem.textContent = left ? left + ' min left' : 'done';
}

function measure() {
  if (state.route.page !== 'post') { state.progress = 0; paintReading(); return; }
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
  function boot() {
  fetch('data.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      D = data;
      posts = data.posts.map((p) => ({ ...p, href: '#/post/' + encodeURIComponent(p.slug) }));
      EMAIL = data.email;
      state.route = parseRoute();
      render();
    })
    .catch(() => {
      app.innerHTML = '<p style="padding:48px 0;font-size:19px">Couldn’t load the site content (data.json). If you are previewing locally, run <code>npm run preview</code>.</p>';
    });
}

boot();
});
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

app.addEventListener('click', (e) => {
  const sw = e.target.closest('[data-theme]');
  if (sw) {
    state.theme = sw.dataset.theme;
    store.set(THEME_KEY, state.theme);
    applyTheme();
    app.querySelectorAll('[data-theme]').forEach((b) => b.setAttribute('aria-pressed', b === sw));
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'focus') {
    state.focus = !state.focus;
    btn.setAttribute('aria-pressed', state.focus);
    btn.querySelector('[data-focus-label]').textContent = state.focus ? 'on' : 'off';
  } else {
    state.size = btn.dataset.act === 'bigger' ? Math.min(27, state.size + 2) : Math.max(17, state.size - 2);
    app.querySelector('[data-paras]').style.fontSize = state.size + 'px';
  }
  measure();
});

function boot() {
  fetch('data.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      D = data;
      posts = data.posts.map((p) => ({ ...p, href: '#/post/' + encodeURIComponent(p.slug) }));
      EMAIL = data.email;
      state.route = parseRoute();
      render();
    })
    .catch(() => {
      app.innerHTML = '<p style="padding:48px 0;font-size:19px">Couldn’t load the site content (data.json). If you are previewing locally, run <code>npm run preview</code>.</p>';
    });
}

boot();
