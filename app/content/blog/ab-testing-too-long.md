---
title: Why Most A/B Tests Run Too Long (And What to Do About It)
description: Tests that run for weeks or months without a conclusion aren't being thorough — they're usually underpowered from the start. Here's how to calculate runtime upfront and what to do when tests drag on.
date: 2026-04-02
author: Koryla Team
slug: ab-testing-too-long
---

There's a version of A/B testing discipline that sounds rigorous but isn't: running a test for eight weeks because you want to be sure. If your test wasn't powered correctly when you launched it, running it longer doesn't fix the underlying problem. You're just accumulating more data that supports a noisy inconclusive result.

The other problem is the business cost. An experiment that sits open for six weeks on your pricing page is six weeks where you couldn't ship the change you were testing, couldn't use that traffic to test something else, and couldn't act on what you were learning.

Most tests run too long for one of three reasons: they were underpowered from the start, nobody set a stopping rule, or the team is waiting for a result they want rather than the result the data supports.

## The underpowered test trap

A test's required runtime is determined before launch, not during it. The inputs are:

- **Baseline conversion rate:** Your current rate on the control
- **Minimum detectable effect (MDE):** The smallest lift worth caring about
- **Daily traffic to the experiment:** How many visitors hit the tested page per day
- **Confidence level and power:** Typically 95% and 80%

From these inputs, you can calculate required sample size. Divide by daily traffic per variant to get days needed.

The trap: teams define their MDE optimistically. "I think this could lift conversion by 5%." When you calculate the sample size for a 5% relative lift on a 2% baseline, you often need 80,000–100,000 visitors per variant. Few teams have that kind of traffic on a single page. So the test runs and runs, never reaching significance, while the team watches the dashboard hoping the numbers will converge.

The honest version of this calculation: what's the minimum lift that would actually change a business decision? If your pricing page converts at 2.1% and you bumped it to 2.2%, would you ship the variant? Probably not — the maintenance overhead isn't worth a 0.1pp improvement. The actual MDE that matters to your business might be 15–20% relative, not 5%.

A worked example: Baseline conversion 2%, MDE 15% relative (to 2.3%), 95% confidence, 80% power — you need approximately 9,800 visitors per variant. At 1,000 daily visitors split 50/50, that's about 20 days. Feasible. At 300 daily visitors, it's 65 days — not feasible without reconsidering the MDE or the page.

## The absent stopping rule

Many teams launch tests without writing down when and how they'll make a decision. The result: tests stay open indefinitely, checked occasionally, never formally concluded. The experiment sits in a "running" state for months while nobody remembers what question it was answering.

The fix is a mandatory stopping rule written before launch:

> "We will stop this test after 20,000 total visitors, or after 30 days — whichever comes first. If neither variant has reached 95% confidence at that point, we will ship control and close the experiment."

This sounds harsh. "What if we were about to reach significance?" If you weren't powered to reach significance in 30 days at your traffic level, you weren't going to reach it in 40 days either — not with a reliable result. The question wasn't undecided; the test was underpowered.

Setting explicit stopping rules also prevents the flip side: stopping early when you see a promising early result. Peeking and stopping when you hit significance is a well-documented cause of inflated false positive rates. The stopping rule enforces the discipline to wait.

## Business velocity and the cost of slow tests

The opportunity cost of a slow experiment isn't hypothetical — it compounds.

Suppose your product team runs four experiments per year because each one takes 8–10 weeks. A team running well-designed, properly powered experiments might run 15–20 per year on the same traffic. Over two years, the difference is 30+ learnings vs. 8. The team running more tests builds a much more accurate model of what moves their users.

The answer to "how do we run more tests without more traffic" isn't peeking or lowering your confidence threshold. It's designing smaller, more focused tests with realistic MDEs. A test that definitively answers a small question in three weeks is more valuable than a test that ambiguously answers a big question in eight.

## Sequential testing as an alternative

Standard A/B testing uses a "fixed horizon" approach: decide your sample size, collect that many observations, make a decision. This requires discipline about not looking at results early.

Sequential testing (also called "always-valid inference" or "continuous monitoring") uses different statistical methods — specifically, spending the alpha budget across multiple looks at the data — that allow you to check results continuously without inflating your false positive rate. SPRT (Sequential Probability Ratio Test) and mSPRT are the most common methods.

The practical benefit: you can stop early if a result is clear, and the statistical guarantees hold. If Variant B is dramatically outperforming control, sequential testing lets you act on that after 60% of your planned traffic rather than waiting for 100%.

The caveats:
- Sequential methods require explicit implementation in your testing platform — you can't apply them retroactively to a standard fixed-horizon test
- They require choosing a maximum sample size upfront anyway (the test has to stop somewhere)
- The statistical concepts are less intuitive, which creates communication overhead with stakeholders

Sequential testing is valuable when business velocity matters more than simplicity, and when you have a testing platform that supports it natively. For teams running experiments manually or with basic tooling, the fixed-horizon approach with strict pre-registration is more reliable in practice.

## When to call it early

Sometimes the right decision is to stop a test before it reaches the planned sample size, even if the stopping rule says to keep going.

**Stop early if you discover a bug in your variant.** Results from a broken variant aren't valid. Stop, fix, and restart.

**Stop early if the variant shows clear harm.** If your conversion rate drops 20% in the first week with strong confidence, the ethical thing is to stop, not to wait out the planned run. This is why monitoring matters — not to peek for wins, but to catch disasters.

**Stop early if external conditions change fundamentally.** A major PR crisis, a competitor announcement, or a sitewide promotion that floods the experiment with unrepresentative traffic are all reasons to pause and restart.

## Calculating runtime before you build

The single highest-leverage habit: run the sample size calculation before any development starts. If the math says you need 12 weeks of traffic, that's a decision point, not a footnote. Options at that point:

1. Raise the MDE to something detectable with your traffic
2. Move the test to a higher-traffic page with a similar conversion goal
3. Don't run the test — use qualitative methods on this page and test a higher-traffic equivalent

None of these options are available after you've spent two weeks building the variant and three weeks running the test.

**Practical takeaway:** Before your next test, calculate the expected runtime using your actual daily traffic and an honest MDE. If the runtime is more than six weeks, you have a design problem, not a patience problem. Fix the design.
