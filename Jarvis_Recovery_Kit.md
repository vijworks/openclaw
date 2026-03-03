# JarvisOS Recovery Kit — Complete Documentation

> Last updated: 2026-03-03  
> Version: 3.0 (Dual Max OAuth + Minimax fallback)  
> Maintainer: JarvisOS (auto-maintained)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [VPS & Docker Setup](#vps--docker-setup)
3. [Provider Waterfall (Complete Chain)](#provider-waterfall-complete-chain)
4. [Proxy Configuration](#proxy-configuration)
5. [Auth Profiles Deep Dive](#auth-profiles-deep-dive)
6. [Model Configuration](#model-configuration)
7. [Token Refresh System](#token-refresh-system)
8. [Provider Switcher (Proxy)](#provider-switcher-proxy)
9. [Recovery Procedures](#recovery-procedures)
10. [Emergency Commands](#emergency-commands)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Troubleshooting](#troubleshooting)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            JarvisOS Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────────────────────────────────────┐       │
│  │  WhatsApp   │     │              OpenClaw Gateway                │       │
│  │  Telegram   │────▶│  (Docker container: openclaw-openclaw-gateway) │     │
│  │  Slack      │     │                                               │      │
│  └─────────────┘     │  Auth Chain:                                  │      │
│                      │  claude-max-2 → claude-setup → api-fallback   │      │
│                      │                                               │      │
│                      │  Model: anthropic/claude-opus-4-6             │      │
│                      └───────────────┬───────────────────────────────┘      │
│                                      │                                      │
│                           ┌──────────┴──────────┐                           │
│                           │  Proxy (port 3456)  │                           │
│                           │  Max #2 OAuth Token │                           │
│                           └──────────┬──────────┘                           │
│                                      │                                      │
│                    ┌─────────────────┼─────────────────┐                    │
│                    ▼                 ▼                  ▼                    │
│             ┌──────────┐     ┌──────────┐      ┌──────────┐                │
│             │Anthropic │     │ Minimax  │      │  API Key │                │
│             │  (OAuth) │     │   API    │      │ Fallback │                │
│             └──────────┘     └──────────┘      └──────────┘                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    External Apps (via Proxy)                        │    │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐  │    │
│  │   │ AEO Engine  │  │ UGC Engine  │  │ GTM Engine  │  │  Neo   │  │    │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## VPS & Docker Setup

### VPS Information

| Item | Value |
|------|-------|
| Provider | Hetzner |
| Hostname | bzen-jarvisos |
| Location | Germany (EU) |
| SSH | `ssh root@<VPS_IP>` |

### Docker Container

| Item | Value |
|------|-------|
| Container Name | `openclaw-openclaw-gateway-1` |
| Image | `openclaw:local` (built locally) |
| Restart Policy | `unless-stopped` |
| Ports Exposed | 3456 (proxy), 18789 (gateway), 18790 (bridge) |

### Key Directories

| Path | Purpose |
|------|---------|
| `/root/openclaw/` | OpenClaw source code & Docker config |
| `/root/.openclaw/` | Runtime config, workspace, memory |
| `/root/.openclaw/workspace/` | Jarvis's files, skills, memory |
| `/root/openclaw/update-openclaw.sh` | Weekly auto-update script |

### Docker Compose Commands

```bash
cd /root/openclaw
docker compose up -d openclaw-gateway   # Start
docker compose restart openclaw-gateway  # Restart
docker compose logs -f                   # View logs
docker compose down                      # Stop
```

---

## Provider Waterfall (Complete Chain)

### Jarvis (Primary Agent — OpenClaw Direct)

```
Model: anthropic/claude-opus-4-6

Auth Chain (tried in order):
┌──────────────────────────────────────────────────────┐
│  1. claude-max-2  (OAuth — 2nd Max subscription)     │ ← PRIMARY
│     └──▶ If quota exhausted or token fails:          │
│                                                      │
│  2. claude-setup  (OAuth — 1st Max subscription)     │ ← FALLBACK
│     └──▶ If also exhausted/fails:                    │
│                                                      │
│  3. claude-api-fallback  (API key — standard billing)│ ← LAST RESORT
└──────────────────────────────────────────────────────┘

Model Fallbacks:
  anthropic/claude-opus-4-6 → anthropic/claude-sonnet-4-6

Heartbeat Model: anthropic/claude-haiku-4-5-20251001
```

### Proxy (Neo + AEO/UGC/GTM Engines)

```
ANTHROPIC_PROXY_TARGET determines routing:

When "anthropic" (current default):
┌──────────────────────────────────────────────┐
│  Routes to: api.anthropic.com                │
│  Auth: Bearer OAuth (Max #2 token)           │
│  Fallback on 529: API key (if configured)    │
└──────────────────────────────────────────────┘

When "minimax":
┌──────────────────────────────────────────────┐
│  Routes to: api.minimax.io/anthropic         │
│  Auth: x-api-key (Minimax Coding Plan)       │
│  No fallback                                 │
└──────────────────────────────────────────────┘
```

### Neo (YouTube Shorts Agent — vijworks/neo-workspace)

Neo's scripts dynamically select models based on `ANTHROPIC_PROXY_TARGET`:
- When `anthropic` → uses `claude-sonnet-4-6` / `claude-opus-4-6`
- When `minimax` → uses `MiniMax-M2.5`

Scripts with dynamic model selection:
- `skills/remi/scripts/generate-script.mjs`
- `skills/remi/scripts/post-to-youtube.mjs`
- `skills/remi/scripts/generate-motion-graphics.mjs`
- `skills/remi/scripts/generate-jump-cuts.mjs`
- `skills/amy/scripts/update-hooks.mjs`

---

## Proxy Configuration

### Overview

The proxy (`anthropic-proxy.mjs`) runs on port 3456 inside the Docker container and routes requests from external apps + Neo to either Anthropic or Minimax APIs.

### Key Files

| File | Purpose |
|------|---------|
| `scripts/anthropic-proxy.mjs` | The proxy server |
| `scripts/start-proxy.mjs` | Launcher (reads Max OAuth from OpenClaw config) |
| `logs/proxy.log` | Proxy logs |

**⚠️ CRITICAL**: Always use `start-proxy.mjs` to launch. Never run `anthropic-proxy.mjs` directly — shell env may have stale keys.

### Proxy Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Returns proxy status, target, auth type |
| `/token` | GET | Returns current OAuth token (for satellites) |
| `/*` | POST | Proxies to target provider |

### Health Response Examples

```json
// Anthropic mode (current)
{"status":"ok","target":"anthropic","auth":"bearer-oauth","fallback":"not-configured"}

// Minimax mode
{"status":"ok","target":"minimax","auth":"api-key (minimax coding plan)","fallback":"not-configured"}
```

### Proxy Keepalive

A cron job checks proxy health every 5 minutes. If down, auto-restarts via `start-proxy.mjs`.

---

## Auth Profiles Deep Dive

### Location

All auth credentials are stored in:
```
/home/node/.openclaw/agents/main/agent/auth-profiles.json
```

**⚠️ CRITICAL RULE**: NEVER put apiKey/credentials directly in openclaw.json. This has bricked the gateway 3 times. Credentials go ONLY in auth-profiles.json. openclaw.json only declares profile names and modes.

### Current Profiles

```json
{
  "profiles": {
    "claude-max-2": {
      "type": "oauth",
      "access": "sk-ant-oat01-hg_0rFfCyr...",
      "refresh": "sk-ant-ort01-JFu1iiwe...",
      "expires": 1772585985806
    },
    "claude-setup": {
      "type": "oauth",
      "access": "sk-ant-oat01-YdtchyCN...",
      "refresh": "sk-ant-ort01-1uRXMDk8...",
      "expires": 1772566607125
    },
    "claude-api-fallback": {
      "type": "api_key",
      "key": "sk-ant-api03-5Yrsr98..."
    }
  },
  "lastGood": {
    "anthropic": "claude-max-2"
  }
}
```

### Auth Declaration (in openclaw.json)

```json
{
  "auth": {
    "profiles": {
      "claude-max-2": { "provider": "anthropic", "mode": "oauth" },
      "claude-setup": { "provider": "anthropic", "mode": "oauth" },
      "claude-api-fallback": { "provider": "anthropic", "mode": "api_key" }
    },
    "order": {
      "anthropic": ["claude-max-2", "claude-setup", "claude-api-fallback"]
    }
  }
}
```

### Two Max Subscriptions

| Profile | Account | Purpose |
|---------|---------|---------|
| `claude-max-2` | 2nd Claude account | Primary (fresh weekly quota) |
| `claude-setup` | Original Claude account | Fallback (quota resets weekly) |

Both are Claude Max subscriptions with `rateLimitTier: default_claude_max_5x`. Having two means double the weekly quota across accounts.

---

## Model Configuration

### Current Model Setup (in openclaw.json)

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-6",
        "fallbacks": [
          "anthropic/claude-opus-4-6",
          "anthropic/claude-sonnet-4-6"
        ]
      },
      "heartbeat": {
        "model": "anthropic/claude-haiku-4-5-20251001"
      }
    }
  }
}
```

### Minimax Provider (Configured, Not Primary)

Minimax is configured as an available provider but is NOT the primary model. It can be activated by changing the primary model or proxy target.

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.5",
            "name": "MiniMax M2.5",
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.5-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

---

## Token Refresh System

### Multi-Profile Refresh Script

**Location**: `scripts/refresh-anthropic-token.mjs`

The refresh script handles BOTH OAuth profiles (`claude-max-2` and `claude-setup`) in a single run:

1. Loops through profiles in priority order
2. Checks if each token is within 90 minutes of expiry
3. Refreshes any that need it
4. Updates auth-profiles.json
5. If the primary profile (`claude-max-2`) was refreshed, also updates `ANTHROPIC_OAUTH_TOKEN` in openclaw.json and restarts the proxy

### Cron Schedule

Runs every 30 minutes via OpenClaw cron job ("Anthropic Token Refresh").

### Manual Refresh

```bash
# Refresh all profiles that need it
node /home/node/.openclaw/workspace/scripts/refresh-anthropic-token.mjs

# Force refresh all profiles regardless of expiry
node /home/node/.openclaw/workspace/scripts/refresh-anthropic-token.mjs --force

# Refresh a specific profile only
node /home/node/.openclaw/workspace/scripts/refresh-anthropic-token.mjs --profile claude-max-2
```

### Why 90 Minutes?

OpenClaw has an internal ~75 minute rotation buffer. If we refresh at ≤60 minutes before expiry, there's a ~15 minute window where OpenClaw falls back to the next auth profile (causing unexpected billing on the wrong tier). The 90-minute threshold ensures the token is always refreshed BEFORE this window.

---

## Provider Switcher (Proxy)

### How It Works

The proxy reads `ANTHROPIC_PROXY_TARGET` env var to determine where to route requests:

| Env Var Value | Routes To | Auth Method |
|---------------|-----------|-------------|
| `anthropic` (current) | `api.anthropic.com` | Bearer OAuth (Max #2) |
| `minimax` | `api.minimax.io/anthropic` | API key (Coding Plan) |

### Switching Providers

**Switch proxy to Minimax:**
```bash
# Via Jarvis (preferred)
# Ask Jarvis: "switch the proxy to minimax"

# Via VPS directly
cd /root/openclaw
docker exec -it openclaw-openclaw-gateway-1 bash
export ANTHROPIC_PROXY_TARGET=minimax
pkill -f anthropic-proxy
node /home/node/.openclaw/workspace/scripts/start-proxy.mjs &

# Or via OpenClaw config (persists across restarts)
# Edit openclaw.json: env.vars.ANTHROPIC_PROXY_TARGET = "minimax"
# Then: openclaw gateway restart
```

**Switch proxy to Anthropic:**
```bash
# Same as above but set ANTHROPIC_PROXY_TARGET=anthropic
```

### When to Switch

| Scenario | Recommended Target |
|----------|-------------------|
| Normal operations | `anthropic` (Claude Max OAuth) |
| Both Max quotas exhausted | `minimax` (no rate limits) |
| Minimax having issues | `anthropic` |
| Cost optimization | `minimax` (cheaper per token) |

---

## Recovery Procedures

### Scenario 1: Jarvis Not Responding

**Symptoms**: WhatsApp message gets no response

```bash
# 1. SSH into VPS
ssh root@<VPS_IP>

# 2. Check container
docker ps | grep openclaw

# 3. Check logs
docker logs openclaw-openclaw-gateway-1 --tail 50

# 4. Check proxy
curl http://localhost:3456/health

# Fix: restart container
cd /root/openclaw
docker compose restart openclaw-gateway

# Fix: if proxy specifically is down
docker exec openclaw-openclaw-gateway-1 node /home/node/.openclaw/workspace/scripts/start-proxy.mjs
```

### Scenario 2: OAuth Token Revoked (Max #2)

**Symptoms**: "OAuth token has been revoked" error, falls back to claude-setup

```bash
# 1. Get new OAuth token from the 2nd Claude account
#    - Log into claude.ai with the 2nd account
#    - DevTools (Cmd+Option+I) → Application → Local Storage → claude.ai
#    - Copy the full claudeAiOauth JSON object

# 2. Update auth-profiles.json (inside container)
docker exec -it openclaw-openclaw-gateway-1 bash
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('/home/node/.openclaw/agents/main/agent/auth-profiles.json'));
p.profiles['claude-max-2'].access = 'NEW_ACCESS_TOKEN';
p.profiles['claude-max-2'].refresh = 'NEW_REFRESH_TOKEN';
p.profiles['claude-max-2'].expires = NEW_EXPIRES_MS;
fs.writeFileSync('/home/node/.openclaw/agents/main/agent/auth-profiles.json', JSON.stringify(p, null, 2));
"

# 3. Also update env var for proxy
# Edit openclaw.json: env.vars.ANTHROPIC_OAUTH_TOKEN = "NEW_ACCESS_TOKEN"

# 4. Restart
openclaw gateway restart
```

### Scenario 3: OAuth Token Revoked (Max #1 / claude-setup)

Same as Scenario 2 but update `claude-setup` instead of `claude-max-2`. No need to update env vars (proxy uses Max #2).

### Scenario 4: Both Max Quotas Exhausted

**Symptoms**: Rate limit errors even on Max subscription

```bash
# Option A: Switch proxy to Minimax (for Neo + apps)
# Ask Jarvis or manually:
# Set ANTHROPIC_PROXY_TARGET=minimax in openclaw.json
# Restart gateway

# Option B: Wait for weekly quota reset
# Max quotas reset weekly per account

# Option C: Switch Jarvis primary model to Minimax
# Set agents.defaults.model.primary = "minimax/MiniMax-M2.5"
# Restart gateway
```

### Scenario 5: Adding a New Max Subscription

```bash
# 1. Get OAuth credentials from new Claude account
# 2. Add to auth-profiles.json as new profile (e.g., "claude-max-3")
# 3. Add to openclaw.json auth.profiles declaration
# 4. Add to openclaw.json auth.order.anthropic array (position = priority)
# 5. Update refresh script OAUTH_PROFILES array if needed
# 6. Restart gateway
```

### Scenario 6: Complete System Failure

```bash
cd /root/openclaw
docker compose down
docker compose build --no-cache openclaw-gateway
docker compose up -d

# Wait 60 seconds
sleep 60

# Verify
curl http://localhost:3456/health
docker logs openclaw-openclaw-gateway-1 --tail 20
```

---

## Emergency Commands

### Quick Reference Card

```bash
# =====================
# STATUS CHECKS
# =====================

# Proxy health
curl http://localhost:3456/health

# Container status
docker ps | grep openclaw

# Recent logs
docker logs openclaw-openclaw-gateway-1 --tail 30

# Token refresh logs
tail -10 /home/node/.openclaw/workspace/logs/token-refresh.log

# Check which auth profile is active (inside container)
docker exec openclaw-openclaw-gateway-1 cat /home/node/.openclaw/agents/main/agent/auth-profiles.json | python3 -m json.tool | grep -A2 lastGood


# =====================
# RESTARTS
# =====================

# Restart gateway (soft — SIGUSR1)
# Inside container: openclaw gateway restart
# Or: docker exec openclaw-openclaw-gateway-1 openclaw gateway restart

# Restart container (hard)
cd /root/openclaw
docker compose restart openclaw-gateway

# Full rebuild
docker compose build --no-cache openclaw-gateway && docker compose up -d


# =====================
# PROXY
# =====================

# Start proxy (inside container)
docker exec openclaw-openclaw-gateway-1 node /home/node/.openclaw/workspace/scripts/start-proxy.mjs

# Kill proxy
docker exec openclaw-openclaw-gateway-1 pkill -f anthropic-proxy


# =====================
# AUTH FIXES
# =====================

# View current profiles
docker exec openclaw-openclaw-gateway-1 cat /home/node/.openclaw/agents/main/agent/auth-profiles.json

# Force token refresh
docker exec openclaw-openclaw-gateway-1 node /home/node/.openclaw/workspace/scripts/refresh-anthropic-token.mjs --force


# =====================
# PROVIDER SWITCHING
# =====================

# Switch proxy to Minimax
# Edit openclaw.json: env.vars.ANTHROPIC_PROXY_TARGET = "minimax"
# Restart gateway + proxy

# Switch proxy to Anthropic
# Edit openclaw.json: env.vars.ANTHROPIC_PROXY_TARGET = "anthropic"
# Restart gateway + proxy


# =====================
# WEEKLY UPDATE
# =====================

# Manual update (runs automatically Mon 8am UTC)
/root/openclaw/update-openclaw.sh


# =====================
# DESTRUCTIVE (last resort)
# =====================

cd /root/openclaw
docker compose down
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

---

## Environment Variables Reference

### Core Auth Variables

| Variable | Purpose | Current Value |
|----------|---------|---------------|
| `ANTHROPIC_OAUTH_TOKEN` | Max #2 OAuth token (for proxy) | `sk-ant-oat01-hg_0r...` |
| `ANTHROPIC_API_KEY` | Same as OAUTH_TOKEN (env override) | `sk-ant-oat01-hg_0r...` |
| `ANTHROPIC_API_KEY_BACKUP` | Backup standard API key | `sk-ant-api03-...` |
| `ANTHROPIC_API_KEY_FALLBACK` | Fallback standard API key | `sk-ant-api03-...` |
| `MINIMAX_API_KEY` | Minimax Coding Plan API key | `sk-cp-...` |
| `ANTHROPIC_PROXY_TARGET` | Proxy routing: `anthropic` or `minimax` | `anthropic` |
| `ANTHROPIC_PROXY_KEY` | Proxy auth secret (for callers) | `fd7ebadd...` |

### Provider Keys

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | GPT/Codex access |
| `COMPOSIO_API_KEY` | Gmail/Calendar OAuth |
| `FAL_KEY` | Image generation |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `SLACK_BOT_TOKEN` | Slack bot |
| `STRIPE_API_KEY` | Stripe read-only |
| `FIRECRAWL_API_KEY` | Web scraping |
| `BROWSERBASE_API_KEY` | Cloud browser |
| `EXA_API_KEY` | Exa AI search |
| `HUNTER_API_KEY` | Email verification |
| `FATHOM_API_KEY` | Meeting analytics |

### System Variables

| Variable | Purpose |
|----------|---------|
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth token |
| `SUPABASE_PAT` | Supabase admin access |

### Proxy Key Rotation Checklist

The proxy requires clients to send `x-proxy-key` matching `ANTHROPIC_PROXY_KEY`. If this key changes, update ALL three Supabase projects:

```bash
SUPABASE_PAT="$(openclaw config get env.vars.SUPABASE_PAT)"
NEW_KEY="<new-proxy-key>"

for PROJECT in nfrgpkjuwvavdbhguzot eyaztqfitubsgxycflaa ikvmveescayhdcwbnslb; do
  curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT/secrets" \
    -H "Authorization: Bearer $SUPABASE_PAT" \
    -H "Content-Type: application/json" \
    -d "[{\"name\":\"OPENCLAW_PROXY_KEY\",\"value\":\"$NEW_KEY\"}]"
  echo "Updated $PROJECT"
done
```

| Supabase Project | App |
|------------------|-----|
| `nfrgpkjuwvavdbhguzot` | AEO Engine |
| `eyaztqfitubsgxycflaa` | UGC Engine |
| `ikvmveescayhdcwbnslb` | GTM Engine |

---

## Troubleshooting

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `rate_limit_error` | Max quota exhausted | Switch to other Max profile or Minimax |
| `OAuth token revoked` | Token invalidated | Get new token from claude.ai |
| `401 Unauthorized` | Wrong proxy key | Check `ANTHROPIC_PROXY_KEY` matches |
| `429 Too Many Requests` | Provider rate limit | Wait or switch provider |
| `Connection refused :3456` | Proxy down | Run `start-proxy.mjs` |
| `EADDRINUSE :3456` | Proxy already running | `pkill -f anthropic-proxy` then restart |
| `auth (claude-setup)` shown | OpenClaw sticky session | Remove exhausted profile from auth order, restart |

### Diagnostic Commands

```bash
# Full health check (run inside container)
echo "=== Proxy ===" && curl -s http://localhost:3456/health
echo ""
echo "=== Auth Profile ===" && node -e "const p=require('/home/node/.openclaw/agents/main/agent/auth-profiles.json'); console.log('lastGood:', p.lastGood); Object.entries(p.profiles).forEach(([k,v]) => console.log(k+':', v.type, v.expires ? 'expires:'+new Date(v.expires).toISOString() : ''))"
echo ""
echo "=== Model Config ===" && node -e "const c=require('/home/node/.openclaw/openclaw.json'); console.log(JSON.stringify(c.agents.defaults.model, null, 2))"
echo ""
echo "=== Token Refresh ===" && tail -5 /home/node/.openclaw/workspace/logs/token-refresh.log
echo ""
echo "=== Proxy Token ===" && node -e "const c=require('/home/node/.openclaw/openclaw.json'); const t=c.env.vars.ANTHROPIC_OAUTH_TOKEN; console.log('Token prefix:', t.slice(0,30)+'...')"
```

### OpenClaw Auth Profile Gotcha

OpenClaw sessions can be "sticky" on a profile even after config changes. If you change the auth order via `config.patch`:
1. The SIGUSR1 restart reloads config but the active session may keep its existing profile binding
2. To force a profile switch: remove the unwanted profile from `auth.order`, restart, then re-add it later
3. A full `docker compose restart` guarantees a fresh session with the correct profile

---

## Maintenance

### Weekly Auto-Update (Mondays 8am UTC)

```bash
# Cron entry
0 8 * * 1 /root/openclaw/update-openclaw.sh >> /root/openclaw/update.log 2>&1

# What it does:
# 1. git fetch upstream
# 2. git merge upstream/main
# 3. docker compose build --no-cache
# 4. docker compose up -d
```

### Manual Update

```bash
/root/openclaw/update-openclaw.sh
```

### Cron Jobs (Inside OpenClaw)

| Job | Schedule | Purpose |
|-----|----------|---------|
| Anthropic Proxy Keepalive | Every 5 min | Checks proxy health, auto-restarts |
| Anthropic Token Refresh | Every 30 min | Refreshes both OAuth tokens before expiry |
| Daily Brief | 7am UTC | Weather + calendar + emails + financials → Telegram |
| 4-Hour Self-Review | 10/14/18/22 Lisbon | Autonomous error checking |
| Nightly Deep Review | 2am Lisbon | Full review + memory maintenance |
| Workspace Git Backup | 3am Lisbon | Auto-commit + push workspace |
| Surprise-Me Proactive | 4am Lisbon | Autonomous improvement cycle |
| Urgent Email Check | 9/13/17 Lisbon weekdays | Email triage + WhatsApp alerts |
| Prequal Error Check | 9/21 UTC | AEO Engine prequal monitoring |
| Codex Token Refresh | Every 7 days | Cody OAuth token maintenance |

---

## Support Contacts

| Resource | URL |
|----------|-----|
| OpenClaw Discord | https://discord.com/invite/clawd |
| OpenClaw Docs | https://docs.openclaw.ai |
| Hetzner Console | https://console.hetzner.cloud |
| Anthropic Status | https://status.anthropic.com |
| Minimax Status | https://status.minimaxi.com |

---

## Quick Recovery Card

```
┌────────────────────────────────────────────┐
│           EMERGENCY RECOVERY                │
├────────────────────────────────────────────┤
│                                            │
│  SSH: ssh root@<YOUR_VPS_IP>               │
│                                            │
│  Health: curl http://localhost:3456/health  │
│                                            │
│  Restart: cd /root/openclaw                │
│           docker compose restart           │
│                                            │
│  Auth profiles:                            │
│    /home/node/.openclaw/agents/main/       │
│    agent/auth-profiles.json                │
│                                            │
│  Config: /root/.openclaw/openclaw.json     │
│                                            │
│  Docs: github.com/vijworks/openclaw        │
│                                            │
│  WhatsApp: +351910552813 (Vijay)           │
│                                            │
└────────────────────────────────────────────┘
```

---

*This document is auto-maintained by JarvisOS. Last sync: 2026-03-03 v3.0*
