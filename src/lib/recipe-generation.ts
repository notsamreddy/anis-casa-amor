import { extractYouTubeVideoId, fetchYouTubeTitle } from "@/lib/youtube";
import { fetchYouTubeTranscript } from "@/lib/youtube-transcript";

const DEFAULT_MODEL = "gemini-2.5-flash";

const RECIPE_PROMPT = `Extract a practical written recipe from this cooking video so someone can cook it without rewatching.

Use only what you can hear or see in the video. If amounts are unclear, note approximate amounts or say "to taste".
Do not invent ingredients or steps that are not mentioned.

Return JSON only:
{
  "title": "Recipe name",
  "servings": "optional servings text or null",
  "ingredients": ["ingredient with amount"],
  "steps": ["clear step"],
  "tips": ["optional tip"]
}`;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export type ParsedRecipe = {
  title: string;
  servings: string | null;
  ingredients: string[];
  steps: string[];
  tips: string[];
};

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return apiKey;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeParsedRecipe(raw: unknown): ParsedRecipe | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : null;

  if (!title) {
    return null;
  }

  const ingredients = normalizeStringArray(payload.ingredients);
  const steps = normalizeStringArray(payload.steps);

  if (ingredients.length === 0 || steps.length === 0) {
    return null;
  }

  return {
    title,
    servings:
      typeof payload.servings === "string" && payload.servings.trim()
        ? payload.servings.trim()
        : null,
    ingredients,
    steps,
    tips: normalizeStringArray(payload.tips),
  };
}

export function formatRecipeMarkdown(recipe: ParsedRecipe): string {
  const lines = [`# ${recipe.title}`, ""];

  if (recipe.servings) {
    lines.push(`**Servings:** ${recipe.servings}`, "");
  }

  lines.push("## Ingredients", "");
  for (const ingredient of recipe.ingredients) {
    lines.push(`- ${ingredient}`);
  }

  lines.push("", "## Steps", "");
  recipe.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  if (recipe.tips.length > 0) {
    lines.push("", "## Tips", "");
    for (const tip of recipe.tips) {
      lines.push(`- ${tip}`);
    }
  }

  return lines.join("\n");
}

async function callGemini(
  parts: Array<Record<string, unknown>>,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const message =
      data.error?.message ?? `Gemini request failed (${response.status})`;
    throw new Error(message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

async function generateFromVideoUrl(
  videoUrl: string,
  title: string,
): Promise<ParsedRecipe> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube link");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const text = await callGemini([
      { text: `${RECIPE_PROMPT}\n\nVideo title: ${title}` },
      {
        file_data: {
          file_uri: watchUrl,
        },
      },
    ]);

    const parsed = normalizeParsedRecipe(parseJsonResponse(text));
    if (parsed) {
      return parsed;
    }
  } catch {
    // Fall back to transcript extraction below.
  }

  const transcript = await fetchYouTubeTranscript(videoId);
  if (!transcript) {
    throw new Error(
      "Could not read this video. It may have no captions, or Gemini could not analyze it.",
    );
  }

  const text = await callGemini([
    {
      text: `${RECIPE_PROMPT}

Video title: ${title}

Transcript:
${transcript.slice(0, 12000)}`,
    },
  ]);

  const parsed = normalizeParsedRecipe(parseJsonResponse(text));
  if (!parsed) {
    throw new Error("Could not turn this video into a recipe");
  }

  return parsed;
}

export async function generateRecipeFromVideo(
  videoUrl: string,
  fallbackTitle?: string | null,
): Promise<string> {
  const title =
    fallbackTitle?.trim() ||
    (await fetchYouTubeTitle(videoUrl)) ||
    "Untitled recipe";

  const recipe = await generateFromVideoUrl(videoUrl, title);
  return formatRecipeMarkdown(recipe);
}
