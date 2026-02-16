---
summary: "Complete beginner's guide to hosting OpenClaw on a Hetzner VPS — from account creation to a running 24/7 AI assistant"
read_when:
  - You have never used a VPS or server before and want OpenClaw running 24/7
  - You want a step-by-step walkthrough of Hetzner signup, server creation, and OpenClaw deployment
  - You know nothing about SSH, Docker, or Linux and want to self-host OpenClaw
title: "Hetzner VPS Guide (Absolute Beginners)"
---

# Hosting OpenClaw on a Hetzner VPS — Complete Beginner's Guide

This guide assumes you have **zero** technical experience. It walks you through
every click, every command, and every concept from scratch. By the end you will
have OpenClaw running 24/7 on your own server for roughly $5–10/month.

---

## Table of contents

1. [What are we doing and why?](#1-what-are-we-doing-and-why)
2. [What you need before you start](#2-what-you-need-before-you-start)
3. [Sign up for Hetzner](#3-sign-up-for-hetzner)
4. [Create your server (VPS)](#4-create-your-server-vps)
5. [Connect to your server (SSH)](#5-connect-to-your-server-ssh)
6. [Install Docker on the server](#6-install-docker-on-the-server)
7. [Get the OpenClaw code onto the server](#7-get-the-openclaw-code-onto-the-server)
8. [Configure OpenClaw](#8-configure-openclaw)
9. [Build and start OpenClaw](#9-build-and-start-openclaw)
10. [Access OpenClaw from your computer](#10-access-openclaw-from-your-computer)
11. [Set up your AI provider (required)](#11-set-up-your-ai-provider-required)
12. [Connect messaging channels (optional)](#12-connect-messaging-channels-optional)
13. [Keep it running and update it](#13-keep-it-running-and-update-it)
14. [Troubleshooting](#14-troubleshooting)
15. [Glossary](#15-glossary)

---

## 1) What are we doing and why?

**OpenClaw** is a personal AI assistant that connects to your messaging apps
(WhatsApp, Telegram, Discord, etc.) and responds using AI models like Claude or
ChatGPT. Think of it as your own private AI butler that lives on the internet
and is always available.

Right now it needs a computer to run on 24/7. Your laptop is not ideal because
you turn it off, close it, or take it places. Instead, we will rent a tiny
server in a data center that runs all day, every day. That server is called a
**VPS** (Virtual Private Server).

**Hetzner** is a German hosting company known for affordable, reliable servers.
A small VPS costs around €4–7/month (~$5–8 USD).

**What the final setup looks like:**

```
Your phone / laptop
        │
        │  (internet)
        ▼
┌─────────────────────┐
│   Hetzner VPS       │
│   (tiny server)     │
│                     │
│   ┌───────────────┐ │
│   │  OpenClaw     │ │  ──► connects to Telegram, WhatsApp, etc.
│   │  (in Docker)  │ │  ──► talks to Claude / ChatGPT API
│   └───────────────┘ │
└─────────────────────┘
```

---

## 2) What you need before you start

- **A computer** (Mac, Windows, or Linux — any will work)
- **An internet connection**
- **A credit card or PayPal** (for Hetzner billing, ~$5/month)
- **An AI provider API key** — you need at least one of:
  - An [Anthropic API key](https://console.anthropic.com/) (for Claude) — **recommended**
  - An [OpenAI API key](https://platform.openai.com/api-keys) (for ChatGPT)
  - An [OpenRouter API key](https://openrouter.ai/keys) (gives access to many models)
- **About 30–45 minutes** of your time

> **What is an API key?** It is like a password that lets OpenClaw talk to the
> AI service on your behalf. You create one on the AI provider's website. Each
> provider charges separately for AI usage (typically a few dollars per month
> for personal use).

---

## 3) Sign up for Hetzner

### Step 3.1 — Go to the Hetzner website

Open your browser and go to: **https://www.hetzner.com**

### Step 3.2 — Create an account

1. Click **"Sign Up"** or **"Register"** (top right corner).
2. Enter your **email address**.
3. Create a **password**.
4. Verify your email — Hetzner will send you a confirmation link. Click it.

### Step 3.3 — Complete identity verification

Hetzner requires identity verification for new accounts. This is normal and
protects against fraud.

1. You will be asked for your **name, address, and phone number**.
2. You may need to provide a **valid ID** (passport or national ID card) — they
   may ask you to upload a photo of it.
3. You will add a **payment method** (credit card or PayPal).
4. Verification can take **a few minutes to a few hours**. You will receive an
   email when your account is approved.

### Step 3.4 — Go to Hetzner Cloud Console

Once verified, go to: **https://console.hetzner.cloud**

This is where you will create and manage your server.

---

## 4) Create your server (VPS)

### Step 4.1 — Create a project

1. In the Cloud Console, click **"+ New project"**.
2. Name it something like **"OpenClaw"**.
3. Click the project to open it.

### Step 4.2 — Create a server

1. Click **"Add Server"** (or the **"+"** button).
2. You will see a form with several options. Here is exactly what to pick:

### Step 4.3 — Choose location

Pick the data center closest to you for lowest latency:

| If you are in... | Choose |
|---|---|
| Europe | **Falkenstein** or **Nuremberg** (cheapest) or **Helsinki** |
| US East Coast | **Ashburn** |
| US West Coast | **Hillsboro** |
| Asia | **Singapore** |

Any location works. Closer = slightly faster responses.

### Step 4.4 — Choose image (operating system)

Select: **Ubuntu 24.04**

(This is the operating system that will run on your server. Ubuntu is the most
beginner-friendly Linux.)

### Step 4.5 — Choose server type

You will see three tabs across the top: **Shared Resources**, **Dedicated
Resources**, and **General Purpose**.

1. Click **"Shared Resources"** (this should already be selected).
2. Below that you will see sub-tabs: **Cost-Optimized** and
   **Performance-Optimized**. Click **"Cost-Optimized"**.
3. Choose an architecture — **either works fine**:

   | Architecture | Server to pick | Price | Notes |
   |---|---|---|---|
   | **x86 (Intel/AMD)** | **CX22** (2 vCPU, 4 GB RAM) | ~€4–6/month | Traditional, widest compatibility |
   | **Arm64 (Ampere)** | **CAX11** (2 vCPU, 4 GB RAM) | ~€4–5/month | Slightly cheaper, equally supported |

   If x86 servers are sold out in your chosen location (it happens), switch to
   **Arm64** and pick **CAX11**. OpenClaw fully supports both architectures.

4. Select the server with **2 vCPUs and 4 GB RAM** (CX22 on x86 or CAX11 on
   Arm64).

> **Why "Shared Resources / Cost-Optimized"?** OpenClaw is a lightweight
> workload — it mostly sits idle waiting for messages and then calls AI APIs.
> It does not need dedicated CPU cores. Shared resources are significantly
> cheaper and perfectly adequate.
>
> **Why 4 GB RAM?** OpenClaw needs at least 2 GB RAM to build and run
> comfortably. 4 GB gives you headroom. If you only see the 2 GB option
> (CX11 or CAX11 with 2 GB), that will also work but may be tight during
> the Docker build step.
>
> Do **not** pick "Dedicated Resources" or "General Purpose" — those cost
> much more and you do not need them.

### Step 4.6 — Networking

Leave defaults:
- **Public IPv4**: checked (you need this)
- **Public IPv6**: checked (free, leave it on)

### Step 4.7 — SSH key (important)

An SSH key lets you connect to your server securely without typing a password
each time. You have two options:

#### Option A: Use a password (simpler for beginners)

- Skip the SSH key section.
- Hetzner will email you a **root password** after creation.
- This works but is less secure. Fine for getting started.

#### Option B: Create an SSH key (more secure, recommended)

On **Mac or Linux**, open your Terminal app and type:

```bash
ssh-keygen -t ed25519 -C "my-openclaw-key"
```

Press **Enter** three times (accept defaults, no passphrase for simplicity).

Then display your public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (it starts with `ssh-ed25519`).

On **Windows**, open **PowerShell** (search "PowerShell" in Start menu) and run
the same commands above. Windows 10/11 has SSH built in.

Back in the Hetzner form:
1. Click **"Add SSH key"**.
2. Paste your public key into the box.
3. Name it something like **"My Laptop"**.
4. Click **"Add"**.

### Step 4.8 — Other options

- **Volumes**: Skip (not needed).
- **Firewalls**: Skip for now (we will use SSH tunneling for security).
- **Backups**: Optional. Costs ~20% extra. Nice to have but not required.
- **Name**: Give your server a name like **"openclaw"**.

### Step 4.9 — Create the server

Click **"Create & Buy now"**.

Your server will be created in about 30 seconds. You will see its **IP address**
displayed (something like `167.235.12.34`). **Write this down or copy it.** You
will need it constantly.

---

## 5) Connect to your server (SSH)

SSH is how you talk to your server from your computer. Think of it like a remote
control — you type commands on your computer and they run on the server.

### On Mac or Linux

Open **Terminal** (on Mac: search "Terminal" in Spotlight).

Type:

```bash
ssh root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with the actual IP address from step 4.9. For example:

```bash
ssh root@167.235.12.34
```

- If asked "Are you sure you want to continue connecting?" type **yes** and
  press Enter.
- If you used a password (Option A), enter the password Hetzner emailed you.
- If you used an SSH key (Option B), it will connect automatically.

### On Windows

Open **PowerShell** or **Windows Terminal** and type the same command:

```bash
ssh root@YOUR_SERVER_IP
```

If that does not work, download and install **PuTTY** from
https://www.putty.org/ — it is a free SSH program for Windows. Enter your
server IP address in the "Host Name" field and click "Open".

### You are now on your server

You should see something like:

```
root@openclaw:~#
```

This means you are now typing commands **on the server**, not on your laptop.
Everything from here on happens on the server.

---

## 6) Install Docker on the server

Docker is a tool that packages applications (like OpenClaw) into isolated
containers. Think of it like a shipping container — everything OpenClaw needs is
packed inside, and it runs the same way everywhere.

Run these commands one by one (copy and paste each line, press Enter after each):

```bash
apt-get update
```

```bash
apt-get install -y git curl ca-certificates
```

```bash
curl -fsSL https://get.docker.com | sh
```

This installs Docker. It may print a lot of text — that is normal.

Verify it worked:

```bash
docker --version
```

You should see something like `Docker version 27.x.x`. If you see a version
number, Docker is installed.

Also check Docker Compose (a companion tool):

```bash
docker compose version
```

You should see `Docker Compose version v2.x.x`.

---

## 7) Get the OpenClaw code onto the server

We will **fork** the OpenClaw repository first, then clone **your fork**. This
way you own your copy and can customize it freely, while still being able to pull
updates from the original project.

### Step 7.1 — Fork the repository on GitHub

1. Go to **https://github.com/openclaw/openclaw** in your browser.
2. Click the **"Fork"** button (top right corner).
3. GitHub creates a copy at `https://github.com/YOUR_USERNAME/openclaw`.

> **What is a fork?** A fork is your own personal copy of someone else's
> project on GitHub. You can change anything in your fork without affecting the
> original. And you can always pull new updates from the original later.

### Step 7.2 — Clone your fork onto the server

On your server, run (replace `YOUR_USERNAME` with your GitHub username):

```bash
git clone https://github.com/YOUR_USERNAME/openclaw.git
```

For example, if your GitHub username is `jdoe`:

```bash
git clone https://github.com/jdoe/openclaw.git
```

Then enter the project directory:

```bash
cd openclaw
```

### Step 7.3 — Add the upstream remote

This connects your local copy to the **original** OpenClaw repository so you
can pull future updates:

```bash
git remote add upstream https://github.com/openclaw/openclaw.git
```

You can verify both remotes are set up:

```bash
git remote -v
```

You should see:

```
origin    https://github.com/YOUR_USERNAME/openclaw.git (fetch)
origin    https://github.com/YOUR_USERNAME/openclaw.git (push)
upstream  https://github.com/openclaw/openclaw.git (fetch)
upstream  https://github.com/openclaw/openclaw.git (push)
```

- **origin** = your fork (you push your changes here)
- **upstream** = the original project (you pull updates from here)

You are now inside the OpenClaw project folder on your server.

---

## 8) Configure OpenClaw

### Step 8.1 — Create storage directories

OpenClaw needs a place on the server to store its configuration and data. These
directories survive even if you restart or rebuild the Docker container.

```bash
mkdir -p /root/.openclaw/workspace
```

Set the right permissions (the Docker container runs as user ID 1000):

```bash
chown -R 1000:1000 /root/.openclaw
```

### Step 8.2 — Generate a security token

This token protects your OpenClaw gateway from unauthorized access. Run:

```bash
openssl rand -hex 32
```

This prints a long random string like
`a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1`. **Copy
it** — you will need it in the next step.

### Step 8.3 — Create the environment file

The `.env` file stores your settings and secrets. Create it:

```bash
nano .env
```

> **What is nano?** It is a simple text editor that runs in the terminal. You
> type text, then save and exit.

Paste the following (replace the placeholder values with your own):

```bash
# Docker image name (don't change this)
OPENCLAW_IMAGE=openclaw:local

# Paste the token you generated in step 8.2
OPENCLAW_GATEWAY_TOKEN=PASTE_YOUR_TOKEN_HERE

# Network binding (lan = accessible within Docker network)
OPENCLAW_GATEWAY_BIND=lan

# Bind ports to localhost only — access via SSH tunnel (secure)
# This means ports are NOT exposed to the public internet
OPENCLAW_GATEWAY_PORT=127.0.0.1:18789
OPENCLAW_BRIDGE_PORT=127.0.0.1:18790

# Storage paths on the server
OPENCLAW_CONFIG_DIR=/root/.openclaw
OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

# ──────────────────────────────────────────────
# AI Provider API Key (you need at least ONE)
# Uncomment the one you have and paste your key
# ──────────────────────────────────────────────

# For Claude (Anthropic) — recommended:
# ANTHROPIC_API_KEY=sk-ant-paste-your-key-here

# For ChatGPT (OpenAI):
# OPENAI_API_KEY=sk-paste-your-key-here

# For OpenRouter (access to many models):
# OPENROUTER_API_KEY=sk-or-paste-your-key-here

# For Google Gemini:
# GEMINI_API_KEY=paste-your-key-here

# ──────────────────────────────────────────────
# Messaging channels (optional — set up later)
# ──────────────────────────────────────────────

# TELEGRAM_BOT_TOKEN=123456:ABCDEF...
# DISCORD_BOT_TOKEN=...
```

**Important:** Remove the `#` at the beginning of the line for the AI provider
you are using, and paste your actual API key. For example, if you have an
Anthropic key, the line should look like:

```
ANTHROPIC_API_KEY=sk-ant-api03-actualKeyHere
```

**To save and exit nano:**

1. Press **Ctrl + O** (that is the letter O, not zero) — this saves.
2. Press **Enter** to confirm the filename.
3. Press **Ctrl + X** to exit.

### Step 8.4 — Set up Docker Compose

The project already includes a `docker-compose.yml` file. For a production VPS
setup we add an **override** file with a few extra settings. Create it:

```bash
nano docker-compose.override.yml
```

Paste:

```yaml
services:
  openclaw-gateway:
    build: .
    env_file:
      - .env
    environment:
      NODE_ENV: production
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "lan",
        "--port",
        "18789",
        "--allow-unconfigured",
      ]
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

> **Why no `ports:` section here?** The base `docker-compose.yml` already maps
> the ports using the `OPENCLAW_GATEWAY_PORT` and `OPENCLAW_BRIDGE_PORT`
> variables from your `.env` file. We set those to `127.0.0.1:18789` in
> step 8.3, which means the ports are only accessible from the server itself
> (localhost), not from the public internet. This is a security measure — you
> will access it from your laptop via an SSH tunnel (explained in step 10).
> Do **not** add a `ports:` section here or you will get a "port already in
> use" error.

### Step 8.5 — Create the OpenClaw config file

OpenClaw stores its settings in a JSON config file. We need to create one with
an important setting that allows the Control UI (dashboard) to connect properly
through Docker.

> **Why is this needed?** When you access the Control UI through an SSH tunnel,
> the connection passes through Docker's internal network. Docker uses a
> different IP address (`172.x.x.x`) than regular localhost (`127.0.0.1`), so
> the gateway thinks you are a remote/unknown device and blocks the connection
> with a "pairing required" error. This setting tells the gateway to trust
> Control UI connections that have the correct token, even if they come through
> Docker's network.

Run this command (copy and paste the entire block at once):

```bash
cat > /root/.openclaw/openclaw.json << 'EOF'
{
  "gateway": {
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
EOF
```

Then fix the permissions so OpenClaw can read it:

```bash
chown 1000:1000 /root/.openclaw/openclaw.json
```

> **Is `dangerouslyDisableDeviceAuth` dangerous?** Despite the scary name, this
> is safe in your setup because your ports are already locked to localhost
> (step 8.3) and only accessible through your SSH tunnel. No one can reach
> the gateway without your SSH password or key. The setting simply skips an
> extra device-pairing step that does not work well with Docker networking.

---

## 9) Build and start OpenClaw

### Step 9.1 — Build the Docker image

This compiles OpenClaw into a Docker image. It downloads dependencies, builds
the code, and packages everything up.

```bash
docker compose build
```

> **This will take a while** — anywhere from 5 to 20 minutes depending on your
> server. You will see lots of text scrolling by. This is normal. Do not close
> your terminal or interrupt it. Just wait for it to finish.

When it finishes, you will see your command prompt (`root@openclaw:~/openclaw#`)
again.

### Step 9.2 — Start OpenClaw

```bash
docker compose up -d openclaw-gateway
```

The `-d` flag means "detached" — it runs in the background so you can close
your terminal and it keeps running.

### Step 9.3 — Check that it is running

```bash
docker compose logs -f openclaw-gateway
```

You should see log output, and eventually a line like:

```
[gateway] listening on ws://0.0.0.0:18789
```

This means OpenClaw is running. Press **Ctrl + C** to stop watching the logs
(the gateway itself keeps running).

---

## 10) Access OpenClaw from your computer

OpenClaw has a web-based Control UI where you can manage everything. Since we
locked the gateway to localhost for security, we use an **SSH tunnel** to access
it. This creates a secure pipe from your laptop to the server.

### Step 10.1 — Open an SSH tunnel from your laptop

On your **laptop** (not the server), open a **new** terminal window and run:

```bash
ssh -N -L 18789:127.0.0.1:18789 -L 18790:127.0.0.1:18790 root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual server IP. For example:

```bash
ssh -N -L 18789:127.0.0.1:18789 -L 18790:127.0.0.1:18790 root@167.235.12.34
```

> **What does this do?** It says "take ports 18789 and 18790 on my laptop and
> connect them to the same ports on the server." Now when you visit
> `localhost:18789` on your laptop, it is secretly talking to the server.
> Port 18789 is the main gateway. Port 18790 is the bridge (used for some
> features like voice and file transfers).

This command will appear to "hang" (no output, just a blinking cursor). That is
normal — it is keeping the tunnel open. **Leave this terminal window open.**

If it asks for a password, enter your server's root password.

### Step 10.2 — Get your dashboard URL

The Control UI needs a special URL that includes your security token. On the
**server** (SSH in from a different terminal window), run:

```bash
cd /root/openclaw
docker compose run --rm -e OPENCLAW_GATEWAY_URL=ws://openclaw-gateway:18789 openclaw-cli dashboard --no-open
```

This will print something like:

```
Dashboard URL: http://127.0.0.1:18789/#token=a3f8b2c1d4e5...long-string...
```

**Copy the entire URL** (the full line starting with `http://`).

> **Why the extra `-e OPENCLAW_GATEWAY_URL=...` part?** The CLI tool runs in its
> own Docker container, so it needs to be told how to find the gateway container.
> Docker containers talk to each other using service names (like
> `openclaw-gateway`) instead of `localhost`.

### Step 10.3 — Open the Control UI

Open your web browser and **paste the full URL** from step 10.2. It looks like:

```
http://127.0.0.1:18789/#token=a3f8b2c1d4e5...
```

You should see the OpenClaw Control UI and the status should show **Connected**.

> **Bookmark this URL.** You will use it every time you want to access the
> Control UI. The token in the URL does not change unless you regenerate it.

> **If you see "pairing required" errors**, make sure you completed step 8.5
> (creating the `openclaw.json` config file). If you skipped it, go back and
> do it now, then restart the gateway: `docker compose restart openclaw-gateway`

You are now connected to your OpenClaw instance.

---

## 11) Set up your AI provider (required)

OpenClaw needs at least one AI provider to function. If you already put your
API key in the `.env` file (step 8.3), OpenClaw may have picked it up
automatically.

To verify or configure it through the Control UI:

1. Open the Control UI at `http://127.0.0.1:18789/` (with the SSH tunnel
   running).
2. Go to **Settings**.
3. Look for the **Models** or **Providers** section.
4. Add or verify your AI provider API key.

### How to get an API key (if you do not have one yet)

#### Anthropic (Claude) — Recommended

1. Go to https://console.anthropic.com/
2. Sign up or log in.
3. Go to **API Keys** in the left sidebar.
4. Click **"Create Key"**.
5. Copy the key (starts with `sk-ant-`).
6. Add billing / credits to your account (required for the API to work).

#### OpenAI (ChatGPT)

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in.
3. Click **"Create new secret key"**.
4. Copy the key (starts with `sk-`).
5. Add billing at https://platform.openai.com/settings/organization/billing

#### OpenRouter (access to many models)

1. Go to https://openrouter.ai/
2. Sign up or log in.
3. Go to https://openrouter.ai/keys
4. Click **"Create Key"**.
5. Copy the key (starts with `sk-or-`).
6. Add credits on the billing page.

If you add the key to your `.env` file after OpenClaw is already running,
restart the gateway to pick up the change:

```bash
docker compose restart openclaw-gateway
```

---

## 12) Connect messaging channels (optional)

OpenClaw can connect to various messaging platforms. Here is how to set up the
most common ones. You can do this from the server terminal via SSH.

### Telegram

1. Open Telegram and message **@BotFather**.
2. Send `/newbot`.
3. Follow the prompts — choose a name and username.
4. BotFather gives you a **bot token** (looks like `123456789:ABCdefGHI...`).
5. On your server, add to your `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
   ```
6. Restart: `docker compose restart openclaw-gateway`

Or use the CLI:

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "YOUR_TOKEN"
```

### WhatsApp

WhatsApp does not use a bot token — it links your WhatsApp account.

```bash
docker compose run --rm openclaw-cli channels login
```

This displays a QR code in your terminal. Scan it with WhatsApp on your phone
(Settings → Linked Devices → Link a Device).

### Discord

1. Go to https://discord.com/developers/applications
2. Click **"New Application"** and name it.
3. Go to **Bot** in the left sidebar, click **"Add Bot"**.
4. Copy the **bot token**.
5. Under **Privileged Gateway Intents**, enable **Message Content Intent**.
6. Add the bot to your server via the **OAuth2 → URL Generator** (select `bot`
   scope and `Send Messages` + `Read Message History` permissions).
7. Add to `.env`:
   ```
   DISCORD_BOT_TOKEN=your-token-here
   ```
8. Restart: `docker compose restart openclaw-gateway`

---

## 13) Keep it running and update it

### It automatically restarts

The Docker Compose configuration includes `restart: unless-stopped`, which means
if your server reboots or Docker restarts, OpenClaw will start back up
automatically.

### Check status

SSH into your server and run:

```bash
cd /root/openclaw
docker compose ps
```

This shows whether the gateway container is running.

### View logs

```bash
docker compose logs -f openclaw-gateway
```

Press Ctrl+C to stop watching.

### Restart OpenClaw

```bash
docker compose restart openclaw-gateway
```

### Stop OpenClaw

```bash
docker compose down
```

### Update OpenClaw to the latest version

Since you cloned from your fork (step 7), updates come from **upstream** (the
original OpenClaw repository):

```bash
cd /root/openclaw
git fetch upstream
git merge upstream/main
docker compose build
docker compose up -d openclaw-gateway
```

This pulls the latest code from the original project, rebuilds the Docker image,
and restarts the gateway. Your configuration and data in `/root/.openclaw/` are
preserved.

Optionally, push the updates to your fork so it stays in sync:

```bash
git push origin main
```

> **What if the merge has conflicts?** If you have customized code in your fork
> and the update touches the same files, Git will report a "merge conflict." For
> beginners, the simplest fix is to reset and pull fresh:
>
> ```bash
> git stash
> git merge upstream/main
> git stash pop
> ```
>
> Or if you have not made any local changes you want to keep:
>
> ```bash
> git reset --hard upstream/main
> ```

### Server reboots

If you need to reboot the entire server:

```bash
reboot
```

Docker (and OpenClaw) will start automatically when the server comes back up.
You do not need to do anything.

---

## 14) Troubleshooting

### "Permission denied" when connecting via SSH

- Double-check the IP address.
- If you used a password, make sure you are entering it correctly (passwords
  do not show characters as you type — this is normal).
- If you used an SSH key, make sure you are connecting from the same computer
  where you generated the key.

### Docker build fails with "out of memory"

Your server may not have enough RAM. Upgrade to a larger VPS (CX32 with 8 GB
RAM) in the Hetzner console. You can resize without losing data.

### "Cannot connect to the Docker daemon"

Docker may not be running. Start it:

```bash
systemctl start docker
```

### Gateway shows "listening" but Control UI does not load

Make sure the SSH tunnel is running on your laptop (step 10). The tunnel must
stay open the entire time you want to access the UI.

### "unauthorized: gateway token missing" in the Control UI

The Control UI does not have your gateway token. Make sure you are using the
full dashboard URL with the token included (see step 10.2). You can regenerate
the URL at any time:

```bash
cd /root/openclaw
docker compose run --rm -e OPENCLAW_GATEWAY_URL=ws://openclaw-gateway:18789 openclaw-cli dashboard --no-open
```

Or you can retrieve just the token and add it to the URL manually:

```bash
grep OPENCLAW_GATEWAY_TOKEN /root/openclaw/.env
```

Then open: `http://127.0.0.1:18789/#token=PASTE_TOKEN_HERE`

### "pairing required" in the Control UI

This is the most common issue with Docker-based setups. It happens because
Docker's internal networking makes your browser connection appear to come from
an unknown device (IP `172.x.x.x` instead of `127.0.0.1`).

**Fix:** Make sure you have the `openclaw.json` config file from step 8.5. If
you skipped that step or are unsure, run this on your server:

```bash
cat /root/.openclaw/openclaw.json
```

You should see `"dangerouslyDisableDeviceAuth": true` inside a `"controlUi"`
block. If the file is missing or does not contain this setting, create it:

```bash
cat > /root/.openclaw/openclaw.json << 'EOF'
{
  "gateway": {
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
EOF
chown 1000:1000 /root/.openclaw/openclaw.json
```

Then restart the gateway and reload the dashboard URL:

```bash
cd /root/openclaw
docker compose restart openclaw-gateway
```

> **Note:** If you already have an `openclaw.json` with other settings, you
> need to add the `"gateway"` block to it rather than replacing the whole file.
> Open it with `nano /root/.openclaw/openclaw.json` and add the gateway section
> alongside your existing settings.

### WhatsApp QR code not showing

Make sure your terminal window is wide enough to display the QR code. Try making
it full screen.

### Changes to `.env` are not taking effect

You must restart the gateway after editing `.env`:

```bash
cd /root/openclaw
docker compose restart openclaw-gateway
```

### Server IP changed

Hetzner VPS IP addresses do not change unless you delete and recreate the
server. If you did that, update the IP in your SSH commands.

---

## 15) Glossary

| Term | What it means |
|---|---|
| **VPS** | Virtual Private Server — a small server you rent in a data center |
| **SSH** | Secure Shell — a way to remotely control a server by typing commands |
| **Docker** | A tool that packages apps into isolated containers |
| **Docker Compose** | A tool for running multi-container Docker apps from a config file |
| **Container** | A lightweight, isolated environment that runs an application |
| **Terminal** | The app on your computer where you type commands (Terminal on Mac, PowerShell on Windows) |
| **nano** | A simple text editor that runs in the terminal |
| **API key** | A secret code that lets one program talk to another program's service |
| **Gateway** | The core OpenClaw process that manages AI, channels, and tools |
| **SSH tunnel** | A secure pipe that forwards a port from your laptop to the server |
| **Port** | A numbered "door" on a computer where a network service listens |
| **root** | The administrator account on a Linux server (has full control) |
| **IP address** | A numerical address that identifies a computer on the internet (like a phone number) |
| **localhost / 127.0.0.1** | Your own computer (when traffic is directed to "yourself") |
| **Repository (repo)** | A folder containing a project's code, tracked by Git |
| **Fork** | Your own copy of someone else's repository on GitHub — you can modify it freely |
| **Upstream** | The original repository that your fork was created from |
| **Git** | A version control system that tracks changes to code |
| **`.env` file** | A configuration file that stores environment variables (settings and secrets) |

---

## Quick reference card

Once everything is set up, here are the commands you will use most often.

**From your laptop:**

```bash
# Open SSH tunnel to access Control UI (forward both gateway and bridge ports)
ssh -N -L 18789:127.0.0.1:18789 -L 18790:127.0.0.1:18790 root@YOUR_SERVER_IP

# Then open the dashboard URL in your browser (the one from step 10.2)
# It looks like: http://127.0.0.1:18789/#token=YOUR_TOKEN_HERE

# To get the dashboard URL again, run on the server:
# docker compose run --rm -e OPENCLAW_GATEWAY_URL=ws://openclaw-gateway:18789 openclaw-cli dashboard --no-open
```

**From the server (SSH in first with `ssh root@YOUR_SERVER_IP`):**

```bash
# Check if OpenClaw is running
cd /root/openclaw && docker compose ps

# View live logs
docker compose logs -f openclaw-gateway

# Restart
docker compose restart openclaw-gateway

# Stop
docker compose down

# Start
docker compose up -d openclaw-gateway

# Update to latest version (from original project)
git fetch upstream && git merge upstream/main && docker compose build && docker compose up -d openclaw-gateway

# Edit settings
nano .env
# (then restart after editing)
```

---

## Cost summary

| Item | Cost | Notes |
|---|---|---|
| Hetzner CX22 VPS | ~€4.5/month (~$5 USD) | 2 vCPU, 4 GB RAM, 40 GB disk |
| AI Provider (Anthropic/OpenAI) | ~$5–20/month | Depends on how much you use it |
| **Total** | **~$10–25/month** | For a 24/7 personal AI assistant |

---

## What to read next

- [Docker setup details](/install/docker) — advanced Docker configuration options
- [Hetzner production guide](/install/hetzner) — the condensed version for experienced operators
- [Channels](/channels) — connecting more messaging platforms
- [Gateway CLI reference](/cli/gateway) — all gateway commands and options
- [Sandboxing](/gateway/sandboxing) — isolating agent tool execution for security
