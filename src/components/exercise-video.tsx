"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getYouTubeEmbed } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type ExerciseVideoProps = {
  url: string;
  name: string;
  chipClassName?: string;
};

const pillClasses =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 active:scale-[0.97]";

export function ExerciseVideo({ url, name, chipClassName }: ExerciseVideoProps) {
  const [open, setOpen] = useState(false);
  const embed = getYouTubeEmbed(url);

  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(pillClasses, chipClassName)}
      >
        <Play className="size-3 fill-current" />
        Watch demo
        <ExternalLink className="size-3" />
      </a>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(pillClasses, chipClassName)}
      >
        <Play className="size-3 fill-current" />
        Watch demo
      </button>

      <DialogContent
        className={cn("p-3", embed.isShort ? "max-w-xs" : "max-w-xl")}
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-sm">{name}</DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            "relative overflow-hidden rounded-lg bg-black",
            embed.isShort
              ? "mx-auto aspect-[9/16] w-full max-w-[17rem]"
              : "aspect-video w-full",
          )}
        >
          {open && (
            <iframe
              src={embed.embedUrl}
              title={name}
              loading="lazy"
              className="absolute inset-0 size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
