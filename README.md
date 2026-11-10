# Yogesh Dubey — blog

Live at **https://yogesh-dubey-ayesavi.github.io**. Every push to `main` rebuilds and publishes the site (see the **Actions** tab).

## Write a new post

1. On GitHub, open the `posts` folder → **Add file → Create new file**.
2. Name it like `my-new-post.md`. The name becomes the link: `#/post/my-new-post`.
3. Start the file with this block, then write in Markdown below it:

```markdown
---
title: My new post
dek: One line that sits under the title.
date: 2026-11-06
---

First paragraph.

## A subheading

More text, **bold**, [links](https://example.com), lists, quotes and code all work.
```

4. **Commit changes**. The site updates in about a minute.

Optional front matter lines:

- `draft: true` keeps the post off the site until you remove it.
- `excerpt: ...` sets the preview text on the Writing page (otherwise it uses the first two paragraphs).

Posts are sorted by `date`, newest first. To edit or delete a post, open its file and use the pencil or trash icon.

## Edit everything else

`content/site.json` holds the email address, About-page timeline, facts, skills and contact links. Edit it on GitHub the same way. Keep it valid JSON: quotes around text, commas between items. If it breaks, the Actions run fails and the live site stays as it was.

Images go in `assets/`. Reference them as `assets/name.jpg` (for example in a project's `"src"`, or in a post as `![alt](assets/name.jpg)`).

## Preview on your computer

```sh
npm install        # first time only
npm run preview    # builds, then serves at http://localhost:8000
```
