# TODO

Open follow-ups, newest first. Each item says why it matters and what's already known.

## LLM health check can be switched off by GitHub after 60 quiet days

*Logged 2026-10-24.*

**Problem.** `.github/workflows/llm-health.yml` runs daily and opens an `llm-health` issue when `/api/llm-compare` fails. GitHub disables scheduled workflows in public repos "when no repository activity has occurred in 60 days" ([docs](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow)). Once disabled, alerts stop and nobody is told. The site itself keeps working.

**How likely.** The longest gap between commits on `main` so far is 120 days (2026-06-26 → 2026-10-24), twice the limit.

**Unknowns.**
- What GitHub counts as "activity". Commits almost certainly count; the workflow's own runs or alert issues may not.
- Whether GitHub warns before disabling.

**Options.**
1. **Accept it.** Any commit resets the clock. Re-enable it in one click: Actions → LLM health check → Enable workflow. (`gh workflow enable llm-health.yml` also works.)
2. **Move the check to Cloudflare (preferred).** A Cron Trigger on the Worker isn't subject to GitHub's inactivity rule.
   - OpenNext supports a `scheduled` handler through a custom worker entry ([how-to](https://opennext.js.org/cloudflare/howtos/custom-worker)). Point `main` in `wrangler.toml` at the wrapper and add `[triggers] crons`.
   - Alerts would need a new channel, e.g. Cloudflare Email Routing's send-email binding, or a GitHub token to open issues. A token adds an expiry to maintain.
   - **Research first:** Cron Trigger limits and per-invocation CPU limits on the Workers Free plan, and the cost and setup of email sending. These aren't stated on the [Cron Triggers page](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
3. **Keepalive workaround: avoid.** The best-known keepalive action's repo was "disabled by GitHub Staff due to a violation of GitHub's terms of service".

## Health check alerts on brief provider blips

*Logged 2026-10-24.*

On 2026-10-24 around 17:21 UTC, two runs alerted on a Gemini `503` ("temporarily unavailable") that cleared within minutes. Issue #50 opened, then auto-closed on the next pass. Fix: in `llm-health.yml`, wait a few minutes and rerun `scripts/llm-test.sh` before alerting. This is a workflow-only change.

## Workers Free plan CPU limit

*Logged 2026-10-24.*

The Free plan allows 10 ms of CPU per request ([limits](https://developers.cloudflare.com/workers/platform/limits/)).
- **Measured:** Workers Logs showed `/api/llm-compare` requests at 122–279 ms of CPU.
- **Risk:** Cloudflare allows occasional overruns, but consistent overruns get cut off with Error 1102.
- **Decision so far:** stay on Free.
- **Next:** check CPU time for plain page loads (`GET /`, `GET /tools`) in the dashboard (Worker → Observability). If those are heavy too, look at serving more of the site as static assets.

## Smaller items

- **Verify the Claude Models API lookup.** Confirm `GET /v1/models` returns `"line": "haiku"` for our key; `src/lib/llm-models.ts` relies on it. If `line` is missing, the code silently stays on `claude-haiku-5-5` and won't auto-update.
- **Anthropic SDK upgrade.** `@anthropic-ai/sdk` is 0.102.0 and its types lack `line` and `thinking.types.disabled`, so `llm-models.ts` reads them from the raw response. The latest is 1.3.0, a major version, so upgrade separately.
- **`make test-smoke` hangs when piped.** `make test-smoke | tail` never exits: `cleanup` kills the `npm` wrapper, but the orphaned `next-server` keeps the pipe open. It works when run on its own.
- **Confirm alert emails.** Test issue #51 should have emailed the repo owner. Close it once confirmed.
