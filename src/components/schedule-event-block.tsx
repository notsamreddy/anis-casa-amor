import { CalendarOff, MapPin, Phone } from "lucide-react";

import type { ScheduleEvent } from "@/db/schema";
import {
  formatEventTimeRange,
  isOnCallLocation,
  normalizeScheduleLocation,
} from "@/lib/schedule-types";
import { cn } from "@/lib/utils";

export type ScheduleEventBlockProps = {
  event: Pick<
    ScheduleEvent,
    "type" | "startTime" | "endTime" | "location" | "allDay"
  >;
};

export function ScheduleEventBlock({ event }: ScheduleEventBlockProps) {
  const isTimeOff = event.type === "time_off";
  const isOnCall = !isTimeOff && isOnCallLocation(event.location);
  const timeLabel = formatEventTimeRange(
    event.startTime,
    event.endTime,
    event.allDay,
  );
  const location = normalizeScheduleLocation(event.location);

  const Icon = isTimeOff ? CalendarOff : isOnCall ? Phone : MapPin;

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-xl border text-sm shadow-sm",
        isTimeOff
          ? "border-border/80 bg-muted/40"
          : isOnCall
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "w-1 shrink-0",
          isTimeOff && "bg-muted-foreground/25",
          isOnCall && "bg-amber-500",
          !isTimeOff && !isOnCall && "bg-sky-500",
        )}
      />

      <div
        className={cn(
          "min-w-0 flex-1 px-3 py-2.5",
          isTimeOff &&
            "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(255,255,255,0.03)_5px,rgba(255,255,255,0.03)_10px)]",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isTimeOff && "text-muted-foreground",
                isOnCall && "text-amber-600 dark:text-amber-400",
                !isTimeOff && !isOnCall && "text-sky-600 dark:text-sky-400",
              )}
            />
            <p className="font-medium leading-snug">
              {isTimeOff ? "Time off" : isOnCall ? "On call" : timeLabel || "Shift"}
            </p>
          </div>
          <EventTypePill isTimeOff={isTimeOff} isOnCall={isOnCall} />
        </div>

        {isTimeOff ? (
          <p className="mt-1 pl-6 text-xs text-muted-foreground">All day</p>
        ) : null}

        {!isTimeOff && isOnCall && timeLabel ? (
          <p className="mt-1 pl-6 text-xs text-muted-foreground">{timeLabel}</p>
        ) : null}

        {!isTimeOff && !isOnCall && location ? (
          <p className="mt-1 pl-6 text-xs text-muted-foreground">{location}</p>
        ) : null}
      </div>
    </div>
  );
}

const eventPillClass =
  "inline-flex h-5 shrink-0 items-center justify-center rounded-full px-2.5 text-[0.65rem] font-medium leading-none";

function EventTypePill({
  isTimeOff,
  isOnCall,
}: {
  isTimeOff: boolean;
  isOnCall: boolean;
}) {
  if (isTimeOff) {
    return (
      <span
        className={cn(
          eventPillClass,
          "bg-muted text-muted-foreground",
        )}
      >
        Off
      </span>
    );
  }

  if (isOnCall) {
    return (
      <span
        className={cn(
          eventPillClass,
          "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        )}
      >
        On call
      </span>
    );
  }

  return (
    <span
      className={cn(
        eventPillClass,
        "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      )}
    >
      Shift
    </span>
  );
}
