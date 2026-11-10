---
title: Monetzly: a way for free AI agents to pay for themselves
dek: Why I built an SDK that puts ads into AI responses, and what it looks like inside a coding agent.
date: 2026-01-08
draft: true
---

Free AI agents have a cost problem. Every answer costs money to produce, and the usual answer, a subscription, does not fit every tool.

The old internet solved this with ads. I wanted to see whether the same idea could work for agents, without ruining them. That became Monetzly, a side project from 2024 that later turned into my research paper.

**An SDK, on the server**

Monetzly is an SDK that adds relevant, brand-safe ads to the output of a language model, so the developer who runs the agent can earn something.

The ads are added on the server, inside the streaming response. They never go into the prompt, so they cannot change what the model thinks. And because they arrive as part of the text, an ad blocker has nothing to block.

The hard part is the stream itself. Text arrives token by token, and an ad needs time to find. That is the problem the TPS Alter System solves, and I wrote about it in [its own post](#/post/tps-alter-buying-time-in-a-token-stream). In short, we show the text slightly slower than the model writes it, so a buffer builds up, and the ad is prepared in that gap.

**Ads in a coding agent**

The second place I tried this is inside VS Code, with agents like Claude Code and Codex.

Here the idea is stricter. A plugin watches the agent and judges, each turn, whether it has hit a real pain point: the same blocker again and again, a tool that keeps failing, a stuck moment. Only then does it write a small event file into the project, under `.monetzly/events/`.

The VS Code extension watches that folder. When a real signal appears, it asks Monetzly's decision service whether a relevant ad exists. If one does, it shows a sponsored suggestion in the status bar, with the brand, a line of copy and a link. It clears itself once you have seen it.

So the ad appears when you might actually want help, and not while you are in the middle of working fine.

**Privacy by design**

The extension only reads `.monetzly/events/` in your open project. It does not read your code or other files. The folder is kept out of `git status` automatically, so it is never committed and your `.gitignore` is untouched.

**What is still open**

This is early. The research behind the streaming part is a simulation, and the extension is version 0.1. Whether people will accept ads in agents is a question I cannot answer from my desk. But I would rather test it carefully than leave every free tool with only two options: charge money or disappear.

The paper is here: [JAAFR2511467](https://rjwave.org/jaafr/papers/JAAFR2511467.pdf).
