---
title: "Cost and mock plan"
created: 2026-10-24
---

# Cost and mock plan

This plan meets FR-28 and the teacher's request for a cost and mock plan covering the language model and email. Prices were checked on 2026-10-24.

Hosting (Render, Turso, cron-job.org) is optional and the first thing cut: the course delivery is the source code plus the Docker image, run in test mode (FR-33), and deployment is Story 1.7.

| Service | Used for | Cost | Limit or safeguard | Mock in test mode |
|---|---|---|---|---|
| Anthropic API, `claude-haiku-5-5` | AI plan draft, only when an organizer creates a plan | $0.10 / $0.50 per million input / output tokens. About $0.00055 per draft (500 tokens in, 1,000 out), about $0.06 per 100 drafts. Internal reasoning counts as output, so effort is set to low and output is capped at 2,000 tokens: at most $0.001 per draft | Prepaid credit of about $5, auto-reload off, Console spend limit of $5 a month. Never called for helpers or in tests | No `ANTHROPIC_API_KEY` means the fixed mock plan is used, with a notice |
| Gmail API (HTTPS), a dedicated account | Helper links and reminders | Free | Volume is under 100 a month. Render's free tier blocks SMTP, so email goes over HTTPS. If the setup fails, `MAIL_TRANSPORT=disabled` switches email off | `TEST_MODE=true` means every email goes to the test inbox page |
| Render, free web service | Hosting for the friends test | Free | Sleeps after 15 minutes. The disk is wiped, so no data is stored on it | Not needed, the app runs locally |
| Turso, free tier | Database for the friends test | Free (5 GB, 500 million rows read a month) | Far above our volume | A local SQLite file |
| cron-job.org | Daily call that starts the reminder check | Free | Protected by `CRON_SECRET` | The **Send due reminders now** button |

**Worst case:** $5 in total, the prepaid credit. Every other service is free.

**Rejected:**
- **SMS reminders:** need a paid provider.
- **Free AI tiers:** Gemini's free tier and Mistral's both use prompts for training, and Gemini's free tier isn't allowed for apps serving EEA users.
- **Render's own scheduled jobs:** not free.
