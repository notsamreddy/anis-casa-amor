import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local`);
  }
  return value;
}

export const botConfig = {
  token: required("DISCORD_BOT_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
  botSecret: required("DISCORD_BOT_SECRET"),
  reminderChannelId: process.env.DISCORD_REMINDER_CHANNEL_ID?.trim() || undefined,
  apiUrl: (process.env.CASA_API_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
};
