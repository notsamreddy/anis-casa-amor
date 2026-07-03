import type { ScheduleEvent } from "@/db/schema";
import { ScheduleEventBlock } from "@/components/schedule-event-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDayLabel,
  getWeekDates,
  isOnCallLocation,
  sortDayEvents,
} from "@/lib/schedule-types";
import { getTodayDateString } from "@/lib/workout-types";
import { cn } from "@/lib/utils";

type ScheduleDaysViewProps = {
  weekStart: string;
  events: ScheduleEvent[];
};

function groupEventsByDate(weekDates: string[], events: ScheduleEvent[]) {
  const grouped = new Map<string, ScheduleEvent[]>();

  for (const date of weekDates) {
    grouped.set(date, []);
  }

  for (const event of events) {
    const dayEvents = grouped.get(event.eventDate) ?? [];
    dayEvents.push(event);
    grouped.set(event.eventDate, dayEvents);
  }

  return grouped;
}

function getDayNumber(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).getDate().toString();
}

function getDaySummary(events: ScheduleEvent[]) {
  const hasShift = events.some((event) => event.type === "shift");
  const hasOnCall = events.some(
    (event) => event.type === "shift" && isOnCallLocation(event.location),
  );
  const timeOffOnly =
    events.some((event) => event.type === "time_off") && !hasShift;

  if (hasOnCall) {
    return { label: "On call", tone: "amber" as const };
  }

  if (hasShift) {
    return { label: "Working", tone: "sky" as const };
  }

  if (timeOffOnly) {
    return { label: "Off", tone: "muted" as const };
  }

  return { label: "Open", tone: "muted" as const };
}

function WeekSummary({ events }: { events: ScheduleEvent[] }) {
  const shifts = events.filter((event) => event.type === "shift").length;
  const timeOff = events.filter((event) => event.type === "time_off").length;

  return (
    <div className="flex flex-wrap gap-2">
      <SummaryPill label={`${shifts} shift${shifts === 1 ? "" : "s"}`} tone="sky" />
      <SummaryPill
        label={`${timeOff} off block${timeOff === 1 ? "" : "s"}`}
        tone="muted"
      />
    </div>
  );
}

function SummaryPill({
  label,
  tone,
}: {
  label: string;
  tone: "sky" | "muted";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "sky" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function ScheduleDaysView({ weekStart, events }: ScheduleDaysViewProps) {
  const weekDates = getWeekDates(weekStart);
  const today = getTodayDateString();
  const grouped = groupEventsByDate(
    weekDates,
    events.filter((event) => weekDates.includes(event.eventDate)),
  );
  const hasEvents = events.length > 0;

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <CardTitle className="text-base">Weekly schedule</CardTitle>
        {hasEvents ? <WeekSummary events={events} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasEvents ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No schedule saved for this week yet.
          </p>
        ) : (
          weekDates.map((date) => {
            const dayEvents = sortDayEvents(grouped.get(date) ?? []);
            const isToday = date === today;
            const summary = getDaySummary(dayEvents);

            return (
              <article
                key={date}
                className={cn(
                  "flex gap-3 rounded-2xl border p-3 transition-colors",
                  isToday
                    ? "border-primary/35 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-muted/10",
                )}
              >
                <div className="flex w-[4.25rem] shrink-0 flex-col items-center border-r border-border/70 pr-3">
                  <span className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {getDayLabel(date)}
                  </span>
                  <span className="mt-0.5 text-2xl leading-none font-semibold tabular-nums">
                    {getDayNumber(date)}
                  </span>
                  <span className="mt-1 text-[0.65rem] text-muted-foreground">
                    {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </span>
                  {isToday ? (
                    <span className="mt-1.5 inline-flex h-5 w-full items-center justify-center rounded-full bg-primary px-1.5 text-[0.6rem] font-medium leading-none text-primary-foreground">
                      Today
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "mt-1.5 inline-flex h-5 w-full items-center justify-center rounded-full px-1.5 text-[0.6rem] font-medium leading-none",
                        summary.tone === "sky" &&
                          "bg-sky-500/15 text-sky-600 dark:text-sky-400",
                        summary.tone === "amber" &&
                          "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        summary.tone === "muted" &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {summary.label}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                  {dayEvents.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">No events</p>
                  ) : (
                    dayEvents.map((event) => (
                      <ScheduleEventBlock key={event.id} event={event} />
                    ))
                  )}
                </div>
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
