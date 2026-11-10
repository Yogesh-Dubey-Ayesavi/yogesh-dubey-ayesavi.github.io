// Builds the static site into _site/:
//   - copies the page files and assets
//   - collects posts from Notion (when NOTION_TOKEN and NOTION_DATABASE are set)
//     and from posts/*.md, and bundles them with content/site.json into data.json
// Run: npm run build
import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, cpSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { marked } from 'marked';
import { loadNotionPosts } from './notion.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, '_site');
const WORDS_PER_MIN = 220;

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Shared by both sources. `blocks` is a list of HTML strings, one per
// top-level block, so Focus mode can highlight the block being read.
function makePost({ slug, title, dek, date, excerpt, blocks }) {
  const d = new Date(date + 'T00:00:00Z');
  const texts = blocks.map(plain);
  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
  return {
    slug, title, dek: dek || '', isoDate: date,
    date: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d),
    words,
    read: Math.max(1, Math.round(words / WORDS_PER_MIN)) + ' min read',
    excerpt: excerpt || texts[0] || '',
    excerpt2: excerpt ? '' : texts[1] || '',
    blocks
  };
}

function parseMarkdownPost(file) {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) fail(`${basename(file)}: missing the --- front matter block at the top`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 0) fail(`${basename(file)}: front matter line "${line}" needs a "key: value" form`);
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  for (const k of ['title', 'date']) if (!meta[k]) fail(`${basename(file)}: front matter needs a "${k}:" line`);
  if (isNaN(new Date(meta.date + 'T00:00:00Z'))) fail(`${basename(file)}: date "${meta.date}" should look like 2026-10-31`);
  if (/^(true|yes)$/i.test(meta.draft || '') && !process.env.SHOW_DRAFTS) return null; // SHOW_DRAFTS=1 is for local preview only

  const tokens = marked.lexer(m[2]);
  const blocks = tokens
    .filter((t) => t.type !== 'space')
    .map((t) => marked.parser(Object.assign([t], { links: tokens.links })).trim());
  return makePost({ slug: basename(file, '.md'), title: meta.title, dek: meta.dek, date: meta.date, excerpt: meta.excerpt, blocks });
}

// — output folder —
mkdirSync(OUT, { recursive: true });
for (const f of ['index.html', 'styles.css', 'app.js', 'favicon.png', 'CNAME']) {
  if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
}
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });

// — posts —
const postsDir = join(ROOT, 'posts');
const mdPosts = existsSync(postsDir)
  ? readdirSync(postsDir).filter((f) => f.endsWith('.md')).map((f) => parseMarkdownPost(join(postsDir, f))).filter(Boolean)
  : [];

let notionPosts = [];
const { NOTION_TOKEN, NOTION_DATABASE } = process.env;
if (NOTION_TOKEN && NOTION_DATABASE) {
  try {
    notionPosts = await loadNotionPosts({ token: NOTION_TOKEN, database: NOTION_DATABASE, outDir: OUT, makePost });
  } catch (e) {
    fail('Could not read posts from Notion: ' + e.message);
  }
} else {
  console.log('· Notion not configured (NOTION_TOKEN / NOTION_DATABASE); using posts/*.md only');
}

const seen = new Set();
const posts = [...notionPosts, ...mdPosts]
  .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
  .map((p) => {
    let slug = p.slug, n = 2;
    while (seen.has(slug)) slug = `${p.slug}-${n++}`;
    seen.add(slug);
    return { ...p, slug };
  });

// — site content —
let site;
try { site = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8')); } catch (e) { fail('content/site.json is not valid JSON: ' + e.message); }
site = JSON.parse(JSON.stringify(site).replaceAll('{{email}}', site.email));

const dataPath = join(OUT, 'data.json');
const pendingDataPath = join(OUT, 'data.json.pending');
writeFileSync(pendingDataPath, JSON.stringify({ ...site, posts }));
renameSync(pendingDataPath, dataPath);
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`✓ Built ${posts.length} post${posts.length === 1 ? '' : 's'} (${notionPosts.length} from Notion, ${mdPosts.length} from Markdown) into _site/`);
