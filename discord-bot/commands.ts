import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";

import { CasaApiError, casaApi } from "./api";
import {
  dayScheduleEmbed,
  gymButtons,
  gymEmbed,
  helpEmbed,
  pickEmbed,
  recipeActionButtons,
  recipeListEmbed,
  recipePickEmbed,
  scheduleEmbed,
  searchResultButtons,
  searchResultsEmbed,
  watchlistActionButtons,
  watchlistEmbed,
} from "./embeds";

export const commandData = [
  new SlashCommandBuilder()
    .setName("casa")
    .setDescription("What can Casa Amor do in Discord?"),
  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link Discord to your Casa Amor account"),
  new SlashCommandBuilder()
    .setName("movie")
    .setDescription("Watchlist — search, add, pick, and manage")
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Search TMDB and add from results")
        .addStringOption((option) =>
          option.setName("query").setDescription("Title to search").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Movie or series (default: movie)")
            .addChoices(
              { name: "Movie", value: "movie" },
              { name: "Series", value: "series" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a title manually")
        .addStringOption((option) =>
          option.setName("title").setDescription("Title").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Movie or series (default: movie)")
            .addChoices(
              { name: "Movie", value: "movie" },
              { name: "Series", value: "series" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("priority")
            .setDescription("Priority (default: medium)")
            .addChoices(
              { name: "High", value: "high" },
              { name: "Medium", value: "medium" },
              { name: "Low", value: "low" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("random")
        .setDescription("Random unwatched pick")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Filter by type (default: movie)")
            .addChoices(
              { name: "Movie", value: "movie" },
              { name: "Series", value: "series" },
              { name: "Either", value: "any" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("priority")
            .setDescription("Only pick from this priority")
            .addChoices(
              { name: "High", value: "high" },
              { name: "Medium", value: "medium" },
              { name: "Low", value: "low" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("done")
        .setDescription("Mark a title as watched")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Watchlist item id")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("priority")
        .setDescription("Change priority on a watchlist item")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Watchlist item id")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("level")
            .setDescription("New priority")
            .setRequired(true)
            .addChoices(
              { name: "High", value: "high" },
              { name: "Medium", value: "medium" },
              { name: "Low", value: "low" },
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName("gym")
    .setDescription("Today's workout checklist")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Workout type")
        .setRequired(true)
        .addChoices(
          { name: "Push", value: "push" },
          { name: "Pull", value: "pull" },
          { name: "Legs", value: "legs" },
        ),
    ),
  new SlashCommandBuilder()
    .setName("watchlist")
    .setDescription("Full watchlist tools")
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Show unwatched titles")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Filter by type")
            .addChoices(
              { name: "Movie", value: "movie" },
              { name: "Series", value: "series" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("pick")
        .setDescription("Random unwatched pick")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Filter by type")
            .addChoices(
              { name: "Movie", value: "movie" },
              { name: "Series", value: "series" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add something to watch")
        .addStringOption((option) =>
          option.setName("title").setDescription("Title").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Movie or series")
            .addChoices(
              { name: "Movie", value: "movie" },
              { name: "Series", value: "series" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("priority")
            .setDescription("Priority")
            .addChoices(
              { name: "High", value: "high" },
              { name: "Medium", value: "medium" },
              { name: "Low", value: "low" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("done")
        .setDescription("Mark a title as watched")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Watchlist item id")
            .setRequired(true),
        ),
    ),
  new SlashCommandBuilder()
    .setName("recipe")
    .setDescription("Add or pick a recipe video")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Save a YouTube recipe link")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("YouTube link")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Optional title (auto-fetched if blank)"),
        )
        .addStringOption((option) =>
          option.setName("notes").setDescription("Optional notes"),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("random").setDescription("Random recipe to cook"),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Show saved recipes"),
    )
    .addSubcommand((sub) =>
      sub.setName("pick").setDescription("Random recipe to cook (same as random)"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("made")
        .setDescription("Mark a recipe as made")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Recipe id")
            .setRequired(true),
        ),
    ),
  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Work schedule")
    .addSubcommand((sub) =>
      sub.setName("today").setDescription("Today's shifts"),
    )
    .addSubcommand((sub) =>
      sub.setName("tomorrow").setDescription("Tomorrow's shifts"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("week")
        .setDescription("Full week view")
        .addIntegerOption((option) =>
          option
            .setName("offset")
            .setDescription("0 = this week, 1 = next, -1 = last")
            .setMinValue(-4)
            .setMaxValue(4),
        ),
    ),
].map((command) => command.toJSON());

async function replyError(
  interaction: ChatInputCommandInteraction,
  error: unknown,
) {
  const message =
    error instanceof CasaApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Something went wrong.";

  const payload = { content: `❌ ${message}`, ephemeral: true as const };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

async function replyMovieRandom(
  interaction: ChatInputCommandInteraction,
  typeOption: string | null,
  priorityOption?: string | null,
) {
  const mediaType =
    !typeOption || typeOption === "any" ? undefined : typeOption;
  const priority = priorityOption ?? undefined;
  const { pick } = await casaApi.pickWatchlist(mediaType, priority);
  await interaction.editReply({
    embeds: [pickEmbed(pick)],
    components: watchlistActionButtons(
      pick,
      mediaType,
      interaction.user.id,
    ),
  });
}

async function replyRecipeRandom(interaction: ChatInputCommandInteraction) {
  const { pick } = await casaApi.pickRecipe();
  await interaction.editReply({
    embeds: [recipePickEmbed(pick)],
    components: recipeActionButtons(pick, interaction.user.id),
  });
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const name = interaction.commandName;

  try {
    if (name === "casa") {
      await interaction.reply({ embeds: [helpEmbed()] });
      return;
    }

    if (name === "link") {
      const status = await casaApi.getLinkStatus(interaction.user.id);
      if (status.linked) {
        await interaction.reply({
          content: "✅ Your Discord is already linked to Casa Amor.",
          ephemeral: true,
        });
        return;
      }

      const { code, expiresInMinutes, linkUrl } = await casaApi.generateLink(
        interaction.user.id,
      );
      await interaction.reply({
        content: [
          `Your link code: **${code}**`,
          `Expires in ${expiresInMinutes} minutes.`,
          `Open ${linkUrl} while signed in and enter the code.`,
        ].join("\n"),
        ephemeral: true,
      });
      return;
    }

    if (name === "movie") {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply();

      if (sub === "search") {
        const query = interaction.options.getString("query", true);
        const type = interaction.options.getString("type") ?? "movie";
        const { results } = await casaApi.searchWatchlist(query, type);
        await interaction.editReply({
          embeds: [searchResultsEmbed(results, query, type)],
          components:
            results.length > 0
              ? searchResultButtons(results, interaction.user.id)
              : [],
        });
        return;
      }

      if (sub === "add") {
        const title = interaction.options.getString("title", true);
        const type = interaction.options.getString("type") ?? "movie";
        const priority = interaction.options.getString("priority") ?? "medium";
        const { item } = await casaApi.addWatchlist(
          interaction.user.id,
          title,
          type,
          priority,
        );
        await interaction.editReply({
          content: `Added **${item.title}** to the watchlist (\`${item.id}\`).`,
        });
        return;
      }

      if (sub === "random") {
        await replyMovieRandom(
          interaction,
          interaction.options.getString("type") ?? "movie",
          interaction.options.getString("priority"),
        );
        return;
      }

      if (sub === "done") {
        const id = interaction.options.getInteger("id", true);
        const { item } = await casaApi.doneWatchlist(id, true);
        await interaction.editReply({
          content: `Marked **${item.title}** as watched.`,
        });
        return;
      }

      if (sub === "priority") {
        const id = interaction.options.getInteger("id", true);
        const level = interaction.options.getString("level", true);
        const { item } = await casaApi.setWatchlistPriority(id, level);
        await interaction.editReply({
          content: `Set **${item.title}** to **${item.priority}** priority.`,
        });
        return;
      }
    }

    if (name === "gym") {
      await interaction.deferReply();
      const type = interaction.options.getString("type", true);
      const workout = await casaApi.getGym(type, interaction.user.id);
      await interaction.editReply({
        embeds: [gymEmbed(workout)],
        components: gymButtons(workout, interaction.user.id),
      });
      return;
    }

    if (name === "watchlist") {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply();

      if (sub === "list") {
        const type = interaction.options.getString("type") ?? undefined;
        const { items } = await casaApi.listWatchlist(type);
        await interaction.editReply({
          embeds: [watchlistEmbed(items, type)],
        });
        return;
      }

      if (sub === "pick") {
        await replyMovieRandom(
          interaction,
          interaction.options.getString("type"),
        );
        return;
      }

      if (sub === "add") {
        const title = interaction.options.getString("title", true);
        const type = interaction.options.getString("type") ?? "movie";
        const priority = interaction.options.getString("priority") ?? "medium";
        const { item } = await casaApi.addWatchlist(
          interaction.user.id,
          title,
          type,
          priority,
        );
        await interaction.editReply({
          content: `Added **${item.title}** to the watchlist (\`${item.id}\`).`,
        });
        return;
      }

      if (sub === "done") {
        const id = interaction.options.getInteger("id", true);
        const { item } = await casaApi.doneWatchlist(id, true);
        await interaction.editReply({
          content: `Marked **${item.title}** as watched.`,
        });
        return;
      }
    }

    if (name === "recipe") {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply();

      if (sub === "add") {
        const url = interaction.options.getString("url", true);
        const title = interaction.options.getString("title") ?? undefined;
        const notes = interaction.options.getString("notes") ?? undefined;
        const { item } = await casaApi.addRecipe(
          interaction.user.id,
          url,
          title,
          notes,
        );
        await interaction.editReply({
          content: `Saved **${item.title}** (\`${item.id}\`)\n${item.videoUrl}`,
        });
        return;
      }

      if (sub === "list") {
        const { items } = await casaApi.listRecipes();
        await interaction.editReply({ embeds: [recipeListEmbed(items)] });
        return;
      }

      if (sub === "pick" || sub === "random") {
        await replyRecipeRandom(interaction);
        return;
      }

      if (sub === "made") {
        const id = interaction.options.getInteger("id", true);
        const { item } = await casaApi.madeRecipe(id, true);
        await interaction.editReply({
          content: `Marked **${item.title}** as made. Rate it on the site if you want.`,
        });
        return;
      }
    }

    if (name === "schedule") {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply();

      if (sub === "today") {
        const day = await casaApi.getDaySchedule("today");
        await interaction.editReply({
          embeds: [dayScheduleEmbed(day, "Today")],
        });
        return;
      }

      if (sub === "tomorrow") {
        const day = await casaApi.getDaySchedule("tomorrow");
        await interaction.editReply({
          embeds: [dayScheduleEmbed(day, "Tomorrow")],
        });
        return;
      }

      if (sub === "week") {
        const offset = interaction.options.getInteger("offset") ?? 0;
        const schedule = await casaApi.getSchedule(offset);
        await interaction.editReply({
          embeds: [
            scheduleEmbed(schedule.days, schedule.weekStart, schedule.weekEnd),
          ],
        });
      }
    }
  } catch (error) {
    await replyError(interaction, error);
  }
}

export function registerInteractionHandlers(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (!interaction.isButton()) {
      return;
    }

    const parts = interaction.customId.split(":");
    const kind = parts[0];

    try {
      if (kind === "gym") {
        const [, type, exerciseIdRaw, ownerId, nextCompletedRaw] = parts;
        if (!type || !exerciseIdRaw || !ownerId) {
          return;
        }

        if (interaction.user.id !== ownerId) {
          await interaction.reply({
            content: "Those buttons belong to someone else's workout.",
            ephemeral: true,
          });
          return;
        }

        await interaction.deferUpdate();
        const workout = await casaApi.toggleGym(
          ownerId,
          Number(exerciseIdRaw),
          nextCompletedRaw === "1",
          type,
        );
        await interaction.editReply({
          embeds: [gymEmbed(workout)],
          components: gymButtons(workout, ownerId),
        });
        return;
      }

      if (kind === "mv") {
        const [, action, tmdbIdRaw, mediaType, ownerId] = parts;
        if (action !== "add" || !tmdbIdRaw || !mediaType || !ownerId) {
          return;
        }

        if (interaction.user.id !== ownerId) {
          await interaction.reply({
            content: "Only you can add from your search results.",
            ephemeral: true,
          });
          return;
        }

        await interaction.deferUpdate();
        const { item } = await casaApi.addWatchlistTmdb(
          ownerId,
          Number(tmdbIdRaw),
          mediaType,
        );
        await interaction.editReply({
          content: `Added **${item.title}** to the watchlist (\`${item.id}\`).`,
          embeds: [],
          components: [],
        });
        return;
      }

      if (kind === "wl") {
        const [, action, a, b] = parts;
        if (action === "done") {
          const id = Number(a);
          const ownerId = b;
          if (!ownerId || interaction.user.id !== ownerId) {
            await interaction.reply({
              content: "Only the person who rolled can mark this watched.",
              ephemeral: true,
            });
            return;
          }
          await interaction.deferUpdate();
          const { item } = await casaApi.doneWatchlist(id, true);
          await interaction.editReply({
            content: `Marked **${item.title}** as watched.`,
            embeds: [],
            components: [],
          });
          return;
        }

        if (action === "reroll") {
          const mediaType = a === "any" ? undefined : a;
          const ownerId = b;
          if (!ownerId || interaction.user.id !== ownerId) {
            await interaction.reply({
              content: "Only the person who rolled can pick again.",
              ephemeral: true,
            });
            return;
          }
          await interaction.deferUpdate();
          const { pick } = await casaApi.pickWatchlist(mediaType);
          await interaction.editReply({
            content: null,
            embeds: [pickEmbed(pick)],
            components: watchlistActionButtons(pick, mediaType, ownerId),
          });
          return;
        }
      }

      if (kind === "rp") {
        const [, action, a, b] = parts;
        if (action === "made") {
          const id = Number(a);
          const ownerId = b;
          if (!ownerId || interaction.user.id !== ownerId) {
            await interaction.reply({
              content: "Only the person who rolled can mark this made.",
              ephemeral: true,
            });
            return;
          }
          await interaction.deferUpdate();
          const { item } = await casaApi.madeRecipe(id, true);
          await interaction.editReply({
            content: `Marked **${item.title}** as made.`,
            embeds: [],
            components: [],
          });
          return;
        }

        if (action === "reroll") {
          const ownerId = a;
          if (!ownerId || interaction.user.id !== ownerId) {
            await interaction.reply({
              content: "Only the person who rolled can pick again.",
              ephemeral: true,
            });
            return;
          }
          await interaction.deferUpdate();
          const { pick } = await casaApi.pickRecipe();
          await interaction.editReply({
            content: null,
            embeds: [recipePickEmbed(pick)],
            components: recipeActionButtons(pick, ownerId),
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof CasaApiError
          ? error.message
          : "Something went wrong.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: `❌ ${message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
      }
    }
  });
}
