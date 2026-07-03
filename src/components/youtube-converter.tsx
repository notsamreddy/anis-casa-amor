"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ClipboardPaste, Loader2, Music2 } from "lucide-react";

import { previewYouTubeAudio } from "@/actions/converter";
import type { YouTubeAudioInfo } from "@/lib/converter-service";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = header.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? null;
}

export function YouTubeConverter() {
  const [preview, setPreview] = useState<YouTubeAudioInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const requestId = useRef(0);
  const isBusy = isDownloading || isPreviewPending;

  async function startDownload(trimmed: string, currentRequest: number) {
    setIsDownloading(true);
    setError(null);
    setPreview(null);

    startPreviewTransition(async () => {
      const result = await previewYouTubeAudio(trimmed);
      if (currentRequest !== requestId.current) {
        return;
      }

      if (result.ok) {
        setPreview(result.info);
      }
    });

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (currentRequest !== requestId.current) {
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Download failed.");
      }

      const blob = await response.blob();
      const filename =
        parseFilenameFromDisposition(response.headers.get("Content-Disposition")) ??
        preview?.filename ??
        "audio.mp3";
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      if (currentRequest !== requestId.current) {
        return;
      }

      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Couldn't download that video.";
      setError(message);
    } finally {
      if (currentRequest === requestId.current) {
        setIsDownloading(false);
      }
    }
  }

  async function handlePasteClick() {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        setError("Clipboard is empty.");
        return;
      }

      if (!extractYouTubeVideoId(trimmed)) {
        setError("Clipboard does not contain a valid YouTube link.");
        return;
      }

      setError(null);
      const currentRequest = ++requestId.current;
      void startDownload(trimmed, currentRequest);
    } catch {
      setError("Clipboard paste failed. Paste the link manually.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Music Downloader</h1>
        <p className="text-sm text-muted-foreground">
          Tap once to paste from clipboard and download instantly.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="size-4 text-rose-500" />
            Music Downloader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handlePasteClick}
            disabled={isBusy}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ClipboardPaste className="size-4" />
            )}
            Paste & Download
          </Button>

          {isBusy ? (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Loader2 className="size-5 animate-spin text-rose-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {preview?.title ?? "Preparing download..."}
                </p>
                <p className="text-xs text-muted-foreground">Downloading MP3</p>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <p className="text-center text-xs text-muted-foreground">
            Converts on your home PC via ffmpeg. Works with watch, shorts, and
            youtu.be links.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
