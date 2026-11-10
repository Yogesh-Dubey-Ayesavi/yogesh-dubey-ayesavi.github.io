---
title: Brabble.ai: one list for every hackathon deadline
dek: A student should not need six tabs to find the thing that closes tomorrow.
date: 2026-09-07
---

If you are a student in India looking for a hackathon, you probably have six tabs open. One platform does not list the contests of another, and the one that closes tomorrow is always on the tab you did not check.

Brabble.ai is the merge. It is a live index of hackathons, case competitions, coding contests, quizzes and design challenges that are still open for registration. It pulls from 16 platform feeds and sorts everything by deadline. It is free, you do not need an account, and every card links straight to the organiser.

**Built to keep working when a source breaks**

Sources fail all the time. A site changes its layout, or an API goes down. The list refreshes daily, and it keeps the last good rows for every source. If a feed fails, you see slightly old data and not an empty page. Stale is better than empty.

**Who it is for**

The biggest group is college students, especially in smaller cities, who want wins for their resume and are always short of time. But the niche I like best is school students. Nearly every list assumes you are at university. A 15 year old who searches for hackathons for school students gets pages of events that will reject them. Brabble already has the eligibility data, so it can answer that question properly.

Competitive programmers use it too, to see when the next Codeforces or CodeChef round starts. Club and E-Cell leads matter in another way. One lead reaches 200 students, so I treat them as a way to spread the word, not as the main user.

**What I check every week**

Two scripts watch the site's health in search. One fetches the key pages as Googlebot would and fails if a page is missing a title, a canonical tag or a robots tag, or if it is blocked from indexing. The other asks Google Search Console about every URL in the sitemap and flags any page where Google picked a different canonical than we declared. A third script crawls the site and fails on broken internal links.

**An analytics lesson**

When I audited the analytics, the "add to calendar" event showed up in only 0.24 percent of sessions. That looked like nobody cared. Then I found the same intent was being tracked under five different event names. People were adding deadlines to their calendar, we were just counting them in five places. I wrote down a catalogue of all five and what triggers each. It is a small thing, but it changed how I read the numbers.

I am building this in public, so I will keep writing about what works and what does not.
