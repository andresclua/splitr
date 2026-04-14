---
title: Why Most A/B Test Results Are Wrong (And How to Fix It)
description: False positives aren't just a stats problem — they're a business problem. Here are the four most common ways A/B tests produce misleading results, and how to fix each one.
date: 2025-11-24
author: Koryla Team
slug: ab-test-results-are-wrong
---

A large-scale internal analysis at Microsoft found that roughly two-thirds of ideas their teams were confident would improve metrics actually had neutral or negative effects when tested rigorously. Booking.com, which runs hundreds of experiments simultaneously, has published similar findings. These are companies with dedicated experimentation platforms and statisticians on staff.

If they're getting it wrong at that rate, the average growth team running tests in Optimizely or VWO — without defined stopping rules, without pre-calculated sample sizes, often with a single analyst checking results every morning — is probably wrong more often than they're right.

Here are the four specific failure modes and how to fix them.

## 1. The peeking problem

You launch a test on Monday. By Wednesday, Variant B is up 12% and the dashboard shows 94% confidence. You check again Thursday — still at 94%. Friday morning it hits 95%. You ship it.

This is almost certainly a false positive.

When you check your results repeatedly and stop the moment you cross a significance threshold, you're performing multiple hypothesis tests on the same data. Each time you "peek," you create another opportunity to mistake random variation for a real signal. The math is unforgiving: if you check daily and stop at 95% confidence whenever you see it, your actual false positive rate can exceed 40%.

The fix is committing to a sample size before the test starts and not looking until you've hit it. Calculate based on your baseline conversion rate, the minimum lift you actually care about (not the maximum you hope for), your desired confidence level, and 80% statistical power. Use a calculator like Evan Miller's or the one built into your testing tool. Then ignore the dashboard until you're done.

If watching a running test without acting on it is genuinely impossible for your team, sequential testing methods (specifically SPRT or always-valid p-values) let you check continuously while keeping false positive rates controlled. But these require implementation support — they're not the same as the standard dashboard view.

## 2. Multiple comparisons

"The test didn't win overall, but it won for mobile users in Germany."

Post-hoc segmentation is a false positive generator. If you test enough subgroups, one of them will show statistical significance by chance. With standard 95% confidence and 20 subgroups, you expect one false positive simply from probability.

The same problem applies to multiple metrics. If you're measuring conversion rate, revenue per visitor, signup rate, time on page, and scroll depth — and you call a "win" if *any* of them reaches significance — you've dramatically inflated your error rate.

The fixes are straightforward but require discipline up front:

- Define one primary metric before the test launches. This is the one you'll use to make the ship/no-ship decision.
- Define one or two secondary metrics you'll observe but won't act on alone.
- If you want to test subgroup effects, design a separate experiment with that subgroup as the primary audience and calculate sample size accordingly.

When Booking.com runs experiments, they require teams to specify their primary metric in the experiment brief before the test is approved. That constraint alone eliminates most multiple comparisons problems before they happen.

## 3. The novelty effect

New things attract attention. When you change your hero headline or rearrange your pricing page, some users notice the difference. That noticing — not the quality of the change — drives early engagement.

The novelty effect typically inflates variant performance for the first 7–14 days. If you run a two-week test and stop at day eight because it's "clearly winning," you may be measuring the novelty, not the design.

This is particularly acute for returning users. First-time visitors have no baseline to compare against, so novelty doesn't affect them the same way. But if your experiment traffic is heavily weighted toward returning users — common on SaaS product pages with high repeat visit rates — the novelty effect can dominate early results.

The fix: run for a minimum of two complete business cycles (usually two weeks), and look at lift over time. If the variant's advantage is shrinking each week, you're watching novelty decay. Real improvements tend to hold or grow as users habituate to both versions.

## 4. Underpowered tests

The mirror image of running too short is running a test that was never going to produce reliable results regardless of how long you waited.

An underpowered test — one where your traffic volume is too low relative to the effect size you're trying to detect — will produce noisy results. You'll hit your sample size target, declare no winner (or a winner), and have low confidence the conclusion is accurate.

Consider: your checkout page converts at 3.2%. You want to detect a 10% relative lift (to 3.52%). At 95% confidence and 80% power, you need roughly 24,000 visitors *per variant*. If your checkout page sees 3,000 visitors a week, that's a 16-week test. Most teams abandon it after three weeks when nothing looks significant.

The right response is to raise the minimum detectable effect to something you can actually measure given your traffic. A 10% lift on 3.2% is 0.32 percentage points. Maybe what you can realistically detect, given your traffic, is a 25% relative lift. If a 25% lift is meaningful to your business, test for that. If it's not, the test may not be worth running at all.

This isn't a failure — it's an honest assessment. Low-traffic pages should get structural improvements, not experiments.

## The meta-fix

Most of these problems have a common root: decisions made after the test starts. Peeking, post-hoc segmentation, and stopping early are all things teams do because they didn't make a firm commitment before launch.

The experimental brief — written before a test is built — is the single highest-leverage practice for improving test quality. It should specify: the hypothesis, the primary metric, the minimum detectable effect, the required sample size, the planned run duration, and the decision rule. If you can't answer those questions before the test launches, you're not ready to test.

**Practical takeaway:** Write the decision rule before you write the test. What outcome will make you ship? What outcome will make you stick with control? If you can answer both questions with specific numbers before the test runs, your results will be worth trusting.
