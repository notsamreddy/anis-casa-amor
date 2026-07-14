import { Client, Events, GatewayIntentBits } from "discord.js";

import { registerInteractionHandlers } from "./commands";
import { botConfig } from "./config";
import { startReminderLoop } from "./reminders";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

registerInteractionHandlers(client);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Casa Amor bot online as ${readyClient.user.tag}`);
  console.log(`API → ${botConfig.apiUrl}`);
  startReminderLoop(client);
});

client.login(botConfig.token).catch((error) => {
  console.error(error);
  process.exit(1);
});
