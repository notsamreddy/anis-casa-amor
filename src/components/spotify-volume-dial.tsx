"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

const DIAL_SIZE = 72;
const DIAL_RADIUS = 28;
const DIAL_CENTER = DIAL_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

type SpotifyVolumeDialProps = {
  volume: number;
  onVolumeChange: (volume: number) => void;
  overlay?: boolean;
  disabled?: boolean;
};

function getProgressFromPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const angle = Math.atan2(clientY - centerY, clientX - centerX);
  let progress = (angle + Math.PI / 2) / (2 * Math.PI);
  if (progress < 0) {
    progress += 1;
  }
  return Math.min(1, Math.max(0, progress));
}

function getKnobPosition(progress: number) {
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  return {
    x: DIAL_CENTER + DIAL_RADIUS * Math.cos(angle),
    y: DIAL_CENTER + DIAL_RADIUS * Math.sin(angle),
  };
}

export function SpotifyVolumeDial({
  volume,
  onVolumeChange,
  overlay = false,
  disabled = false,
}: SpotifyVolumeDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVolume, setDragVolume] = useState(volume);

  const displayedVolume = isDragging ? dragVolume : volume;
  const knob = getKnobPosition(displayedVolume);
  const messageClass = overlay ? "text-white/70" : "text-muted-foreground";

  const applyVolume = (nextVolume: number) => {
    const clamped = Math.min(1, Math.max(0, nextVolume));
    setDragVolume(clamped);
    onVolumeChange(clamped);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !dialRef.current) {
      return;
    }

    event.stopPropagation();
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    applyVolume(
      getProgressFromPointer(
        event.clientX,
        event.clientY,
        dialRef.current.getBoundingClientRect(),
      ),
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dialRef.current) {
      return;
    }

    event.stopPropagation();
    applyVolume(
      getProgressFromPointer(
        event.clientX,
        event.clientY,
        dialRef.current.getBoundingClientRect(),
      ),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    event.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={dialRef}
        className={cn(
          "relative touch-none select-none",
          disabled && "opacity-50",
        )}
        style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Volume"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayedVolume * 100)}
      >
        <svg
          width={DIAL_SIZE}
          height={DIAL_SIZE}
          className="absolute inset-0"
          aria-hidden
        >
          {Array.from({ length: 16 }).map((_, index) => {
            const tickProgress = index / 16;
            const tickAngle = tickProgress * 2 * Math.PI - Math.PI / 2;
            const inner = DIAL_RADIUS - 5;
            const outer = DIAL_RADIUS - 1;
            const x1 = DIAL_CENTER + inner * Math.cos(tickAngle);
            const y1 = DIAL_CENTER + inner * Math.sin(tickAngle);
            const x2 = DIAL_CENTER + outer * Math.cos(tickAngle);
            const y2 = DIAL_CENTER + outer * Math.sin(tickAngle);

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={cn(
                  overlay ? "stroke-white/25" : "stroke-border",
                  tickProgress <= displayedVolume &&
                    (overlay ? "stroke-sky-300" : "stroke-sky-500/70"),
                )}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          <circle
            cx={DIAL_CENTER}
            cy={DIAL_CENTER}
            r={DIAL_RADIUS}
            fill="none"
            className={overlay ? "stroke-white/20" : "stroke-muted"}
            strokeWidth="5"
            strokeOpacity={overlay ? 1 : 0.35}
          />
          <circle
            cx={DIAL_CENTER}
            cy={DIAL_CENTER}
            r={DIAL_RADIUS}
            fill="none"
            className={overlay ? "stroke-sky-400" : "stroke-sky-500"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - displayedVolume)}
            transform={`rotate(-90 ${DIAL_CENTER} ${DIAL_CENTER})`}
          />
          <circle
            cx={knob.x}
            cy={knob.y}
            r="6"
            className={cn(
              overlay
                ? "fill-sky-300 stroke-white/80 stroke-2"
                : "fill-sky-400 stroke-background stroke-2",
            )}
          />
        </svg>

        <div
          className={cn(
            "pointer-events-none absolute inset-0 m-auto flex size-8 items-center justify-center rounded-full",
            overlay
              ? "bg-black/35 text-white"
              : "bg-background/90 text-sky-500",
          )}
        >
          {displayedVolume <= 0.01 ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </div>
      </div>

      <span className={cn("text-[10px] tabular-nums", messageClass)}>
        {Math.round(displayedVolume * 100)}%
      </span>
    </div>
  );
}
