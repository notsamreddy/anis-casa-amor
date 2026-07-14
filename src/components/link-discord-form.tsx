"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LinkDiscordForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/link-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Could not link Discord.");
        return;
      }

      setMessage("Linked! You can go back to Discord and use /gym, /movie add, and more.");
      setCode("");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="link-code" className="text-sm font-medium">
          Link code
        </label>
        <Input
          id="link-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC123"
          autoComplete="off"
          maxLength={6}
          className="font-mono uppercase tracking-widest"
        />
        <p className="text-sm text-muted-foreground">
          Run <span className="font-mono">/link</span> in Discord to get a code. It expires in 15 minutes.
        </p>
      </div>

      <Button type="submit" disabled={loading || code.trim().length < 4}>
        {loading ? "Linking…" : "Link Discord"}
      </Button>

      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </form>
  );
}
