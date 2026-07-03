"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  clearScheduleWeek,
  parseScheduleImage,
  saveScheduleWeek,
} from "@/actions/schedule";
import { ScheduleDaysView, ScheduleEventBlock } from "@/components/schedule-calendar";
import type { ScheduleEvent } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addDays,
  formatShortDate,
  getDayLabel,
  getWeekDates,
  getWeekMonday,
  parsedEventToInput,
  sortDayEvents,
  type ParsedScheduleEvent,
  type ScheduleEventInput,
} from "@/lib/schedule-types";

type ScheduleImporterProps = {
  weekStart: string;
  events: ScheduleEvent[];
};

type PreviewEvent = ScheduleEventInput & { key: string };

function toPreviewEvents(
  parsed: ParsedScheduleEvent[],
  weekStart: string,
): PreviewEvent[] {
  return parsed.map((event, index) => ({
    key: `${event.dayIndex}-${event.type}-${index}`,
    ...parsedEventToInput(event, weekStart),
  }));
}

export function ScheduleImporter({ weekStart, events }: ScheduleImporterProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PreviewEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const hasSavedEvents = events.length > 0;
  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${formatShortDate(weekStart)} – ${formatShortDate(end)}`;
  }, [weekStart]);

  const previewByDay = useMemo(() => {
    if (!preview) {
      return [];
    }

    const grouped = new Map<string, PreviewEvent[]>();
    for (const date of getWeekDates(weekStart)) {
      grouped.set(date, []);
    }

    for (const event of preview) {
      const dayEvents = grouped.get(event.eventDate) ?? [];
      dayEvents.push(event);
      grouped.set(event.eventDate, dayEvents);
    }

    return getWeekDates(weekStart)
      .map((date) => ({
        date,
        events: sortDayEvents(grouped.get(date) ?? []),
      }))
      .filter((day) => day.events.length > 0);
  }, [preview, weekStart]);

  function navigateToWeek(nextWeekStart: string) {
    setPreview(null);
    setError(null);
    router.push(`/schedule?week=${nextWeekStart}`);
  }

  function shiftWeek(direction: -1 | 1) {
    navigateToWeek(addDays(weekStart, direction * 7));
  }

  function handleAnalyze() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a screenshot first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("image", file);

      const result = await parseScheduleImage(formData);
      if (!result.ok) {
        setPreview(null);
        setError(result.message);
        return;
      }

      setPreview(toPreviewEvents(result.schedule.events, weekStart));
    });
  }

  function handleSave() {
    if (!preview || preview.length === 0) {
      return;
    }

    setError(null);
    startTransition(async () => {
      await saveScheduleWeek(
        weekStart,
        preview.map(({ key: _key, ...event }) => event),
      );
      setPreview(null);
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  function handleClearWeek() {
    setError(null);
    startTransition(async () => {
      await clearScheduleWeek(weekStart);
      setPreview(null);
    });
  }

  function removePreviewEvent(key: string) {
    setPreview((current) => current?.filter((event) => event.key !== key) ?? null);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Upload a weekly screenshot to fill in the calendar.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4" />
            Week of {weekLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftWeek(-1)}
              disabled={isPending}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Input
              type="date"
              value={weekStart}
              onChange={(event) => {
                if (!event.target.value) {
                  return;
                }

                navigateToWeek(
                  getWeekMonday(new Date(`${event.target.value}T12:00:00`)),
                );
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftWeek(1)}
              disabled={isPending}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-screenshot">Screenshot</Label>
            <Input
              id="schedule-screenshot"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectedFileName(file?.name ?? null);
                setPreview(null);
                setError(null);
              }}
            />
            {selectedFileName ? (
              <p className="text-xs text-muted-foreground">{selectedFileName}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={isPending}
            >
              {isPending && !preview ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageUp className="size-4" />
              )}
              Analyze screenshot
            </Button>

            {hasSavedEvents ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearWeek}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
                Clear week
              </Button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review before saving</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewByDay.map((day) => (
              <section
                key={day.date}
                className="overflow-hidden rounded-xl border border-border bg-muted/10"
              >
                <header className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-3 py-2.5">
                  <p className="font-semibold tracking-tight">
                    {getDayLabel(day.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(day.date)}
                  </p>
                </header>

                <div className="space-y-2 p-2.5">
                  {day.events.map((event) => (
                    <div key={event.key} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <ScheduleEventBlock event={event} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 shrink-0"
                        onClick={() => removePreviewEvent(event.key)}
                        disabled={isPending}
                        aria-label="Remove event"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <Button type="button" onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save to calendar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ScheduleDaysView weekStart={weekStart} events={events} />
    </div>
  );
}
