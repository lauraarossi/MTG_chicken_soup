---
name: feedback-cost-warnings
description: User wants a cost warning before any action that charges money (API calls, cloud services, etc.)
metadata:
  type: feedback
---

Warn the user before doing anything that will cost money — API calls, cloud GPU usage, hosted services, etc. Include a rough cost estimate when possible.

**Why:** User asked explicitly: "anytime we're about to do something that costs money, I want you to warn me."

**How to apply:** Before making or recommending a configuration that incurs per-use costs (e.g. switching to a paid API, spinning up cloud infra, running a training job), pause and give a cost estimate with the option to choose a cheaper alternative. Code changes themselves don't cost money; running them does — warn at the point where actual spending would begin.
