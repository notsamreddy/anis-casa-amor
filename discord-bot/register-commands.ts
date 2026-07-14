import { DiscordAPIError, REST, Routes } from "discord.js";

import { commandData } from "./commands";
import { botConfig } from "./config";

function inviteUrl(clientId: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: "0",
    scope: "bot applications.commands",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

async function main() {
  const rest = new REST({ version: "10" }).setToken(botConfig.token);

  const app = (await rest.get(Routes.oauth2CurrentApplication())) as {
    id: string;
    name: string;
  };

  if (app.id !== botConfig.clientId) {
    console.error(
      [
        "DISCORD_CLIENT_ID does not match DISCORD_BOT_TOKEN.",
        `  Token belongs to application: ${app.name} (${app.id})`,
        `  DISCORD_CLIENT_ID is set to:  ${botConfig.clientId}`,
        "Fix: use the Application ID from the same Discord app as the bot token.",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(`Registering as ${app.name} (${app.id})…`);

  if (botConfig.guildId) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
        { body: commandData },
      );
      console.log(
        `Registered ${commandData.length} guild commands for ${botConfig.guildId}`,
      );
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 50001) {
        console.error(
          [
            "Missing Access — Discord blocked guild command registration.",
            "",
            "Usually one of these:",
            "  1. The bot is not in that server (DISCORD_GUILD_ID wrong or bot kicked).",
            "  2. It was invited without the applications.commands scope.",
            "",
            "Fix: open this invite link while logged in as a server admin, pick your server,",
            "then run npm run bot:register again:",
            "",
            `  ${inviteUrl(botConfig.clientId)}`,
            "",
            "Or clear DISCORD_GUILD_ID to register global commands instead (slower to appear).",
            `Current DISCORD_GUILD_ID: ${botConfig.guildId}`,
          ].join("\n"),
        );
        process.exit(1);
      }
      throw error;
    }
  } else {
    await rest.put(Routes.applicationCommands(botConfig.clientId), {
      body: commandData,
    });
    console.log(
      `Registered ${commandData.length} global commands (can take up to ~1 hour)`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
