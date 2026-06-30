export const SETTING_KEYS = {
  EXERCISE_SOUND_ENABLED: "exercise_sound_enabled",
} as const;

export function parseBooleanSetting(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true";
}
