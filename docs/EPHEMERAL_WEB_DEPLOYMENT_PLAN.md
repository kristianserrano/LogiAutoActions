# Ephemeral Web Deployment Plan (Minimal Ops)

## Purpose

This document captures the recommended production approach for running LogiAutoActions as a web-only service for non-technical users, with minimal operational overhead and no long-term data persistence.

## Scope

- Web-only app (no Electron).
- Single hosted service for UI + API.
- Ephemeral build artifacts and temporary workspaces.
- No database in v1.

## Goals

- Users only need a browser.
- No local install requirement for dotnet or LogiPluginTool.
- Keep infrastructure simple and low-maintenance.
- Keep generated plugin data short-lived by design.

## Target v1 Architecture

1. Single service

- Host one Node.js service that serves the frontend and backend.
- Keep one production environment in v1.

1. Containerized runtime

- Build one container image including:
  - Node runtime
  - dotnet SDK/runtime needed for plugin compile
  - LogiPluginTool available on PATH
- Deploy to a managed container platform.

1. Build execution

- For each request:
  - Create a per-request temp workspace under OS temp.
  - Generate plugin artifacts.
  - Compile and package.
  - Verify package.
  - Stream result back to user.
  - Delete temp workspace in a finally block.

1. Persistence policy

- No database in v1.
- No permanent generated source/artifacts on local disk.
- Optional object storage only if direct streaming is insufficient.

## Artifact Handling

Preferred (v1):

- Return build output directly in the HTTP response.
- Delete all temp files immediately after response completes.

Optional (if needed):

- Upload artifact to object storage.
- Return short-lived signed URL.
- Enforce TTL lifecycle expiration (for example 15-60 minutes).
- Do not retain artifacts beyond TTL.

## Security and Abuse Controls

1. Request limits

- Enforce JSON and upload size limits.
- Enforce strict request timeouts for build and verify operations.

1. Rate limiting

- Add per-IP and/or per-user request throttling.

1. Process isolation

- Use fixed, sanitized working directories.
- Reject unsafe filenames and path traversal patterns.
- Restrict subprocess permissions where possible.

1. Secret handling

- Store secrets in platform-managed environment variables.
- Never log secrets or full sensitive payloads.

## Observability (Minimal)

1. Logs

- Structured logs with requestId, step timings, and process exit codes.
- Redact user-sensitive content.

1. Health

- Add a lightweight health endpoint.

1. Alerts (v1)

- Service unavailable.
- Sustained 5xx error spike.
- Sustained build timeout/error spike.

## Render Free-Tier Notes

- Free instances can spin down after inactivity, so first request latency can be high (cold start).
- Public users may see an initial delay of around 30-90 seconds before the app responds.
- Plan for a friendly UI message that explains startup delay.
- If usage grows and cold starts become disruptive, move to the lowest paid tier.

## Runtime Environment Variables

Set these variables in your hosting provider to tune API limits:

- `LOGI_RATE_LIMIT_MAX_REQUESTS`
  - Max API requests per IP inside one window.
  - Default: `120`
- `LOGI_RATE_LIMIT_WINDOW_MS`
  - Window length in milliseconds.
  - Default: `60000`

Suggested starting values for hobby/public preview:

- `LOGI_RATE_LIMIT_MAX_REQUESTS=90`
- `LOGI_RATE_LIMIT_WINDOW_MS=60000`

## Rollout Plan

1. Prepare container image

- Add Dockerfile with Node + dotnet + LogiPluginTool.
- Validate generate/compile/verify flow locally in container.

1. Harden runtime behavior

- Add payload limits.
- Add timeouts and rate limiting.
- Add startup cleanup for orphan temp directories older than TTL.

1. Deploy staging

- Run smoke builds from UI and API.
- Confirm temp artifacts are removed after completion.
- Confirm observability is adequate and redacted.

1. Deploy production

- Start with conservative concurrency limits.
- Observe failures/timeouts for one week.
- Tune CPU/memory/timeouts based on real traffic.

1. Post-v1 optional upgrades

- Add lightweight queue only if concurrency becomes a bottleneck.
- Add short-lived object storage downloads if direct streaming is not enough.
- Add user authentication if opening to broader audiences.

## Operational Checklist

Before go-live:

- [ ] Web-only scripts are active in package.json.
- [ ] Container includes Node, dotnet, and LogiPluginTool.
- [ ] Build and verify pass inside container.
- [ ] Temp workspace cleanup works on success and error paths.
- [ ] Request size/time limits are enforced.
- [ ] Rate limiting is enabled.
- [ ] Health endpoint is available.
- [ ] Alerts are configured for downtime, 5xx spikes, and build errors.

## Success Criteria

- Non-technical users can generate and download packages through browser-only flow.
- No local installer/toolchain setup required for end users.
- No long-term retention of generated source or artifacts.
- Stable operation with minimal manual intervention.
