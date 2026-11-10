---
title: Cohostly: drag in a folder, get a live link
dek: How I am building a simple home for small apps, and why I made snapshot watch an app run before deployment.
date: 2026-10-30
---

I have made a lot of small tools. a page for a friend. a demo for a meeting. a script that solves one problem. most of them stayed on my laptop because putting them online felt like a second project

Cohostly is my answer. you bring an app, get a live link and choose who can open it or edit it. I wanted sharing an app to feel as easy as sharing a document

## What Cohostly gives you

- **A CLI.** The commands are `snapshot`, `check`, `deploy` and `share`. they take a local app from a running folder to a link you can send
- **An SDK.** Code running on the platform can check who is calling and use platform features such as AI, data and scheduled jobs through typed methods
- **Skills for AI agents.** Short instruction files explain how an agent can prepare an app for Cohostly and share it
- **A sharing layer.** The platform handles access and the bindings around an app. compute comes from E2B

I first tried to run the compute myself with Firecracker microVMs and Kubernetes on GCP. that version worked, but keeping machines running took attention away from the problem I wanted to solve. I moved to renting compute and focused on the link, access and tools around it

## The hard part was learning what an app needs

A hosting platform needs to know how to build an app, which port it opens and which environment values it needs. Railpack can read a project and make a build plan. I use it inside Cohostly. But while trying my own apps, I kept seeing two gaps. the plan could miss the real port or the environment values needed when the app started

That is why I built `snapshot`, a part of the Cohostly CLI that we call Capturely internally. On October 28, 2026, I had the snapshot flow that watches the app run and adds what it sees to the Railpack plan

```sh
cohostly snapshot -- npm start
cohostly check
cohostly deploy
```

Here is what the snapshot does

1. It starts the app with the command you give it and waits for a listening port
2. It checks a page so it can record how the running app responds
3. It records the environment values used to start it
4. It asks Railpack for the build plan and runs the real build in a scratch copy to find build time needs
5. It chooses a machine size and writes the result into `.cohostly/`

Railpack plans from the project files. snapshot adds evidence from the running app. if a detail is still unclear, it leaves a `TODO(cohostly)` note in the Dockerfile. deployment stops until that is answered or you choose to force it

## Check before you share

`cohostly check` builds the snapshot on your machine and compares the running container with the original app. it needs Docker. it is optional because Cohostly can also build the snapshot for you, and `snapshot` itself does not need Docker

Environment values are sealed for deployment. the plain local copy stays in a file ignored by git. I also keep three rules in the project. there is one way into the compute provider, nothing durable lives in a container, and secrets must stay out of the app bundle

## Where it stands

The CLI and SDK are still at version 0.x, so their interfaces can change. the local tools run on macOS and Linux with Node 20 or newer. Windows users can use WSL2. the SDK is for TypeScript and JavaScript today

The simple idea behind all this is to let a small app leave your laptop without turning deployment into a project of its own. I am building it at [cohostly.cloud](https://cohostly.cloud)
