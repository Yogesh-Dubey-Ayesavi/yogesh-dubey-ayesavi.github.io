---
title: Reredd AI Agents That Hang Out on Reddit Like Real People.
dek: How trying to grow brabble.ai turned into a reddit client, an account bank and a fleet of agents
date: 2026-11-02
---

## Why Reddit matters now

People used to discover products through television. then attention moved to Instagram and other social platforms. now many people ask an AI tool what to use before they even open a search result. those answers often draw on real discussions from places like reddit

One number made us pay attention. in a [Semrush study of AI citations](https://www.semrush.com/blog/most-cited-domains-ai/), ChatGPT cited reddit in close to 60% of the responses in its sample in early August 2025. that was a moment in one study, not a permanent share of all AI answers. the same study saw it fall to around 10% by mid September. [OpenAI has also said](https://openai.com/index/openai-and-reddit-partnership/) it would bring reddit content into ChatGPT. the numbers move, but the point remains: conversations on reddit can become part of how people discover and judge a product

For a company, a useful reddit presence can do three different jobs

- **Direct discovery.** Someone reads a reply and visits the product
- **Search discovery.** A relevant discussion can appear when someone searches for the problem
- **AI discovery.** An AI answer may cite a thread or mention a product people discussed there

People call the last part **GEO**, or generative engine optimization. some call it AI SEO. a link from a forum can bring a visitor, but it does not guarantee a ranking or an AI mention. Google recommends marking links in user posts as [user generated content](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links), and its [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) still comes back to useful content. for us, the important thing was being present where the real questions were being asked

## The obvious way to do it

You can ask your team to post and reply. you can hire an agency that gives the work to 2 or 3 people, or 20 to 30 people when the campaign is larger. people find relevant threads, read the rules, write replies, track what happened and come back when someone responds

That can work. it is also slow and hard to scale

- Someone has to judge every thread before writing
- Every community has its own rules and tolerance for promotion
- Every account needs time and a history outside the campaign
- The same product mentioned again and again starts to look like an ad
- Even careful manual work can still end with removals or a suspended account

The problem is not how to send more comments. it is how to make a good decision for each comment and how to stop when the decision is wrong

## Our case with brabble.ai

We built [brabble.ai](https://brabble.ai) to help students find hackathons and competitions before registration closes. reddit was one of our biggest sources of visitors. people were asking about events, deadlines and where to find opportunities. we had a product that could help and we wanted to tell them about it

We tried doing this ourselves. even a post written by one of us could lead to an account suspension. once an account was gone, the conversations and the work around it were gone too. asking more people to do the same thing did not solve the basic problem. we still had to find the right place, write something useful and watch the health of each account

So we started building what became **reredd**. the first job was simply to make our own tools able to interact with reddit. only after that could we think about a fleet

## First we had to build the core

Reddit was not an easy service to build against. we ran into CAPTCHAs during account setup, network blocks, sessions that stopped working and requests that were treated differently from a normal browser session. data center addresses were another problem. every failure could look similar from the outside even when the cause was different

We built a shared reddit client around the web interactions our accounts needed. the product does not depend on the official public reddit API for these actions. the same client is used by our command line tool and the fleet. we then exposed fleet operations through MCP so another agent could ask for a campaign, inspect an account or read results without us building a new integration each time

The core had to answer plain questions before any automation could be trusted

1. **Is this account still signed in?**
2. **Can it read the community and its rules?**
3. **Did reddit accept the action or reject it?**
4. **Was the failure temporary, or should we stop?**

Getting those answers right took more work than sending the action itself

## The network and proxy problem

The fleet runs in cloud infrastructure, but reddit can block or challenge traffic from data center networks. account setup in a browser also brings CAPTCHA and other checks. we had to separate these network problems from a bad session or a genuinely suspended account

We added a proxy gateway between agents and reddit. an agent uses its own assigned route, and the gateway records the traffic used by its requests. when a route fails, the system reports the failure instead of silently using a different path. linked devices handle the browser work needed during account setup and verification. the exact network path is part of the infrastructure, not part of what the writing agent has to decide

## Account creation is its own pipeline

We did not want a person to make every new account, open a different inbox, wait for the email and copy the code into a browser. that would put the same manual bottleneck back into the system. so we built account requests and a linked device worker around our own mail service

The browser worker uses Puppeteer to control Chrome or another Chromium browser. it opens Reddit's signup page, fills the form, waits for the email code from our connector and completes the steps in the browser. this was browser automation, not an API call that could create an account in one request

Here is the flow when we request new accounts

1. **Ask the fleet for a number of accounts.** The bank turns that request into separate registration jobs. the dashboard, MCP and Telegram can follow the progress
2. **Give a job to a linked computer.** A linked device checks for work and takes one job. this keeps browser based signup work on a device that can run Chrome
3. **Create an inbox.** The fleet chooses one of the email domains our connector manages. the device asks our email service for a fresh address on that domain
4. **Route the mail.** Our email connector creates the mail redirect that sends messages for that address to the connected inbox. the signup script does not need someone to open Gmail by hand
5. **Finish signup in Chrome.** Puppeteer enters the address and follows Reddit's browser flow. the email connector reads the incoming message and gives the six digit Reddit code to the script. Puppeteer enters that code in Chrome
6. **Check the result.** A successful account is saved with its session and put in the account bank. a failed or incomplete attempt is reported as a failed job instead of silently counting as a new agent

<figure class="blog-figure blog-diagram"><img src="assets/reddit-account-creation.svg" alt="Account request moves through a linked device, Chrome, our mail connector and the idle account bank"><figcaption><strong>Account creation.</strong> the request, browser signup and mail verification are one flow. becoming an active agent happens later</figcaption></figure>

This is how we can request a batch without treating account creation and campaign work as the same task. the bank holds a new account idle. only when we claim and configure it does it join the active fleet

The mail side needed its own failure handling

- **Codes and links.** The connector can identify both in incoming mail. Reddit registration uses the six digit code
- **Late email.** An inbox can be kept for a retry so a delayed code is not lost
- **A struggling domain.** Jobs are spread across the available email domains and a failing one can rest
- **A Reddit failure.** A CAPTCHA or network block is recorded separately from a mail delivery failure so we fix the right part

## Then we built the fleet

One account can only do so much, and one account can disappear. we gave each account its own agent with its own state. a campaign manager decides which agents fit a product and how work should be shared. the account bank holds accounts that are ready but not yet working. Telegram and the dashboard show us what is happening

<figure class="blog-figure blog-diagram"><img src="assets/reddit-fleet-architecture.svg" alt="Goal goes to the campaign manager, which requests an account from the bank or assigns an existing agent. The bank supplies accounts to agents"><figcaption><strong>How the parts connect.</strong> the goal goes to the campaign manager. it can assign an existing agent or request an account from the bank. one account becomes one agent</figcaption></figure>

<figure class="blog-figure"><img src="assets/reredd-fleet-overview.png" alt="Fleet dashboard showing active agents, karma, impressions and individual account cards"><figcaption><strong>The fleet view.</strong> this is where we see who is running, who needs attention and what each account has done</figcaption></figure>

The fleet is not one prompt sent from many accounts. every agent has its own account, interests, communities, pace, memory and limits. if one agent is stopped, the others do not lose their own histories

## The hardest part was the agent itself

We could give a model a product name and ask it to comment. it would usually write something generic. sometimes it sounded like a polite assistant. sometimes it forced the product into a thread where nobody asked for it. those are exactly the replies people ignore, remove or report

For the first agent we had to curate four things by hand, then turn them into a repeatable setup

- **Persona.** Who is this account, what does it know and what kind of language does it use?
- **Niche.** Which subjects and communities fit that background?
- **Memory.** What has it read, said and learned from earlier conversations?
- **Boundaries.** What must it never post, and when should it only read or leave?

The agent reads the post and its replies before deciding whether to speak. it can answer the original post or a particular person in the comments. a campaign reply is checked for topic fit, community rules and promotional wording before publication. a draft can be rejected. no post is a valid result

<figure class="blog-figure"><div class="blog-shot-window shot-persona"><img src="assets/reredd-dashboard-6.png" alt="Cropped dashboard view of an agent persona background and category"></div><figcaption><strong>Persona settings.</strong> a background and category give the agent a narrower world to speak from</figcaption></figure>

This is still the part we watch most closely. a persona does not make a generic comment useful by itself. the writing has to answer the actual question in front of it

## The scheduler plans sessions, not a fixed posting time

Our early version moved too fast and accounts were noticed within days. a fixed timer made the pattern too predictable. we changed the scheduler so it plans several separate sessions across a day in the account's local time

- **When to wake up.** Start times vary with the time of day. sessions have space between them, and some days have no session at all
- **What happens in one sitting.** The agent opens a feed, reads posts and replies, and may browse without acting. it may vote on one thread, comment on another and keep reading. the order and mix change from session to session
- **When to publish a post.** An organic post is an optional slot in a session, decided separately from the browse, vote and comment mix. it is not forced into every sitting
- **How much to do.** Daily limits are split unevenly across sessions. comments have their own gaps, and campaign replies are spread across sessions instead of going out together
- **How a new account starts.** The first days are quiet and focused on reading and voting. comments grow gradually as the account gets older

For example, one session might only read a few threads and vote. another might read, leave one useful comment and later publish a post if there is a good reason to do so. the scheduler plans the opportunity. the agent still has to judge the actual thread and can decide to say nothing

<figure class="blog-figure"><div class="blog-shot-window shot-schedule"><img src="assets/reredd-dashboard-8.png" alt="Cropped dashboard view of sessions per day, days off, timezone and quotas"></div><figcaption><strong>The schedule.</strong> the settings show sessions, days off, timezone and the limits that shape an account's day</figcaption></figure>

## Campaign work has a cost

The scheduler decides when an agent can work. a separate credit system decides how much promotion it can do. these credits are internal limits, not money. we gave more exposed actions a higher cost so one account cannot spend a whole week making risky posts

| Campaign action | Credit cost | Why it costs that much |
| --- | ---: | --- |
| New post | 30 | It starts a new public thread and has the most exposure |
| Follow up reply | 7 | It returns to a conversation after the first promotion |
| Top level comment | 5 | It puts the product directly under a post |
| Reply inside a thread | 4 | It joins an existing conversation |
| Normal reading, voting or non-campaign work | 0 | It is outside the campaign credit wallet |

Every agent has its own weekly wallet. each campaign receives a share of that wallet. before a promotional draft goes out, the system checks both balances, the account's eligibility and the community rules. if either balance is too low, the action does not go out. credits are reserved before publication and returned if publication fails

An agent needs more than 30 karma to take part in campaigns. a new campaign post needs at least 75 karma. the campaign manager also checks whether the agent's niche and communities fit the campaign. one campaign normally cannot place more than a quarter of its requested credits with one agent when enough agents are available

## Agents earn more capacity by doing good work

The weekly cycle gives each eligible agent new credits and then shares them among active campaigns. the amount starts from its planned or recent comment activity, scaled by the allowed campaign intensity and the account's maturity. a new account earns little while it is warming up. a suspended account earns no campaign credits

The performance score changes that weekly amount. its multiplier runs from 0.5 to 1.5. the formula has five factors

- **Engagement.** Do people vote for its comments?
- **Karma.** Did the account gain karma during the week?
- **Conversation mix.** Does it answer people across different threads instead of repeating the same pattern?
- **Reliability.** Did it complete its planned sessions without repeated failures?
- **Account standing.** Is it old enough and still in good standing?

The current weekly collector directly measures published comments, their votes and whether they were spread across different threads. it also checks account standing. karma gained, answer share and session reliability are in the scoring model, but this collector does not yet supply them, so those factors receive a neutral value. we do not claim to reward a signal that we are not measuring. credits are granted once per week, so running the weekly job twice cannot pay the same agent twice

The wallet is only one limit. campaign health sets a separate ceiling on the share of an agent's comments that can promote something. removed campaign comments, downvotes and poor reception cut that ceiling. a removal can stop promotion from that account for 72 hours. the ceiling drops immediately when the signals get worse and rises slowly when they improve. the fleet can also slow promotion across accounts after suspensions

<figure class="blog-figure blog-diagram"><img src="assets/reddit-campaign-credits.svg" alt="Agent activity and health determine weekly credits, campaign fit decides allocation, action cost uses the credits, and outcomes affect the next week"><figcaption><strong>The campaign credit loop.</strong> good work can earn an agent more room next week. bad outcomes reduce its room or stop promotion sooner</figcaption></figure>

If an agent has credits left but cannot promote now, the nightly plan can move its unspent allocation to another suitable agent. credits are a limit on permission to promote, not an instruction to force a reply into a thread

## Linking and the account bank

**Linking** connects a computer to the fleet. after sign in, that computer can take account setup or verification work from the bank. the operator does not have to copy secrets into every local tool

**The bank** is a waiting room for accounts. an account can be prepared, checked and held there without immediately doing campaign work. when an account is claimed, it becomes an agent. it stays paused until it is configured. that separation matters because creating an account and deciding how it should behave are different jobs

The bank and linked devices help us add capacity when needed. they do not make a banned account healthy again. the fleet still checks whether an account is signed in, active and publicly visible before trusting it

## How we know an account is in trouble

There is more than one kind of warning. we track them separately

| What we see | What it means for the fleet |
| --- | --- |
| An expired session or failed request | Pause that work and retry later after checking the cause |
| A removed or downvoted campaign reply | Lower that account's campaign allowance |
| A public profile that cannot be found | Treat it as a possible shadowban instead of healthy |
| A suspension | Stop campaign work for that account |
| Reddit's automated account label | Mark it in the dashboard and alert the operator for review |

Reddit can show an account as an unregistered automated account. we read that flag from the profile, record when it first appears and send a Telegram alert. the label is not the same as a suspension. the dashboard shows the status so we can decide whether to pause the account or send it through the linked device verification flow when that is available

<figure class="blog-figure"><div class="blog-shot-window shot-flag"><img src="assets/reredd-dashboard-9.png" alt="Cropped dashboard view with a bot flagged by Reddit account card"></div><figcaption><strong>A visible warning.</strong> the bot flag is shown on the account card instead of being hidden in a log</figcaption></figure>

## The unregistered bot problem

Reddit can mark a profile as an unregistered automated account. that is a warning about the account, not just an expired login. it may also put the account through a browser verification flow. the options Reddit presents can include linking a Google account or entering the password and creating a passkey. our linked device flow handles the password and passkey route. we did not build the Google linking route

<figure class="blog-figure blog-bot-profile"><img src="assets/reddit-unregistered-automated-account.png" alt="Reddit profile showing the App badge and the message This is an unregistered automated account"><figcaption><strong>What Reddit shows.</strong> the profile has an app badge and says this is an unregistered automated account</figcaption></figure>

The passkey step was the difficult part for us. it expects an authenticator, which is normally tied to a device. we built a second Puppeteer flow for the linked device. it opens the flagged account in Chromium, works through Reddit's browser verification screens and uses a virtual WebAuthn authenticator for the passkey step. the resulting passkey is saved with the account. replacing cookies or repeating an API request alone would not complete the verification

We built a verification job for this case

1. **An operator chooses verify on device.** The dashboard offers this when the account is bot flagged and we have the password needed for the flow. the job is queued for a linked device
2. **Puppeteer opens the account in Chromium.** It uses the account's existing session and runs the browser verification flow with a virtual WebAuthn authenticator
3. **The passkey is kept.** If the flow creates a passkey, the device returns it to the fleet's protected account storage. a later verification can reuse the saved passkey
4. **The session is refreshed carefully.** After a successful flow, the device sends back current browser cookies. the fleet replaces the stored session only if it is still the same session the job started with. a slow job cannot overwrite a newer login
5. **A failed job stays visible.** The linked device reports the failure so it can be reviewed or retried. we do not mark an account verified simply because a browser window opened

<figure class="blog-figure blog-diagram"><img src="assets/reddit-passkey-verification.svg" alt="Unregistered automated account flag leads to a linked device verification job and a carefully refreshed session"><figcaption><strong>Unregistered bot review.</strong> the job starts from a visible flag and ends only when the verified session is safely returned to the fleet</figcaption></figure>

This is a mitigation for a specific verification challenge, not a guarantee that Reddit will accept every account. the important change is that we can see the flag, take a deliberate action and keep the resulting credentials with the right agent

## The backoff and fleet brake

When reddit pushes back, sending the same request again and again makes the problem worse. each agent has a circuit breaker. repeated failures make it wait. after the wait, it can try a limited check before normal work resumes

Campaign promotion has another layer. a removed campaign comment can stop promotion from that account for a period. poor response lowers how much promotion it can do. if an account that promoted is suspended, the fleet reduces promotion more broadly. if suspensions continue, the fleet can stop campaign promotion until a person reviews the situation

<figure class="blog-figure blog-diagram"><img src="assets/reddit-fleet-health.svg" alt="Diagram showing how one account suspension slows the fleet and repeated suspensions stop promotion"><figcaption><strong>One failure does not become thirty.</strong> the account stops first, then the fleet slows, then a wider stop can require human review</figcaption></figure>

We also keep an agent's older activity and a record of suspended accounts. that lets us compare what happened before a ban with accounts that are still healthy. the learning report suggests likely patterns and marks how confident it is. it cannot tell us with certainty why reddit made a decision, but it gives us evidence to review

<figure class="blog-figure"><div class="blog-shot-window shot-history"><img src="assets/reredd-dashboard-5.png" alt="Cropped history timeline showing an agent's comments, votes and views"></div><figcaption><strong>Account history.</strong> comments, votes, views and failures stay available when we need to understand what happened</figcaption></figure>

## Telegram is our control room

We do not want to open the dashboard all day just to see whether the fleet is okay. Telegram gives us a quick view of the roster and the accounts that need attention. it can show suspensions, a tripped circuit breaker, a quiet agent and changes in karma. campaign commands and alerts live there too

The fleet checks accounts in the background every 30 minutes. the digest is scheduled twice a day at **8:30 in the morning and 8:30 in the evening in India**. those are 03:00 and 15:00 UTC. if nothing important changed, the digest can stay quiet instead of sending an empty update

## What this became

We started with a very small question. how do we tell people about brabble.ai in the communities where they are already asking for help?

That led to a much larger system: a reddit client, a CLI, MCP tools, linked devices, an account bank, a proxy gateway, a campaign manager, agents with their own personas and schedules, and health checks that can slow or stop the fleet

The point of all that work is still simple. read the conversation, make a useful contribution when it fits, and know when to stop
