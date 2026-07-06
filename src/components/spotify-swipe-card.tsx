"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Heart, X } from "lucide-react";

import { SpotifySeekDial } from "@/components/spotify-seek-dial";
import type { SpotifyTrack } from "@/lib/spotify";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 100;

type SwipeCardProps = {
  track: SpotifyTrack;
  leftLabel: string;
  rightLabel: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
};

export function SwipeCard({
  track,
  leftLabel,
  rightLabel,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(
    null,
  );

  const resetCard = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  const completeSwipe = useCallback(
    (direction: "left" | "right") => {
      setExitDirection(direction);
      setTimeout(() => {
        if (direction === "left") {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
        setExitDirection(null);
        resetCard();
      }, 200);
    },
    [onSwipeLeft, onSwipeRight, resetCard],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || exitDirection) {
      return;
    }

    dragStart.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || disabled || exitDirection) {
      return;
    }

    const x = event.clientX - dragStart.current.x;
    const y = (event.clientY - dragStart.current.y) * 0.3;
    setOffset({ x, y });
  };

  const handlePointerUp = () => {
    if (!dragStart.current || disabled || exitDirection) {
      return;
    }

    if (offset.x > SWIPE_THRESHOLD) {
      completeSwipe("right");
      return;
    }

    if (offset.x < -SWIPE_THRESHOLD) {
      completeSwipe("left");
      return;
    }

    resetCard();
  };

  const rotation = offset.x * 0.05;
  const leftOpacity = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);
  const rightOpacity = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);

  const transform =
    exitDirection === "left"
      ? "translateX(-120%) rotate(-12deg)"
      : exitDirection === "right"
        ? "translateX(120%) rotate(12deg)"
        : `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`;

  return (
    <div className="relative mx-auto w-full max-w-sm space-y-4">
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetCard}
        className={cn(
          "touch-none select-none cursor-grab overflow-hidden rounded-2xl border border-border bg-card shadow-lg active:cursor-grabbing",
          isDragging ? "transition-none" : "transition-transform duration-200 ease-out",
          disabled && "pointer-events-none opacity-60",
        )}
        style={{ transform }}
      >
        <div className="relative aspect-square w-full bg-muted">
          {track.albumArtUrl ? (
            <Image
              src={track.albumArtUrl}
              alt={`${track.album} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 400px) 100vw, 400px"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-900 text-muted-foreground">
              No artwork
            </div>
          )}

          <div className="absolute inset-0 bg-black/60" />

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-2">
            <div
              className="flex flex-col items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-400 transition-opacity"
              style={{ opacity: leftOpacity }}
            >
              <X className="size-7" />
              <span className="text-xs font-medium">{leftLabel}</span>
            </div>
            <div
              className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-400 transition-opacity"
              style={{ opacity: rightOpacity }}
            >
              <Heart className="size-7" />
              <span className="text-xs font-medium">{rightLabel}</span>
            </div>
          </div>

          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <SpotifySeekDial
              overlay
              trackId={track.id}
              trackUri={track.uri}
              trackName={track.name}
              durationMs={track.durationMs}
              previewUrl={track.previewUrl}
              spotifyUrl={track.spotifyUrl}
            />
          </div>
        </div>

        <div className="space-y-1 p-4">
          <p className="line-clamp-2 text-lg font-semibold tracking-tight">
            {track.name}
          </p>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {track.artists}
          </p>
          <p className="line-clamp-1 text-xs text-muted-foreground/80">
            {track.album}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          disabled={disabled || Boolean(exitDirection)}
          onClick={() => completeSwipe("left")}
          className="flex size-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          aria-label={leftLabel}
        >
          <X className="size-6" />
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(exitDirection)}
          onClick={() => completeSwipe("right")}
          className="flex size-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          aria-label={rightLabel}
        >
          <Heart className="size-6" />
        </button>
      </div>
    </div>
  );
}
