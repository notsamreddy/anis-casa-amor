"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Link2, Loader2, Music2 } from "lucide-react";

import { previewYouTubeVideo } from "@/actions/youtube-converter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      title: string;
      channel: string;
      durationLabel: string | null;
      thumbnailUrl: string;
    }
  | { status: "error"; message: string };

function triggerDownload(objectUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function YouTubeConverter() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const previewRequestRef = useRef(0);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedUrl = url.trim();
  const urlLooksValid = trimmedUrl.length > 0 && isValidYouTubeUrl(trimmedUrl);
  const canDownload = preview.status === "ready" && !isDownloading && !isPending;

  function schedulePreview(nextUrl: string) {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    const trimmed = nextUrl.trim();
    if (!trimmed) {
      previewRequestRef.current += 1;
      setPreview({ status: "idle" });
      return;
    }

    if (!isValidYouTubeUrl(trimmed)) {
      previewRequestRef.current += 1;
      setPreview({
        status: "error",
        message: "Paste a valid YouTube link (watch, youtu.be, or shorts).",
      });
      return;
    }

    const requestId = ++previewRequestRef.current;
    setPreview({ status: "loading" });

    previewTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await previewYouTubeVideo(trimmed);

        if (requestId !== previewRequestRef.current) {
          return;
        }

        if (!result.ok) {
          setPreview({ status: "error", message: result.message });
          return;
        }

        setPreview({
          status: "ready",
          title: result.info.title,
          channel: result.info.channel,
          durationLabel: result.info.durationLabel,
          thumbnailUrl: result.info.thumbnailUrl,
        });
      });
    }, 450);
  }

  function handleUrlChange(nextUrl: string) {
    setUrl(nextUrl);
    setDownloadError(null);
    schedulePreview(nextUrl);
  }

  async function handleDownload() {
    if (!canDownload) {
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);

    try {
      const response = await fetch(
        `/api/youtube-mp3?url=${encodeURIComponent(trimmedUrl)}`,
      );

      if (!response.ok) {
        let message = "Couldn't convert that video. Try again.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {
          // Keep the default message when the body isn't JSON.
        }

        setDownloadError(message);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "download.mp3";
      const objectUrl = URL.createObjectURL(blob);

      triggerDownload(objectUrl, filename);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setDownloadError("Download failed. Check your connection and try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">YouTube to MP3</h1>
        <p className="text-sm text-muted-foreground">
          Paste a YouTube link to grab the audio — handy for leaked tracks and
          uploads that aren&apos;t on streaming yet.
        </p>
      </section>

      <Card className="ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Music2 className="size-4 text-rose-500" />
            Convert a link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="youtube-url"
                value={url}
                onChange={(event) => handleUrlChange(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="pl-8"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          {preview.status === "loading" || isPending ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Looking up video details...
            </div>
          ) : null}

          {preview.status === "error" ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              {preview.message}
            </p>
          ) : null}

          {preview.status === "ready" ? (
            <div className="flex gap-3 rounded-lg border bg-muted/20 p-3">
              <img
                src={preview.thumbnailUrl}
                alt=""
                className="h-16 w-28 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium">{preview.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {preview.channel}
                  {preview.durationLabel ? ` · ${preview.durationLabel}` : null}
                </p>
              </div>
            </div>
          ) : null}

          {downloadError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              {downloadError}
            </p>
          ) : null}

          <Button
            type="button"
            className={cn(
              "w-full",
              canDownload && "bg-rose-600 hover:bg-rose-600/90",
            )}
            disabled={!canDownload}
            onClick={() => void handleDownload()}
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Download MP3
              </>
            )}
          </Button>

          {!urlLooksValid && trimmedUrl.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Waiting for a valid YouTube link.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
