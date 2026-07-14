import type { Client, TextChannel } from "discord.js";

import { casaApi } from "./api";
import { botConfig } from "./config";

const CHECK_INTERVAL_MS = 60_000;

export function startReminderLoop(client: Client) {
  if (!botConfig.reminderChannelId) {
    console.log("Shift reminders disabled (set DISCORD_REMINDER_CHANNEL_ID)");
    return;
  }

  async function checkReminders() {
    try {
      const { reminders } = await casaApi.getUpcomingReminders(60);
      if (reminders.length === 0) {
        return;
      }

      const channel = await client.channels.fetch(botConfig.reminderChannelId!);
      if (!channel || !channel.isTextBased()) {
        return;
      }

      const textChannel = channel as TextChannel;

      for (const shift of reminders) {
        const location = shift.location ? ` @ **${shift.location}**` : "";
        await textChannel.send(
          `⏰ Shift in about an hour — **${shift.timeLabel}**${location}`,
        );
      }

      await casaApi.markRemindersSent(
        reminders.map((shift) => ({
          id: shift.id,
          eventDate: shift.eventDate,
        })),
      );
    } catch (error) {
      console.error("Reminder check failed:", error);
    }
  }

  void checkReminders();
  setInterval(() => {
    void checkReminders();
  }, CHECK_INTERVAL_MS);

  console.log(
    `Shift reminders active → channel ${botConfig.reminderChannelId}`,
  );
}
