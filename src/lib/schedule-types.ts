export type ScheduleEventType = "shift" | "time_off";

export type ParsedScheduleEvent = {
  dayIndex: number;
  type: ScheduleEventType;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  allDay: boolean;
  hasConflict: boolean;
};

export type ParsedSchedule = {
  events: ParsedScheduleEvent[];
};

export type ScheduleEventInput = {
  eventDate: string;
  type: ScheduleEventType;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  allDay: boolean;
  hasConflict: boolean;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function getDayLabel(dateStr: string): string {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  return DAY_LABELS[day === 0 ? 6 : day - 1] ?? dateStr;
}

export function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function sortDayEvents<
  T extends {
    type: ScheduleEventType;
    startTime: string | null;
  },
>(events: T[]): T[] {
  return [...events].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "time_off" ? -1 : 1;
    }

    if (left.startTime && right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }

    return 0;
  });
}

export function getWeekMonday(date = new Date()): string {
  const copy = new Date(date);
  const weekday = copy.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  copy.setDate(copy.getDate() + offset);
  return toDateString(copy);
}

export function addDays(dateStr: string, days: number): string {
  const copy = new Date(`${dateStr}T12:00:00`);
  copy.setDate(copy.getDate() + days);
  return toDateString(copy);
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function parsedEventToInput(
  event: ParsedScheduleEvent,
  weekStart: string,
): ScheduleEventInput {
  return {
    eventDate: addDays(weekStart, event.dayIndex),
    type: event.type,
    startTime: event.startTime,
    endTime: event.endTime,
    location: normalizeScheduleLocation(event.location),
    allDay: event.allDay,
    hasConflict: event.hasConflict,
  };
}

export function normalizeScheduleLocation(location: string | null): string | null {
  if (!location) {
    return null;
  }

  let normalized = location.trim();

  if (/\boffice\b/i.test(normalized)) {
    return "On call";
  }

  normalized = normalized.replace(/\bleesbu\b/gi, "Leesburg");
  normalized = normalized.replace(/\bresto\b/gi, "Reston");
  normalized = normalized.replace(/\breston\b/gi, "Reston");
  normalized = normalized.replace(
    /^(?:at\s+)?crumbl\s*-\s*/i,
    "Crumbl - ",
  );

  return normalized;
}

export function isOnCallLocation(location: string | null): boolean {
  return normalizeScheduleLocation(location) === "On call";
}

export function applyOverlapFlags(
  events: ParsedScheduleEvent[],
): ParsedScheduleEvent[] {
  const byDay = new Map<number, ParsedScheduleEvent[]>();

  for (const event of events) {
    const dayEvents = byDay.get(event.dayIndex) ?? [];
    dayEvents.push(event);
    byDay.set(event.dayIndex, dayEvents);
  }

  return events.map((event) => {
    if (event.type !== "shift") {
      return event;
    }

    const dayEvents = byDay.get(event.dayIndex) ?? [];
    const hasAllDayTimeOff = dayEvents.some(
      (dayEvent) => dayEvent.type === "time_off" && dayEvent.allDay,
    );
    const shifts = dayEvents.filter((dayEvent) => dayEvent.type === "shift");

    let hasConflict = event.hasConflict;

    if (hasAllDayTimeOff) {
      hasConflict = true;
    }

    if (
      event.startTime &&
      event.endTime &&
      shifts.some(
        (other) =>
          other !== event &&
          other.startTime &&
          other.endTime &&
          other.startTime < event.endTime! &&
          event.startTime! < other.endTime,
      )
    ) {
      hasConflict = true;
    }

    return { ...event, hasConflict };
  });
}

const WORK_DAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const;

export function fillMissingDaysWithTimeOff(
  events: ParsedScheduleEvent[],
): ParsedScheduleEvent[] {
  const byDay = new Map<number, ParsedScheduleEvent[]>();

  for (const event of events) {
    const dayEvents = byDay.get(event.dayIndex) ?? [];
    dayEvents.push(event);
    byDay.set(event.dayIndex, dayEvents);
  }

  const result = [...events];

  for (const dayIndex of WORK_DAY_INDICES) {
    const dayEvents = byDay.get(dayIndex) ?? [];
    const hasShift = dayEvents.some((event) => event.type === "shift");

    if (!hasShift) {
      const hasTimeOff = dayEvents.some((event) => event.type === "time_off");
      if (!hasTimeOff) {
        result.push({
          dayIndex,
          type: "time_off",
          startTime: null,
          endTime: null,
          location: null,
          allDay: true,
          hasConflict: false,
        });
      }
    }
  }

  return result.sort((left, right) => left.dayIndex - right.dayIndex);
}

export function formatScheduleTime(time: string | null): string {
  if (!time) {
    return "";
  }

  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? "0");

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatEventTimeRange(
  startTime: string | null,
  endTime: string | null,
  allDay: boolean,
): string {
  if (allDay) {
    return "All day";
  }

  if (startTime && endTime) {
    return `${formatScheduleTime(startTime)} – ${formatScheduleTime(endTime)}`;
  }

  if (startTime) {
    return formatScheduleTime(startTime);
  }

  return "";
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
