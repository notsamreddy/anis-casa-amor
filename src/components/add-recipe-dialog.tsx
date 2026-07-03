"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { createRecipeVideo, lookupRecipeVideo } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractYouTubeVideoId } from "@/lib/youtube";

type AddRecipeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddRecipeDialog({ open, onOpenChange }: AddRecipeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isLookingUp, startLookup] = useTransition();
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setVideoUrl("");
      setTitle("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  function handleUrlChange(value: string) {
    setVideoUrl(value);
    setError(null);
  }

  function handleLookup() {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      return;
    }

    startLookup(async () => {
      const result = await lookupRecipeVideo(trimmed);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (result.title) {
        setTitle(result.title);
      }
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!extractYouTubeVideoId(videoUrl.trim())) {
      setError("Paste a valid YouTube or YouTube Shorts link");
      return;
    }

    startTransition(async () => {
      try {
        await createRecipeVideo({
          title: title.trim(),
          videoUrl: videoUrl.trim(),
          notes: notes.trim() || null,
        });
        onOpenChange(false);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not save recipe",
        );
      }
    });
  }

  const canLookup = videoUrl.trim().length > 0 && !isLookingUp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>Add recipe video</DialogTitle>
          <DialogDescription>
            Paste a YouTube Shorts link to save it to your collection
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-url">YouTube link</Label>
            <div className="flex gap-2">
              <Input
                id="recipe-url"
                type="url"
                placeholder="https://youtube.com/shorts/..."
                value={videoUrl}
                onChange={(event) => handleUrlChange(event.target.value)}
                onBlur={handleLookup}
                disabled={isPending}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!canLookup}
                onClick={handleLookup}
              >
                {isLookingUp ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-title">Title</Label>
            <Input
              id="recipe-title"
              placeholder="Recipe name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-notes">Notes (optional)</Label>
            <Textarea
              id="recipe-notes"
              placeholder="Ingredients, tags, or anything to remember"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-4 -mx-4 -mb-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !videoUrl.trim()}>
              {isPending ? "Saving..." : "Save recipe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
