---
title: How to Write A/B Test Hypotheses That Actually Teach You Something
description: Most test hypotheses are too vague to be useful even when the test wins. Here's the format that produces learning, not just lift numbers.
date: 2026-03-20
author: Andrés Clúa
slug: writing-better-ab-test-hypotheses
---

"Let's test a shorter headline."

This is not a hypothesis. It's a description of a change. The difference matters more than it seems — because a vague hypothesis produces an uninterpretable result, even when the test wins.

## The anatomy of a useful hypothesis

A testable hypothesis has three parts:

1. **Observation** — what you noticed in the data or research
2. **Change** — what you're going to test
3. **Expected outcome** — what you predict will happen and why

The format: *Because [observation], changing [X] to [Y] will [outcome] because [mechanism].*

**Weak:** "We think a shorter headline will increase signups."

**Strong:** "Because session recordings show 70% of visitors don't scroll past the hero section, shortening the headline from 12 words to 6 will increase hero CTA clicks by reducing cognitive load — making the value proposition immediately legible without reading the full sentence."

The strong version tells you:
- Where the insight came from (session recordings, scroll depth)
- What specifically is being changed (word count, not just "the headline")
- What metric you expect to move (hero CTA clicks, not just "signups")
- Why you expect the change to work (cognitive load, not just "shorter is better")

## Why the mechanism matters

When your test wins, you want to know *why* it won — not just that it did. The mechanism in your hypothesis is your prediction of the causal chain. If the test confirms your predicted mechanism, you have transferable learning. If it wins for a different reason, you have a data point but not a mental model.

Example: you hypothesize that removing the phone number field from your signup form will increase completions because users are reluctant to give personal information early in the funnel. You test it, completions go up 18%.

But you also notice email verification completions go up. That doesn't fit "reluctance to share personal data" — it fits "shorter forms are less intimidating." The win is real, but the mechanism is different. Now you know something more specific: form length, not data sensitivity, was the variable.

That's a better insight to carry into the next test.

## Designing the measurement before the test

Before you start the test, write down:

- **Primary metric:** the one number that determines win or loss
- **Secondary metrics:** things to watch that might explain the result (not additional win conditions)
- **Guardrail metrics:** things that should not go down (if they do, the test failed even if the primary metric went up)

Example for a checkout flow test:
- Primary: checkout completion rate
- Secondary: time on checkout page, cart abandonment by step
- Guardrail: order value (a change that increases completions but drops average order value might be a net loss)

Defining this before the test prevents you from cherry-picking the metric that happened to win afterward.

## Building a hypothesis backlog

Good CRO programs have more hypotheses than they have time to test. The backlog should be prioritized by:

- **Potential impact** — how much traffic does this page get, how large is the drop-off you're targeting?
- **Confidence** — how strong is the evidence that this element is the problem?
- **Ease** — how much effort to build and run the test?

A simple ICE score (Impact × Confidence × Ease, 1–10 each) applied to your backlog gives you a running priority queue. Run the highest-scoring test. Add new hypotheses as you gather more data. The backlog never empties — that's fine.

## The test that teaches you something even when it loses

A well-formed hypothesis means a failed test still has value. If you predicted a mechanism, tested it, and saw no effect — you've ruled out that mechanism. That's useful. The next hypothesis can eliminate that branch.

A vague hypothesis that loses tells you nothing. You don't know if the idea was wrong, the execution was wrong, or the measurement was wrong. You can't build on it.

Write hypotheses precisely enough that you learn something either way.
