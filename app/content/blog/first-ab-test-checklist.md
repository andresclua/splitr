---
title: "Your First A/B Test: A Complete Pre-Launch Checklist"
description: Most A/B tests fail before they launch — bad hypotheses, missing analytics, no sample size calculation. This pre-launch checklist catches the problems that make results untrustworthy.
date: 2026-03-18
author: Koryla Team
slug: first-ab-test-checklist
---

The most expensive part of running a bad A/B test isn't the development time — it's the traffic you spend on results you can't trust. A test launched without a hypothesis, without a pre-calculated sample size, or without verified analytics tracking is traffic that produces noise instead of learning.

This checklist is for teams running their first experiment, or teams that have been running experiments but aren't confident in their results. Work through it before you launch anything.

---

## Section 1: Hypothesis

### Write the hypothesis in this exact format

> "If we [change], then [metric] will [direction] by [estimated amount], because [reasoning]."

Example: "If we add a money-back guarantee badge above the checkout button, then checkout completion rate will increase by at least 8%, because removing purchase risk is the primary stated barrier in our user surveys."

This format forces specificity. Vague hypotheses ("if we make the button more visible, more people will click it") produce vague results you can't learn from.

- [ ] Hypothesis written in the if/then/because format
- [ ] Change is specific and singular (one thing, not five things at once)
- [ ] Expected metric is specific and measurable
- [ ] Expected direction is stated (increase/decrease)
- [ ] Reasoning is based on data or evidence, not intuition alone

### What went into the hypothesis

Every hypothesis should be grounded in evidence. Check that yours came from at least one of:

- [ ] Quantitative data (heatmaps, funnel drop-off, click maps)
- [ ] Qualitative data (user interviews, survey responses, session recordings)
- [ ] Prior experiment results from your site or documented results from similar products
- [ ] An explicit assumption about user behavior that this test will validate

If none of these apply — if the idea came from "we saw a competitor do it" or "someone on the team thought it would look better" — the hypothesis hasn't been validated as a problem worth solving. That's not a reason to kill the test, but it's a reason to move it down the priority list.

---

## Section 2: Metrics and measurement

### Primary metric

- [ ] One primary metric defined before the test launches
- [ ] Primary metric is directly connected to the business outcome you care about (not a proxy that feels easier to measure)
- [ ] Primary metric is measurable with your current analytics setup

Common mistake: using "clicks on element" as the primary metric when the goal is conversions. Click rates are easy to improve — they don't tell you whether the change moves business outcomes.

### Secondary metrics

- [ ] Up to two secondary metrics defined (optional, but useful for interpreting results)
- [ ] Secondary metrics will not be used as the primary decision criterion if the primary metric shows no lift

### Analytics verification

Before launching, verify that your tracking works:

- [ ] Conversion event fires correctly in control
- [ ] Conversion event fires correctly in variant (QA both variants in the testing tool)
- [ ] No duplicate event firing (common with SPA frameworks where events fire on route change)
- [ ] Analytics tool is receiving events with the expected properties (variant name, user ID if applicable)
- [ ] Baseline conversion rate in analytics matches your assumption for sample size calculation (± 20%)

If your analytics aren't verified before launch, you'll discover they're broken after you've spent three weeks running a test on bad data.

---

## Section 3: Sample size and duration

### Sample size calculation

- [ ] Baseline conversion rate identified (from the last 30–90 days of clean data)
- [ ] Minimum detectable effect (MDE) defined — the smallest lift you'd actually act on
- [ ] Confidence level set to 95% (do not lower this to get a smaller sample size)
- [ ] Statistical power set to 80% (standard) or 90% (if false negatives are costly)
- [ ] Sample size calculated using a tool (Evan Miller's calculator, your testing platform's calculator, or a spreadsheet)
- [ ] Sample size is achievable with your current traffic volume in a reasonable timeframe

If your calculated sample size requires more than 8 weeks of traffic, reconsider. You can raise your MDE (accept that you'll only detect larger changes), move the test to a higher-traffic page, or shelve the test and do qualitative research instead.

### Test duration

- [ ] Minimum run time set to 14 days (captures at least one full weekly cycle of user behavior)
- [ ] Maximum run time set (don't run indefinitely — pick a date and commit to a decision by then)
- [ ] Test does not overlap with known seasonal events, promotions, or product changes that would confound results

Common mistake: launching a test on November 28th and having Black Friday traffic dominate the results. Your test population during a promotion is not representative of your normal audience.

---

## Section 4: QA before launch

### Visual QA

- [ ] Variant renders correctly in Chrome, Firefox, and Safari
- [ ] Variant renders correctly on mobile (375px, 390px, 414px widths)
- [ ] No broken images, missing fonts, or layout issues in the variant
- [ ] Variant looks correct in both light and dark mode (if your site supports both)
- [ ] Variant has been reviewed by at least one person other than the person who built it

### Functional QA

- [ ] All interactive elements in the variant work correctly (forms submit, buttons work, links resolve)
- [ ] The variant doesn't break any existing functionality on the page (navigation, modals, cart)
- [ ] Variant assignment is sticky — the same user sees the same variant on return visits
- [ ] Users are not reassigned between variants mid-session

### Edge cases

- [ ] Variant handles empty states correctly (new users with no data, empty cart, etc.)
- [ ] Variant works with browser extensions enabled (ad blockers, password managers)
- [ ] Variant behavior is correct for both logged-in and logged-out users (if applicable)

---

## Section 5: What can go wrong

Know these failure modes before you launch:

**Sample ratio mismatch (SRM):** If 50% of traffic is supposed to go to each variant but your results show 48%/52%, something is wrong with your assignment logic. SRM invalidates results. Check for it before analyzing.

**Instrumentation breaking the experiment:** Adding analytics tracking code to variants sometimes inadvertently changes their behavior (adds a delay, modifies a DOM element the test was already modifying). QA your tracking implementation separately from your variant QA.

**Variant contamination:** Users who clear cookies, use multiple devices, or share household devices may see both variants. This reduces the purity of your test groups. It's unavoidable at some level — document it and accept it as noise.

**Test interaction:** If you're running multiple experiments simultaneously on the same page, users can be in multiple tests at once. This is fine if the tests are on different elements and the metrics don't interact. It's a problem if they're on the same element or measuring the same conversion event.

---

## Decision rule

Before you launch, write down the decision rule:

- **If the primary metric lifts by at least [MDE] at 95% confidence after [target sample size] visitors:** ship the variant
- **If results are inconclusive after [target sample size]:** keep control and document what was learned
- **If the variant hurts the primary metric at 95% confidence:** revert immediately

Commit to this rule before results are visible. Post-hoc decision rules are how false positives get shipped.

**Practical takeaway:** If you can't check every box in this list, you're not ready to launch. Spend another hour in preparation — it's cheaper than three weeks of wasted traffic.
