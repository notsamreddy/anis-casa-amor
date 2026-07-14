import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import type {
  GymWorkout,
  MediaSearchResult,
  RecipeItem,
  ScheduleDay,
  WatchlistItem,
} from "./api";

const ACCENT = 0xe11d48;
const SUCCESS = 0x10b981;
const INFO = 0x0ea5e9;

export function helpEmbed() {
  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle("Ani's Casa Amor")
    .setDescription(
      "Your household hub in Discord — same data as the app.",
    )
    .addFields(
      {
        name: "/movie",
        value: "`search` · `add` · `random` · `done` · `priority`",
      },
      {
        name: "/recipe",
        value: "`add` a YouTube link · `random` something to cook",
      },
      {
        name: "/schedule",
        value: "`today` · `tomorrow` · `week`",
      },
      {
        name: "/link",
        value: "Connect Discord to your Casa Amor account",
      },
      {
        name: "/gym",
        value: "Push / Pull / Legs checklist with tap-to-complete",
      },
    )
    .setFooter({ text: "Run /link once to use gym, add, and other personal commands" });
}

export function watchlistActionButtons(
  item: WatchlistItem,
  mediaType: string | undefined,
  discordUserId: string,
) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`wl:done:${item.id}:${discordUserId}`)
        .setLabel("Mark watched")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(
          `wl:reroll:${mediaType ?? "any"}:${discordUserId}`,
        )
        .setLabel("Pick again")
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function recipeActionButtons(
  item: RecipeItem,
  discordUserId: string,
) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`rp:made:${item.id}:${discordUserId}`)
        .setLabel("Mark made")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`rp:reroll:${discordUserId}`)
        .setLabel("Pick again")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Open video")
        .setStyle(ButtonStyle.Link)
        .setURL(item.videoUrl),
    ),
  ];
}

export function gymEmbed(workout: GymWorkout) {
  const lines = workout.exercises.map((exercise) => {
    const mark = exercise.completed ? "✅" : "⬜";
    const notes = exercise.notes ? ` — _${exercise.notes}_` : "";
    return `${mark} **${exercise.name}** · ${exercise.sets}×${exercise.reps}${notes}`;
  });

  const done =
    workout.total > 0 && workout.completedCount === workout.total;

  return new EmbedBuilder()
    .setColor(done ? SUCCESS : ACCENT)
    .setTitle(`${workout.planName}`)
    .setDescription(
      lines.length > 0 ? lines.join("\n") : "_No exercises yet — ask the coach._",
    )
    .addFields({
      name: "Progress",
      value: `${workout.completedCount}/${workout.total} · ${workout.date}`,
    });
}

export function gymButtons(workout: GymWorkout, discordUserId: string) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const pending = workout.exercises.filter((exercise) => !exercise.completed);
  const targets = (pending.length > 0 ? pending : workout.exercises).slice(
    0,
    25,
  );

  for (let i = 0; i < targets.length; i += 5) {
    const chunk = targets.slice(i, i + 5);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...chunk.map((exercise) =>
        new ButtonBuilder()
          .setCustomId(
            `gym:${workout.type}:${exercise.id}:${discordUserId}:${exercise.completed ? 0 : 1}`,
          )
          .setLabel(
            truncate(
              exercise.completed
                ? `Undo ${exercise.name}`
                : exercise.name,
              80,
            ),
          )
          .setStyle(
            exercise.completed ? ButtonStyle.Secondary : ButtonStyle.Success,
          ),
      ),
    );
    rows.push(row);
  }

  return rows;
}

export function watchlistEmbed(items: WatchlistItem[], mediaType?: string) {
  const unwatched = items.filter((item) => !item.completed);
  const label = mediaType ?? "all";
  const lines = unwatched.slice(0, 15).map((item) => {
    const priority = item.priority === "high" ? "🔥" : item.priority === "low" ? "💤" : "•";
    const kind = item.mediaType === "series" ? "TV" : "Movie";
    return `${priority} **${item.title}** (${kind}) · \`${item.id}\``;
  });

  return new EmbedBuilder()
    .setColor(INFO)
    .setTitle(`Watchlist · ${label}`)
    .setDescription(
      lines.length > 0
        ? lines.join("\n")
        : "_Nothing unwatched. Use `/watchlist add` or pick on the site._",
    )
    .setFooter({
      text: `${unwatched.length} unwatched · ${items.filter((i) => i.completed).length} done`,
    });
}

export function searchResultsEmbed(
  results: MediaSearchResult[],
  query: string,
  mediaType: string,
) {
  const lines = results.map((item, index) => {
    const year = item.year ? ` (${item.year})` : "";
    return `**${index + 1}.** ${item.title}${year}`;
  });

  return new EmbedBuilder()
    .setColor(INFO)
    .setTitle(`Search · ${mediaType}`)
    .setDescription(
      lines.length > 0
        ? `Results for **${query}**:\n${lines.join("\n")}`
        : `_No results for **${query}**._`,
    )
    .setFooter({ text: "Tap a button below to add to the watchlist" });
}

export function searchResultButtons(
  results: MediaSearchResult[],
  discordUserId: string,
) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const top = results.slice(0, 5);

  for (let i = 0; i < top.length; i += 5) {
    const chunk = top.slice(i, i + 5);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...chunk.map((item) =>
          new ButtonBuilder()
            .setCustomId(
              `mv:add:${item.tmdbId}:${item.mediaType}:${discordUserId}`,
            )
            .setLabel(truncate(item.title, 80))
            .setStyle(ButtonStyle.Primary),
        ),
      ),
    );
  }

  return rows;
}

export function dayScheduleEmbed(day: ScheduleDay, title: string) {
  const lines = day.events.map((event) => {
    const conflict = event.hasConflict ? " ⚠️" : "";
    if (event.type === "time_off" || event.allDay) {
      return `🌴 Time off${event.location ? ` @ ${event.location}` : ""}${conflict}`;
    }
    const time =
      event.startTime && event.endTime
        ? `${event.startTime}–${event.endTime}`
        : "shift";
    return `💼 ${time}${event.location ? ` @ ${event.location}` : ""}${conflict}`;
  });

  return new EmbedBuilder()
    .setColor(INFO)
    .setTitle(title)
    .setDescription(`${day.label} · ${day.shortDate}`)
    .addFields({
      name: "Schedule",
      value:
        lines.length > 0
          ? lines.join("\n")
          : "_Nothing on the schedule for this day._",
    });
}

export function pickEmbed(item: WatchlistItem) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle("🎲 Tonight's pick")
    .setDescription(
      `**${item.title}**\n${item.mediaType === "series" ? "Series" : "Movie"} · ${item.priority} priority · id \`${item.id}\``,
    )
    .setFooter({ text: "Mark done with /movie done or the button below" });

  if (item.posterUrl) {
    embed.setThumbnail(item.posterUrl);
  }

  return embed;
}

export function recipeListEmbed(items: RecipeItem[]) {
  const lines = items.slice(0, 15).map((recipe) => {
    const mark = recipe.made ? "✅" : "🍳";
    const rating = recipe.rating ? ` · ${"★".repeat(recipe.rating)}` : "";
    return `${mark} **${recipe.title}**${rating} · \`${recipe.id}\``;
  });

  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("Recipes")
    .setDescription(
      lines.length > 0 ? lines.join("\n") : "_No recipes yet — add some on the site._",
    )
    .setFooter({
      text: `${items.filter((r) => !r.made).length} to try · ${items.filter((r) => r.made).length} made`,
    });
}

export function recipePickEmbed(item: RecipeItem) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🍳 Cook this")
    .setDescription(`**${item.title}**\n${item.videoUrl}`)
    .setFooter({ text: `id \`${item.id}\` · /recipe made when finished` });
}

export function scheduleEmbed(
  days: ScheduleDay[],
  weekStart: string,
  weekEnd: string,
) {
  const fields = days
    .filter((day) => day.events.length > 0)
    .map((day) => {
      const lines = day.events.map((event) => {
        const conflict = event.hasConflict ? " ⚠️" : "";
        if (event.type === "time_off" || event.allDay) {
          return `🌴 Time off${event.location ? ` @ ${event.location}` : ""}${conflict}`;
        }
        const time =
          event.startTime && event.endTime
            ? `${event.startTime}–${event.endTime}`
            : "shift";
        return `💼 ${time}${event.location ? ` @ ${event.location}` : ""}${conflict}`;
      });
      return {
        name: `${day.label} · ${day.shortDate}`,
        value: lines.join("\n"),
        inline: false,
      };
    });

  return new EmbedBuilder()
    .setColor(INFO)
    .setTitle("Work schedule")
    .setDescription(`${weekStart} → ${weekEnd}`)
    .addFields(
      fields.length > 0
        ? fields
        : [{ name: "Empty week", value: "_No shifts saved for this week._" }],
    );
}

function truncate(value: string, max: number) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}
