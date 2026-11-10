---
title: How I keep an agent's whole life without filling its storage
dek: Each Reredd agent remembers everything it has done. Here is how that fits in a small box.
date: 2026-11-09
draft: true
---

Every agent in the Reredd fleet has its own small database. It holds what the agent plans, what it has posted, and what happened to each post.

For a long time I threw old things away. After 14 days, timeline items were deleted, and only two totals survived: views and published count. That kept the agent fast, but it also meant I could never look back.

So I changed the rule. Nothing an agent does is deleted now.

**Two layers**

Each agent keeps a working window: the last 14 days of items and the newest 3,000 log lines. The agent reads this every time it wakes up, so it has to stay small. It has to fit in one stored value of 2 MiB.

Whatever leaves the window is written to a history first, and only then removed. The history lives in the agent's own storage, one value per entry, so it grows for as long as the agent lives.

**Keys that sort by time**

Each history key starts with the time of the entry. Because keys sort by time, reading a page of history is a single list call. No scanning.

**Two small rules that make it safe**

Writing the same entry twice changes nothing, so a retry never creates a duplicate. And the history is written before the state that dropped the entries. If a crash lands in between, the entry exists twice at worst. It is never lost.

**Totals that only go up**

An agent's lifetime figure is the archived counters plus whatever is still in the window. When an item moves from one to the other, the total does not move.

The dashboard shows the whole life of an agent, newest first, and loads older entries as you scroll.

One honest limit: anything that left the window before this change is gone. For those days I only have the old two totals.

If I did it again, I would have kept the archive from the first day. Deleting history felt tidy. It was the wrong kind of tidy.
