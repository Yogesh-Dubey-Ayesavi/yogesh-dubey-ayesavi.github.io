// Reads published posts from a Notion database and turns them into the same
// shape build.mjs produces from Markdown files.
//
// Needs two environment variables (set as GitHub Actions secrets):
//   NOTION_TOKEN     – the integration's "Internal Integration Secret"
//   NOTION_DATABASE  – the database ID (the 32-character part of its URL)
//
// Database properties used:
//   Title (title) · Dek (text) · Date (date) · Published (checkbox)
//   Slug (text, optional) · Excerpt (text, optional)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const API = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^(https?:|mailto:|#|\/)/i.test(u || '') ? u : '#');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'post';
}

async function notion(token, path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 429 && attempt < 5) { await sleep(1000 * (attempt + 1)); continue; }
    const json = await res.json();
    if (!res.ok) throw new Error(`Notion ${path}: ${res.status} ${json.message || ''}`);
    return json;
  }
}

async function paginate(token, path, body) {
  const out = [];
  let cursor;
  do {
    const page = body
      ? await notion(token, path, { ...body, start_cursor: cursor })
      : await notion(token, path + (cursor ? (path.includes('?') ? '&' : '?') + 'start_cursor=' + cursor : ''));
    out.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return out;
}

function richText(rt = []) {
  return rt.map((t) => {
    let s = esc(t.plain_text).replace(/\n/g, '<br>');
    const a = t.annotations || {};
    if (a.code) s = `<code>${s}</code>`;
    if (a.bold) s = `<strong>${s}</strong>`;
    if (a.italic) s = `<em>${s}</em>`;
    if (a.strikethrough) s = `<s>${s}</s>`;
    if (a.underline) s = `<u>${s}</u>`;
    const href = t.href || t.text?.link?.url;
    if (href) s = `<a href="${esc(safeUrl(href))}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${s}</a>`;
    return s;
  }).join('');
}
const plain = (rt = []) => rt.map((t) => t.plain_text).join('');

// Downloads Notion-hosted images (their URLs expire) into _site/assets/notion/.
async function saveImage(block, outDir) {
  const img = block.image;
  const url = img.type === 'external' ? img.external.url : img.file.url;
  if (img.type === 'external') return url;
  const ext = (extname(new URL(url).pathname) || '.jpg').toLowerCase();
  const name = block.id.replace(/-/g, '') + ext;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download image ' + block.id);
  mkdirSync(join(outDir, 'assets/notion'), { recursive: true });
  writeFileSync(join(outDir, 'assets/notion', name), Buffer.from(await res.arrayBuffer()));
  return 'assets/notion/' + name;
}

async function renderBlocks(token, parentId, outDir) {
  const blocks = await paginate(token, `/blocks/${parentId}/children?page_size=100`);
  const html = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const kids = b.has_children && !['child_page', 'child_database'].includes(b.type)
      ? (await renderBlocks(token, b.id, outDir)).join('') : '';
    const v = b[b.type] || {};
    switch (b.type) {
      case 'paragraph': {
        const t = richText(v.rich_text);
        if (t) html.push(`<p>${t}</p>${kids}`);
        break;
      }
      case 'heading_1': case 'heading_2': html.push(`<h2>${richText(v.rich_text)}</h2>`); break;
      case 'heading_3': html.push(`<h3>${richText(v.rich_text)}</h3>`); break;
      case 'bulleted_list_item': case 'numbered_list_item': case 'to_do': {
        // Group consecutive items of the same type into one list.
        const type = b.type, tag = type === 'numbered_list_item' ? 'ol' : 'ul';
        const items = [];
        let j = i;
        for (; j < blocks.length && blocks[j].type === type; j++) {
          const it = blocks[j], iv = it[type];
          const sub = j === i ? kids : it.has_children ? (await renderBlocks(token, it.id, outDir)).join('') : '';
          const box = type === 'to_do' ? (iv.checked ? '☑ ' : '☐ ') : '';
          items.push(`<li>${box}${richText(iv.rich_text)}${sub}</li>`);
        }
        i = j - 1;
        html.push(`<${tag}${type === 'to_do' ? ' style="list-style:none;padding-left:0"' : ''}>${items.join('')}</${tag}>`);
        break;
      }
      case 'quote': html.push(`<blockquote><p>${richText(v.rich_text)}</p>${kids}</blockquote>`); break;
      case 'callout': html.push(`<blockquote><p>${v.icon?.emoji ? v.icon.emoji + ' ' : ''}${richText(v.rich_text)}</p>${kids}</blockquote>`); break;
      case 'toggle': html.push(`<details><summary>${richText(v.rich_text)}</summary>${kids}</details>`); break;
      case 'code': html.push(`<pre><code>${esc(plain(v.rich_text))}</code></pre>`); break;
      case 'divider': html.push('<hr>'); break;
      case 'image': {
        const src = await saveImage(b, outDir);
        const cap = plain(v.caption);
        html.push(`<figure><img src="${esc(src)}" alt="${esc(cap)}" loading="lazy">${cap ? `<figcaption>${richText(v.caption)}</figcaption>` : ''}</figure>`);
        break;
      }
      case 'bookmark': case 'embed': case 'link_preview': case 'video': case 'file': case 'pdf': {
        const url = v.url || v.external?.url || v.file?.url;
        if (url) html.push(`<p><a href="${esc(safeUrl(url))}" target="_blank" rel="noopener">${esc(plain(v.caption) || url)} ↗</a></p>`);
        break;
      }
      case 'equation': html.push(`<p><code>${esc(v.expression)}</code></p>`); break;
      case 'column_list': case 'column': case 'synced_block': if (kids) html.push(kids); break;
      default: break; // tables of contents, breadcrumbs etc. are skipped
    }
  }
  return html;
}

export async function loadNotionPosts({ token, database, outDir, makePost }) {
  const pages = await paginate(token, `/databases/${database}/query`, {
    filter: { property: 'Published', checkbox: { equals: true } },
    page_size: 100
  });
  const posts = [];
  for (const page of pages) {
    const p = page.properties;
    const title = plain(p.Title?.title);
    const date = p.Date?.date?.start?.slice(0, 10);
    if (!title || !date) { console.warn(`! Skipping a Notion post without a ${title ? 'Date' : 'Title'}`); continue; }
    const blocks = await renderBlocks(token, page.id, outDir);
    posts.push(makePost({
      slug: slugify(plain(p.Slug?.rich_text) || title),
      title,
      dek: plain(p.Dek?.rich_text),
      date,
      excerpt: plain(p.Excerpt?.rich_text),
      blocks
    }));
  }
  return posts;
}
