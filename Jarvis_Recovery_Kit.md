# JarvisOS Recovery Kit — Complete Documentation

> Last updated: 2026-03-03  
> Version: 2.0 (with Minimax integration)  
> Maintainer: JarvisOS (auto-maintained)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [VPS & Docker Setup](#vps--docker-setup)
3. [Provider Waterfall (Complete Chain)](#provider-waterfall-complete-chain)
4. [Proxy Configuration](#proxy-configuration)
5. [Auth Profiles Deep Dive](#auth-profiles-deep-dive)
6. [Model Configuration](#model-configuration)
7. [Provider Switcher (Proxy)](#provider-switcher-proxy)
8. [Recovery Procedures](#recovery-procedures)
9. [Emergency Commands](#emergency-commands)
10. [Environment Variables Reference](#environment-variables-reference)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            JarvisOS Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────────────────────────────────────┐    │
│  │  WhatsApp   │     │              OpenClaw Gateway                │    │
│  │  Telegram   │────▶│  (Docker container: openclaw-openclaw-gateway) │    │
│  │  Slack     │     │                       │                        │    │
│  └─────────────┘     │                       ▼                        │    │
│                     │              ┌────────────────┐                  │    │
│                     │              │  Proxy (port   │                  │    │
│                     │              │   3456)        │                  │    │
│                     │              └───────┬────────┘                  │    │
│                     │                      │                           │    │
│                     │         ┌────────────┼────────────┐             │    │
│                     │         ▼            ▼            ▼             │    │
│                     │   ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│                     │   │Anthropic │ │ Minimax  │ │  Fallback│        │    │
│                     │   │   API    │ │   API    │ │   API    │        │    │
│                     │   └──────────┘ └──────────┘ └──────────┘        │    │
│                     │                                                  │    │
│                     └──────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    3 External Apps (via Proxy)                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │   │ AEO Engine  │  │ UGC Engine  │  │ GTM Engine  │              │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
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

### Docker Compose Command

```bash
cd /root/openclaw
docker compose up -d openclaw-gateway   # Start
docker compose restart openclaw-gateway  # Restart
docker compose logs -f                   # View logs
docker compose down                      # Stop
```

---

## Provider Waterfall (Complete Chain)

### Jarvis (Primary Agent)

```
Priority 1: minimax/MiniMax-M2.5
    │
    ├──▶ If Minimax fails (error/limits):
    │
    ▼
Priority 2: anthropic/claude-opus-4-6
    │
    ├──▶ If Opus fails:
    │
    ▼
Priority 3: anthropic/claude-sonnet-4-6
    │
    ├──▶ If Sonnet fails:
    │
    ▼
Fallback Auth Chain (see below)
```

### Auth Chain (When Model Providers Fail)

```
Priority 1: claude-setup (OAuth → Claude Max subscription)
    │
    ├──▶ If OAuth revoked/fails:
    │
    ▼
Priority 2: claude-api-fallback (Standard API key → billed per token)
```

### External Apps (AEO, UGC, GTM Engines)

The 3 external apps connect via the proxy on port 3456. They use this chain:

```
Proxy Target: ANTHROPIC_PROXY_TARGET env var
    │
    ├──▶ If "anthropic" (default):
    │         Priority 1: Claude Max OAuth
    │         Priority 2: Claude API key (auto on 529)
    │
    └──▶ If "minimax":
              Priority 1: Minimax API (Coding Plan)
              (No fallback in minimax mode)
```

---

## Proxy Configuration

### Overview

The proxy (`anthropic-proxy.mjs`) runs on port 3456 and routes requests from the 3 external apps to either Anthropic or Minimax APIs.

### Proxy Features

1. **Provider Switching**: Toggle between Anthropic and Minimax via env var
2. **OAuth Refresh**: Automatic token refresh for Anthropic (every ~2 hours)
3. **Fallback**: Automatic fallback to API key on 529 (Anthropic quota exceeded)
4. **Auth**: All requests require `x-proxy-key` header

### Proxy Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Returns proxy status, target, auth type |
| `/token` | GET | Returns current OAuth token (for satellites) |
| `/*` | POST | Proxies to target provider |

### Health Response Example

```json
{
  "status": "ok",
  "target": "anthropic",
  "auth": "bearer-oauth",
  "fallback": "not-configured"
}
```

---

## Auth Profiles Deep Dive

### Location

All auth profiles are defined in:
```
/home/node/.openclaw/agents/main/agent/auth-profiles.json
```

**⚠️ CRITICAL RULE**: Never put apiKey values in openclaw.json. All credentials go in auth-profiles.json.

### Current Profiles

```json
{
  "profiles": {
    "claude-setup": {
      "type": "oauth",
      "access": "sk-ant-oat01-YdtchyCN..."
    },
    "claude-api-fallback": {
      "type": "api_key",
      "key": "sk-ant-api03-5Yrsr98..."
    }
  },
  "lastGood": {
    "anthropic": "claude-setup"
  }
}
```

### Auth Order (in openclaw.json)

```json
{
  "auth": {
    "profiles": {
      "claude-setup": { "provider": "anthropic", "mode": "oauth" },
      "claude-api-fallback": { "provider": "anthropic", "mode": "api_key" }
    },
    "order": {
      "anthropic": ["claude-setup", "claude-api-fallback"]
    }
  }
}
```

---

## Model Configuration

### Location

Model configuration is in openclaw.json:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "minimax/MiniMax-M2.5",
        "fallbacks": [
          "anthropic/claude-opus-4-6",
          "anthropic/claude-sonnet-4-6"
        ]
      }
    }
  }
}
```

### Provider Definitions

Minimax provider is defined in openclaw.json:

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

## Provider Switcher (Proxy)

### How It Works

The proxy reads `ANTHROPIC_PROXY_TARGET` env var to determine where to route requests:

| Env Var Value | Routes To | Auth Method |
|---------------|-----------|-------------|
| `anthropic` (default) | `api.anthropic.com` | Bearer OAuth → API key |
| `minimax` | `api.minimax.io/anthropic` | API key (Coding Plan) |

### Switching Providers

To switch the proxy to Minimax:

```bash
# Option 1: Via OpenClaw config
gateway config.patch --json '{"env":{"vars":{"ANTHROPIC_PROXY_TARGET":"minimax"}}}'
gateway restart

# Option 2: Direct (on VPS)
export ANTHROPIC_PROXY_TARGET=minimax
node /home/node/.openclaw/workspace/scripts/start-proxy.mjs
```

### Token Refresh Behavior

| Target | Token Refresh |
|--------|---------------|
| `anthropic` | Runs every ~2 hours (via refresh-anthropic-token.mjs) |
| `minimax` | No refresh needed (API key, not OAuth) |

---

## Recovery Procedures

### Scenario 1: Jarvis Not Responding

**Symptoms**: WhatsApp message gets no response

**Diagnosis Steps**:

```bash
# 1. SSH into VPS
ssh root@<VPS_IP>

# 2. Check if container is running
docker ps | grep openclaw

# 3. Check container logs
docker logs openclaw-openclaw-gateway-1 --tail 50

# 4. Check if proxy is responding
curl http://localhost:3456/health
```

**Fix**:

```bash
# If container not running:
cd /root/openclaw
docker compose up -d openclaw-gateway

# If proxy not responding:
node /home/node/.openclaw/workspace/scripts/start-proxy.mjs
```

### Scenario 2: OAuth Token Revoked

**Symptoms**: "OAuth token has been revoked" error

**Fix**:

```bash
# 1. Get new OAuth token from claude.ai
#    - Open DevTools (Cmd+Option+I)
#    - Application tab → Local Storage → claude.ai
#    - Copy claudeAiOauth.accessToken

# 2. Update in auth-profiles.json
python3 -c "
import json
with open('/home/node/.openclaw/agents/main/agent/auth-profiles.json') as f:
    data = json.load(f)
data['profiles']['claude-setup']['access'] = 'NEW_OAUTH_TOKEN_HERE'
with open('/home/node/.openclaw/agents/main/agent/auth-profiles.json', 'w') as f:
    json.dump(data, f, indent=2)
"

# 3. Restart gateway
gateway restart
```

### Scenario 3: Switch to Minimax (Proxy)

**When**: Claude Max quota exhausted, want to use Minimax instead

**Fix**:

```bash
gateway config.patch --json '{"env":{"vars":{"ANTHROPIC_PROXY_TARGET":"minimax"}}}'
gateway restart

# Verify
curl http://localhost:3456/health
# Should show: "target": "minimax"
```

### Scenario 4: Switch Back to Anthropic

**When**: Claude Max quota reset

**Fix**:

```bash
gateway config.patch --json '{"env":{"vars":{"ANTHROPIC_PROXY_TARGET":"anthropic"}}}'
gateway restart

# Verify
curl http://localhost:3456/health
# Should show: "target": "anthropic"
```

### Scenario 5: Gateway Won't Start

**Symptoms**: Container fails to start

**Fix**:

```bash
# Full restart
cd /root/openclaw
docker compose down
docker compose up -d

# Check logs for errors
docker compose logs --tail=100
```

### Scenario 6: Complete System Failure

**When**: Everything broken, need fresh start

**Fix**:

```bash
cd /root/openclaw
docker compose down
docker compose build --no-cache openclaw-gateway
docker compose up -d

# Wait 60 seconds
sleep 60

# Test
curl http://localhost:3456/health
```

---

## Emergency Commands

### Quick Reference Card

```bash
# =====================
# STATUS CHECKS
# =====================

# Check if Jarvis is responding
curl http://localhost:3456/health

# Check container status
docker ps | grep openclaw

# View recent logs
docker logs openclaw-openclaw-gateway-1 --tail 30

# Check token status
tail -5 /home/node/.openclaw/workspace/logs/token-refresh.log


# =====================
# RESTARTS
# =====================

# Restart gateway (recommended)
gateway restart

# Restart container (force)
cd /root/openclaw
docker compose restart openclaw-gateway

# Full rebuild
docker compose build --no-cache openclaw-gateway
docker compose up -d


# =====================
# AUTH FIXES
# =====================

# Update OAuth token (get from claude.ai DevTools)
# Edit: /home/node/.openclaw/agents/main/agent/auth-profiles.json


# =====================
# PROVIDER SWITCHING
# =====================

# Switch to Minimax
gateway config.patch --json '{"env":{"vars":{"ANTHROPIC_PROXY_TARGET":"minimax"}}}'
gateway restart

# Switch to Anthropic
gateway config.patch --json '{"env":{"vars":{"ANTHROPIC_PROXY_TARGET":"anthropic"}}}'
gateway restart


# =====================
# WEEKLY UPDATE
# =====================

# Manual update check (runs automatically Mon 8am UTC)
/root/openclaw/update-openclaw.sh


# =====================
# DESTRUCTIVE (last resort)
# =====================

# Nuke and rebuild
cd /root/openclaw
docker compose down
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

---

## Environment Variables Reference

### Core Auth Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_OAUTH_TOKEN` | Claude Max OAuth token | `sk-ant-oat01-...` |
| `ANTHROPIC_API_KEY` | Standard Anthropic API key | `sk-ant-api03-...` |
| `ANTHROPIC_API_KEY_FALLBACK` | Backup API key | `sk-ant-api03-...` |
| `MINIMAX_API_KEY` | Minimax Coding Plan API key | `sk-cp-...` |
| `ANTHROPIC_PROXY_TARGET` | Proxy target: `anthropic` or `minimax` | `anthropic` |

### Provider Keys

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | GPT/Codex access |
| `COMPOSIO_API_KEY` | Gmail/Calendar OAuth |
| `FAL_KEY` | Image generation |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `SLACK_BOT_TOKEN` | Slack bot |

### System Variables

| Variable | Purpose |
|----------|---------|
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth token |
| `SUPABASE_PAT` | Supabase admin access |
| `ANTHROPIC_PROXY_KEY` | Proxy auth (for external callers) |

---

## Troubleshooting

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `EADDRINUSE: address already in use` | Proxy already running | `pkill -f anthropic-proxy` then restart |
| `OAuth token revoked` | Token invalidated | Get new token from claude.ai |
| `401 Unauthorized` | Wrong proxy key | Check `ANTHROPIC_PROXY_KEY` matches |
| `529 Too Many Requests` | Rate limit | Switch to alternate provider |
| `Connection refused` | Proxy down | Start proxy manually |

### Diagnostic Commands

```bash
# Full health check
echo "=== Proxy ===" && curl -s http://localhost:3456/health
echo "=== Container ===" && docker ps | grep openclaw
echo "=== Recent Logs ===" && docker logs openclaw-openclaw-gateway-1 --tail 10
echo "=== Token Status ===" && tail -3 /home/node/.openclaw/workspace/logs/token-refresh.log

# Network check
curl -v http://localhost:3456/health

# Config check
python3 -c "import json; print(json.dumps(json.load(open('/home/node/.openclaw/openclaw.json'))['agents']['defaults']['model'], indent=2))"
```

---

## Maintenance

### Weekly Auto-Update (Mondays 8am UTC)

The system automatically updates every Monday at 8am UTC:

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

## Quick Recovery QR Code

```
┌────────────────────────────────────────┐
│           EMERGENCY CONTACTS            │
├────────────────────────────────────────┤
│                                        │
│  SSH: ssh root@<YOUR_VPS_IP>           │
│                                        │
│  WhatsApp: +351910552813 (Vijay)       │
│                                        │
│  Docs: github.com/vijworks/openclaw    │
│                                        │
│  Run: curl http://localhost:3456/health│
│                                        │
└────────────────────────────────────────┘
```

---

*This document is auto-maintained by JarvisOS. Last sync: 2026-03-03*
