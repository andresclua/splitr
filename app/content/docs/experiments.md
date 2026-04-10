---
title: Experiments
description: How to create, manage and analyze A/B experiments in Koryla.
order: 3
section: Core Concepts
slug: experiments
---

# Experiments

An experiment is a controlled test where two or more versions of a page compete for real traffic. Koryla uses the results to tell you which version performs better.

## Creating an experiment

From your dashboard, click **New Experiment** and fill in the details:

### Name
An internal name — only you see this. Use something descriptive like "Pricing page headline test" or "Checkout button color Q2".

### Base URL
The URL path the Worker should intercept. Examples:

- `/` — homepage
- `/pricing` — pricing page
- `/blog/my-post` — a specific post

The Worker matches requests using `pathname.startsWith(base_url_path)`, so `/pricing` would also match `/pricing/` but not `/price`.

## Variants

Every experiment needs at least **two variants**:

### Control
The control is your original page. It acts as the baseline for comparison. Set a traffic weight for it — typically 50% in a 50/50 test.

The control variant's target URL is the same as the base URL (no rewrite happens).

### Challenger variants
Each challenger variant points to a **different URL** on your site. Koryla rewrites the request to that URL at the edge.

For example:
- Base URL: `/pricing`
- Control target: `/pricing` (no rewrite)
- Variant A target: `/pricing-v2` (rewrites to this page)

> The target pages for your variants must exist on your site. Koryla just routes traffic to them — you need to create the actual pages.

## Traffic weights

Weights are relative numbers. Koryla normalizes them so they don't need to add up to 100:

| Setup | Control | Variant A |
|---|---|---|
| 50/50 split | 50 | 50 |
| 80/20 split | 80 | 20 |
| Three-way | 33 | 33 / 34 |

For a new experiment, start with a 50/50 split unless you have a reason to limit exposure to a new variant (e.g. a risky change).

## Experiment status

| Status | Description |
|---|---|
| `draft` | Created but not yet running. No traffic is split. |
| `active` | Running. The Worker is assigning visitors to variants. |
| `paused` | Temporarily stopped. Existing cookie assignments are respected but no new assignments happen. |
| `completed` | Finished. Traffic returns to the control (or winner, if you update the site). |

## Reading results

> **Note:** Full analytics dashboards are on the roadmap. Currently, results flow to your connected analytics destination (GA4, PostHog, etc.).

In GA4 or PostHog, look for events named `experiment_viewed` (or your configured event name) with properties:

- `experiment_id` — the Koryla experiment UUID
- `experiment_name` — the name you set in the dashboard
- `variant_id` — which variant was served
- `variant_name` — variant name

Filter and compare conversion rates between variants using your analytics tool's exploration or funnel features.

## When to stop an experiment

As a rule of thumb, run experiments until you have **statistical significance** — typically at least 95% confidence that the difference isn't random. Most A/B testing calculators can tell you if you have enough data.

Practical guidelines:
- Run for **at least 2 weeks** to account for day-of-week variation
- Aim for **at least 100 conversions per variant** before drawing conclusions
- Don't stop early just because one variant is winning — the early leader often loses

## After the experiment

Once you have a winner:

1. Update your site to use the winning variant as the default (rename the page, update your CMS, etc.)
2. Set the experiment status to `completed` in Koryla
3. The Worker will stop intercepting traffic within 60 seconds

Don't delete experiments — they serve as a historical record of what you tested and what worked.
