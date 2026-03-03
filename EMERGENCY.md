# 🚨 JarvisOS Emergency Recovery Manual

> Use this guide if Jarvis stops responding or gets "bricked."
> Keep this bookmarked. Last updated: 2026-03-03.

---

## Quick Diagnosis: Why is Jarvis not responding?

There are 3 common failure modes:

| Symptom | Likely Cause | Fix |
|---|---|---|
| Jarvis replies with auth error | OAuth token revoked | Fix #1 below |
| Jarvis is completely silent | Gateway crashed | Fix #2 below |
| Jarvis works but is slow/dumb | Wrong model active | Fix #3 below |

---

## Fix #1: OAuth Token Revoked (Most Common)

**Signs:** Jarvis says something like "HTTP 403: OAuth token has been revoked"

### Step 1: SSH into your VPS
Open Terminal on your Mac and run:
```
ssh root@YOUR_VPS_IP
```
Enter your password when prompted (characters won't show — that's normal).

### Step 2: Get a new OAuth token
You need to grab a fresh token from your Claude.ai session. Do this on your **laptop**:

1. Open Chrome and go to [claude.ai](https://claude.ai) — make sure you're logged in with your Claude Max account
2. Open Chrome DevTools: press `Cmd + Option + I`
3. Go to the **Application** tab → **Local Storage** → `https://claude.ai`
4. Find the key `claude.ai:oauth` and copy the entire JSON value
5. It should look like:
```json
{"claudeAiOauth":{"accessToken":"sk-ant-oat01-...","refreshToken":"sk-ant-ort01-...","expiresAt":...}}
```

### Step 3: Update the token in OpenClaw config
Back in your SSH terminal:
```bash
cd /root/.openclaw
```

Then run this Python command (replace `YOUR_ACCESS_TOKEN` and `YOUR_REFRESH_TOKEN`):
```bash
python3 -c "
import json
with open('openclaw.json') as f:
    c = json.load(f)
c['env']['vars']['ANTHROPIC_OAUTH_TOKEN'] = 'YOUR_ACCESS_TOKEN'
c['env']['vars']['ANTHROPIC_API_KEY'] = 'YOUR_ACCESS_TOKEN'
with open('openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
print('Done')
"
```

### Step 4: Restart the container
```bash
cd /root/openclaw
docker compose restart openclaw-gateway
```

### Step 5: Verify Jarvis is back
Wait 30 seconds, then message Jarvis on WhatsApp: "Hey"

---

## Fix #2: Gateway Crashed

**Signs:** No response at all, even to basic messages

### Step 1: SSH into VPS (see Fix #1 Step 1)

### Step 2: Check if container is running
```bash
docker ps | grep openclaw
```

If you see the container listed, it's running. If not:
```bash
cd /root/openclaw
docker compose up -d openclaw-gateway
```

### Step 3: Check logs for errors
```bash
docker logs openclaw-openclaw-gateway-1 --tail 50
```

If you see repeated crash errors, restart the container:
```bash
cd /root/openclaw
docker compose restart openclaw-gateway
```

---

## Fix #3: Wrong Model Active (Jarvis seems dumb/broken)

**Signs:** Jarvis is responding but seems like a different, weaker AI

### Step 1: SSH into VPS and check the model
```bash
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    c = json.load(f)
print(c['agents']['defaults']['model'])
"
```

### Step 2: If the model is wrong, update it
The correct model should be `anthropic/claude-sonnet-4-6`.

```bash
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    c = json.load(f)
c['agents']['defaults']['model']['primary'] = 'anthropic/claude-sonnet-4-6'
with open('/root/.openclaw/openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
print('Model updated to claude-sonnet-4-6')
"
```

Then restart:
```bash
cd /root/openclaw
docker compose restart openclaw-gateway
```

---

## Key Files & Locations

| File | Location | What it is |
|---|---|---|
| Main config | `/root/.openclaw/openclaw.json` | All settings, API keys, auth |
| Workspace | `/root/.openclaw/workspace/` | Jarvis's files, memory, skills |
| Memory | `/root/.openclaw/workspace/MEMORY.md` | Long-term memory |
| Docker config | `/root/openclaw/docker-compose.yml` | How the container runs |
| Logs | `docker logs openclaw-openclaw-gateway-1` | Live gateway logs |

---

## Key API Keys & Tokens

All stored in `/root/.openclaw/openclaw.json` under `env.vars`:

| Key Name | What it's for |
|---|---|
| `ANTHROPIC_OAUTH_TOKEN` | Claude Max subscription OAuth (primary) |
| `ANTHROPIC_API_KEY` | Same as above (keep in sync) |
| `ANTHROPIC_API_KEY_FALLBACK` | Standard API key (fallback if OAuth fails) |
| `OPENAI_API_KEY` | OpenAI / Codex |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `WHATSAPP_API_KEY` | WhatsApp connection |

---

## How the Auth Fallback Works

Jarvis is configured with **two auth profiles**:

1. **Primary:** `claude-setup` — Uses OAuth (Claude Max subscription, no usage billing)
2. **Fallback:** `claude-api-fallback` — Uses standard API key (billed per token if OAuth fails)

If the OAuth token is revoked, OpenClaw automatically tries the API key fallback. You'll still get responses, but it'll charge standard Anthropic rates until the OAuth is fixed.

---

## Weekly Auto-Update (Mondays 8am UTC)

Jarvis's container automatically updates to the latest OpenClaw version every Monday.
- Script: `/root/openclaw/update-openclaw.sh`
- Logs: `/root/openclaw/update.log`
- If something breaks after a Monday update, check the log: `cat /root/openclaw/update.log | tail -50`

---

## Emergency Contacts / Resources

- **OpenClaw Discord:** https://discord.com/invite/clawd
- **OpenClaw Docs:** https://docs.openclaw.ai
- **Vijay's Anthropic account:** claude.ai (Claude Max plan)
- **Hetzner VPS:** bzen-jarvisos (check Hetzner console at console.hetzner.cloud)

---

## If All Else Fails: Full Restart

```bash
cd /root/openclaw
docker compose down
docker compose up -d
```

Wait 60 seconds and try WhatsApp again.
