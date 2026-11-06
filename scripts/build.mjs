// Builds the static site into _site/:
//   - copies the page files and assets
//   - turns posts/*.md into HTML and bundles them with content/site.json into data.json
// Run: npm run build
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { marked } from 'marked';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, '_site');
const WORDS_PER_MIN = 220;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

function parsePost(file) {
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
  const d = new Date(meta.date + 'T00:00:00Z');
  if (isNaN(d)) fail(`${basename(file)}: date "${meta.date}" should look like 2026-10-31`);

  // Each top-level block (paragraph, heading, list, quote, code…) becomes one
  // unit, so Focus mode can highlight the block you're reading.
  const tokens = marked.lexer(m[2]);
  const blocks = tokens
    .filter((t) => t.type !== 'space')
    .map((t) => marked.parser(Object.assign([t], { links: tokens.links })).trim());
  const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const texts = blocks.map(plain);
  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;

  return {
    slug: basename(file, '.md'),
    title: meta.title,
    dek: meta.dek || '',
    isoDate: meta.date,
    date: MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(),
    draft: /^(true|yes)$/i.test(meta.draft || ''),
    words,
    read: Math.max(1, Math.round(words / WORDS_PER_MIN)) + ' min read',
    // Shown on the Writing page. Set "excerpt:" in front matter to override.
    excerpt: meta.excerpt || texts[0] || '',
    excerpt2: meta.excerpt ? '' : texts[1] || '',
    blocks
  };
}

const postsDir = join(ROOT, 'posts');
const posts = readdirSync(postsDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => parsePost(join(postsDir, f)))
  .filter((p) => !p.draft)
  .sort((a, b) => b.isoDate.localeCompare(a.isoDate));

const siteRaw = readFileSync(join(ROOT, 'content/site.json'), 'utf8');
let site;
try { site = JSON.parse(siteRaw); } catch (e) { fail('content/site.json is not valid JSON: ' + e.message); }
site = JSON.parse(JSON.stringify(site).replaceAll('{{email}}', site.email));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of ['index.html', 'styles.css', 'app.js', 'favicon.png', 'CNAME']) {
  if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
}
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
writeFileSync(join(OUT, 'data.json'), JSON.stringify({ ...site, posts }));
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`✓ Built ${posts.length} post${posts.length === 1 ? '' : 's'} into _site/`);
