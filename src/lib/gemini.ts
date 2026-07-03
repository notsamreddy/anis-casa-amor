import type { ParsedSchedule, ParsedScheduleEvent } from "@/lib/schedule-types";
import {
  fillMissingDaysWithTimeOff,
  normalizeScheduleLocation,
} from "@/lib/schedule-types";

const DEFAULT_MODEL = "gemini-2.5-flash";

const EXTRACTION_PROMPT = `You analyze weekly work schedule screenshots from workforce scheduling apps.

The image shows a horizontal week grid with exactly 6 columns (Monday through Saturday).
Sunday is never shown — do not use dayIndex 6.
Column 1 = Monday (dayIndex 0), column 6 = Saturday (dayIndex 5).
Each column may have zero or more stacked event blocks.

Extract every visible event. Rules:
- "TIME OFF ALL DAY" or similar => type "time_off", allDay true, no times
- Work shifts => type "shift" with start/end times in 24-hour HH:MM format
- Location is text after "AT". Always expand truncations:
  RESTO => Reston, LEESBU => Leesburg, OFFICE => On call
  On call means she is on standby for the day but might not actually work
  Other stores: format as "Crumbl - {Location}" (e.g. "Crumbl - Reston")
- Diagonal stripes often mean time off or pending request; still extract the event
- dayIndex is 0 (Monday) through 5 (Saturday) based on column position left to right
- Never use dayIndex 6 — Sunday is not in the screenshot
- If a day column has no shift, treat that day as time off (all day)
- If a day column is empty, omit it (time off will be added automatically)
- Do not invent events that are not visible

Return JSON only:
{
  "events": [
    {
      "dayIndex": 0,
      "type": "shift",
      "startTime": "06:00",
      "endTime": "23:00",
      "location": "On call",
      "allDay": false
    }
  ]
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

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function normalizeEvent(raw: unknown): ParsedScheduleEvent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const event = raw as Record<string, unknown>;
  const dayIndex = Number(event.dayIndex);
  const type = event.type;

  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 5) {
    return null;
  }

  if (type !== "shift" && type !== "time_off") {
    return null;
  }

  const allDay = Boolean(event.allDay);
  const startTime = isValidTime(event.startTime) ? event.startTime : null;
  const endTime = isValidTime(event.endTime) ? event.endTime : null;
  const location =
    typeof event.location === "string" && event.location.trim()
      ? normalizeScheduleLocation(event.location.trim())
      : null;

  return {
    dayIndex,
    type,
    startTime: allDay ? null : startTime,
    endTime: allDay ? null : endTime,
    location: type === "shift" ? location : null,
    allDay,
    hasConflict: false,
  };
}

export function normalizeParsedSchedule(raw: unknown): ParsedSchedule {
  if (!raw || typeof raw !== "object") {
    return { events: [] };
  }

  const payload = raw as { events?: unknown };
  if (!Array.isArray(payload.events)) {
    return { events: [] };
  }

  const events = fillMissingDaysWithTimeOff(
    payload.events
      .map(normalizeEvent)
      .filter((event): event is ParsedScheduleEvent => event !== null)
      .sort((left, right) => left.dayIndex - right.dayIndex),
  );

  return { events };
}

export async function extractScheduleFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<ParsedSchedule> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const message = data.error?.message ?? `Gemini request failed (${response.status})`;
    throw new Error(message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return normalizeParsedSchedule(parseJsonResponse(text));
}
