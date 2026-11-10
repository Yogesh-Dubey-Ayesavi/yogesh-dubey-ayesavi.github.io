---
title: The TPS Alter System: buying time inside a token stream
dek: How we put an ad into a live AI response without the text ever freezing.
date: 2025-10-22
---

When an AI answer streams in, the text arrives token by token. Put an ad in the middle of that and you hit a problem right away.

To pick a good ad you need to know what the answer is about. You need an auction, and a few sentences to lead into the ad and back out of it. All of that takes time, often 200 to 800 milliseconds or more. The naive fix is to pause the stream until the ad is ready. The text freezes mid-sentence, and the reader notices.

Our answer is the TPS Alter System. TPS means tokens per second. We wrote it up with my co-authors in a paper, [A Comparative Analysis of the TPS Alter System](https://rjwave.org/jaafr/papers/JAAFR2511467.pdf), published in the Journal of Advance and Future Research.

**The idea: slow the display, not the model**

We cannot make the ad server faster. Network calls take the time they take. But we can change how that time looks to the reader.

So we separate two clocks: how fast the model writes, and how fast the reader sees it. If the display runs a little slower than the model, a buffer of unseen tokens builds up. We call it a time bank. The backend spends that time on the ad while the reader keeps reading.

The paper's example: the model writes at 60 tokens a second and we show 45. We bank 15 tokens every second. After about 3 seconds that is roughly a second of buffer, enough to cover a 600 millisecond ad lookup.

**Four parts**

- **Receiver** takes in tokens and measures the model's normal speed.
- **Spotter** looks ahead for a natural place for the ad, like a paragraph break. It scores spots by how clean the break is, how far into the answer it falls, and how well the text matches the ad.
- **Candidate Generator** writes the short bridge into the ad and back out.
- **Releaser** decides how fast tokens go to the screen. It has four modes: normal, slow down while analysing, inject, and speed up gently to catch up.

**It adapts**

The Releaser watches how far ahead the analysis is compared with what the reader has seen. If the ad server is slow, it slows the stream more. If it is very slow, it moves the ad to the next sentence boundary instead of stalling. It never stops completely, because a slow stream feels like thinking and a stopped one feels like a crash.

**What we measured, and what we did not**

We tested in a simulation: a model at 50 tokens a second, an ad server averaging 600 milliseconds, and three baselines. With blocking, the worst gap between tokens was about 620 milliseconds. With TPS Alter it was about 45. The paper reports over 90 percent less perceived latency trouble.

That is a simulation, not a study with readers. We did not test with real people yet. Our own next step is to adapt the slowdown to how fast each reader actually reads.

The lesson I keep from this: you cannot beat the network, but you can decide how waiting feels.
