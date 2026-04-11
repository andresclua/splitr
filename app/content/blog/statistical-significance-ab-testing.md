---
title: Statistical Significance in A/B Testing — What You Actually Need to Know
description: Everyone quotes 95% confidence. Almost nobody can explain what it means. Here's the honest explanation, with practical implications for your tests.
date: 2026-02-28
author: Andrés Clúa
slug: statistical-significance-ab-testing
---

"We hit 95% confidence — ship the variant."

This sentence ends more experiments than it should. Not because 95% confidence is the wrong threshold, but because it's usually misunderstood, and misapplied.

## What confidence level actually means

A 95% confidence level means: if you ran this exact experiment 100 times under identical conditions, 95 of those runs would produce a result at least as extreme as the one you observed — assuming there's truly no difference between control and variant.

What it does **not** mean: "there's a 95% chance the variant is better."

The difference matters. The first framing is about the reliability of your *measurement method*. The second is about the truth of your *conclusion*. You can have a highly reliable measurement of a meaningless difference.

## The sample size problem

Most teams stop experiments too early. They see the variant pulling ahead and call it a win.

This is called **peeking**, and it inflates your false positive rate dramatically. If you check your results every day and stop whenever you hit significance, you'll declare a winner incorrectly far more than 5% of the time — sometimes as high as 40%.

The fix: decide your sample size before the test starts, based on:
- Your baseline conversion rate
- The minimum effect size you care about
- Your desired confidence level (95%) and power (80%)

Then run until you hit that sample size. Don't look at results until you're done. This is hard in practice but it's the only way to get reliable answers.

## Effect size is more important than significance

A result can be statistically significant and practically meaningless.

Example: your signup rate goes from 2.00% to 2.04%. With enough traffic, this will reach 95% confidence. But a 0.04 percentage point lift probably isn't worth maintaining a second page variant indefinitely.

Always ask: **what's the lift in absolute terms, and is it worth acting on?**

Conversely, a result that hasn't reached significance yet might still be worth acting on if your traffic is low and the observed effect is large. Bayesian approaches handle this better than frequentist ones — but that's a longer conversation.

## Novelty effect — the silent test killer

New things get clicks. Visitors who notice something different on your page are more likely to interact with it — not because it's better, but because it's unfamiliar.

This novelty bump typically fades after 1–2 weeks. If you stop your test after 5 days of the variant "winning", you may be measuring the novelty effect, not the actual impact of the design.

**Always run for a minimum of two full weeks.** Capture at least one complete weekly cycle — user behavior on Monday is different from Friday, and on the first of the month vs the last.

## Segmentation traps

When a test doesn't produce a clear winner, the temptation is to segment: "it didn't win overall, but it won for mobile users in the UK." 

This is almost always a mistake. You're dredging for significance in subgroups that weren't defined before the test. The more cuts you make, the more likely one of them crosses the significance threshold by chance.

Pre-register your primary metric and one or two secondary metrics before you start. If a subgroup effect is real, design a dedicated test for it with that segment as the primary audience.

## Practical checklist before calling a winner

- [ ] Did you reach your pre-determined sample size?
- [ ] Did you run for at least two full weeks?
- [ ] Is the lift large enough to matter in practice?
- [ ] Have you checked for novelty effect (look at lift over time — is it stable or declining)?
- [ ] Did you check your primary metric only, not fish for winners in subgroups?
- [ ] Is the result consistent across your main traffic sources and device types?

If all six are yes: ship it. If not: wait or re-run.

Statistics isn't the exciting part of CRO. But getting it wrong makes everything else meaningless.
