---
title: Feature Flags vs A/B Tests — They're Not the Same Thing
description: Teams often use feature flags and A/B tests interchangeably. They solve different problems. Conflating them leads to bad decisions.
date: 2026-04-02
author: Andrés Clúa
slug: feature-flags-vs-ab-tests
---

Both feature flags and A/B tests involve showing different things to different users. That surface similarity causes a lot of confusion — and some genuinely bad practice.

Here's the distinction that matters.

## What feature flags are for

A feature flag is a **deployment mechanism**. It lets you ship code to production without activating it for all users. The primary use cases:

- **Gradual rollout** — deploy to 5% of users, watch error rates, expand if stable
- **Kill switch** — if something breaks, disable the feature without a deploy
- **Internal testing** — enable for employees or beta users only
- **Segment targeting** — show a feature to users on a specific plan or geography

Feature flags answer the question: **can this feature be safely shown to users?**

The measurement is operational — errors, crashes, performance. Not conversion rate. Not engagement. You're asking "did we break anything?", not "is this better?"

## What A/B tests are for

An A/B test is a **decision mechanism**. It answers whether one version of something produces better outcomes than another, measured on a specific metric.

A/B tests require:
- A clear hypothesis
- A primary metric defined before the test
- A sample large enough to produce statistical significance
- A fixed duration to avoid peeking bias

A/B tests answer the question: **which version drives better outcomes?**

## Where teams go wrong

**Using a feature flag as an A/B test**

Teams ship a feature to 50% of users with a flag, call it an "experiment," and declare a winner based on whichever metric happens to look good in a dashboard. This isn't an A/B test. It's a feature flag with sloppy measurement.

The problem: no pre-defined primary metric, no sample size calculation, no control over test duration. You end up with data that looks like an experiment but can't support causal conclusions.

**Using an A/B test as a rollout mechanism**

Keeping an experiment running after a winner is declared — because the flag infrastructure is the same as the testing infrastructure — means users are being assigned to a "loser" variant indefinitely. Ship the winner, end the test, remove the code branch.

## The right tool for each job

| Situation | Use |
|---|---|
| Shipping a new feature safely | Feature flag |
| Testing if new copy converts better | A/B test |
| Enabling a feature for beta users | Feature flag |
| Testing two pricing page layouts | A/B test |
| Gradual rollout to reduce risk | Feature flag |
| Testing button color | A/B test |
| Kill switch for a broken feature | Feature flag |
| Testing a new onboarding flow | A/B test |

## Where they legitimately overlap

There's a valid intersection: **long-running experiments on user-facing features** where the rollout period doubles as a test period.

Example: you're shipping a redesigned onboarding flow. You want to know if it improves 7-day retention before fully committing. You roll it out to 50% with a feature flag and treat that rollout as a formal A/B test — with a pre-defined metric (7-day retention), a sample size calculation, and a fixed evaluation date.

This works if you maintain the discipline of the A/B test. The flag is the mechanism; the experiment is the framework you apply on top of it.

## How Koryla handles this

Koryla is an A/B testing tool, not a feature flag system. The distinction shapes every product decision: variant assignment is random (not targeted), duration is experiment-scoped (not indefinite), and the output is a conversion rate comparison (not a deployment status).

For feature flags, tools like LaunchDarkly, Unleash, or Flagsmith are built specifically for that use case. Using the right tool for each job produces cleaner data and cleaner code.
