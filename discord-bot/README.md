# Casa Amor Discord bot

Slash commands that talk to the same Neon database as the web app via `/api/bot/*`.

## Commands

| Command | What it does |
|---------|----------------|
| `/link` | Get a code to connect Discord → Casa Amor at `/link-discord` |
| `/movie search` | TMDB search with add buttons |
| `/movie add` | Add a title manually |
| `/movie random` | Random unwatched pick (optional `type`, `priority`) |
| `/movie done` | Mark watched by id |
| `/movie priority` | Change priority by id |
| `/recipe add\|random\|list\|made` | Recipe videos |
| `/schedule today\|tomorrow\|week` | Work schedule |
| `/gym` | Push / Pull / Legs checklist |
| `/casa` | Help overview |

Shift reminders post to `DISCORD_REMINDER_CHANNEL_ID` about 1 hour before a shift (bot checks every minute).

## Setup

### 1. Create a Discord application

1. Open [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. **Bot** → **Reset Token** → copy the token
3. **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`; invite the bot to your server
4. Copy **Application ID** (Client ID)

### 2. Env vars

Add to `.env.local` (see `.env.example`):

```env
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...              # your server id — instant slash-command refresh
DISCORD_BOT_SECRET=...            # long random string; same value the API checks
DISCORD_REMINDER_CHANNEL_ID=...   # optional: #general or a shifts channel
CASA_API_URL=http://localhost:3000
```

### 3. Link your account

1. Run `/link` in Discord (ephemeral code, 15 min)
2. Open `/link-discord` on the site while signed in
3. Enter the code

No manual `DISCORD_USER_MAP` editing needed (env map still works as fallback).

### 4. Run

```bash
npm run db:push          # new discord_links tables
npm run dev
npm run bot:register
npm run bot:dev
```

### Troubleshooting: `Missing Access` (50001)

Guild command registration needs the bot **already in that server** with the **`applications.commands`** scope.

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot%20applications.commands
```

After inviting, run `npm run bot:register` again.
