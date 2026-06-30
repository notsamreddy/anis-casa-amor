import type { CreateTypes } from "canvas-confetti";

const COLORS = [
  "#a78bfa",
  "#f97316",
  "#38bdf8",
  "#34d399",
  "#fb7185",
  "#fde047",
  "#ffffff",
];

let instance: CreateTypes | null = null;

async function getConfetti() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!instance) {
    const confetti = (await import("canvas-confetti")).default;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647";
    document.body.appendChild(canvas);
    instance = confetti.create(canvas, { resize: true, useWorker: false });
  }

  return instance;
}

function canAnimate() {
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Visible burst from the middle of the screen. */
export async function celebrateCheckoff() {
  if (!canAnimate()) {
    return;
  }

  const fire = await getConfetti();
  if (!fire) {
    return;
  }

  const base = {
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 2147483647,
    scalar: 1.4,
    gravity: 0.75,
    ticks: 250,
  };

  fire({
    ...base,
    particleCount: 140,
    spread: 100,
    startVelocity: 52,
    origin: { x: 0.5, y: 0.55 },
  });

  window.setTimeout(() => {
    fire({
      ...base,
      particleCount: 60,
      spread: 120,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.5 },
      scalar: 1.2,
    });
  }, 120);
}

/** Big celebration when the whole workout is finished. */
export async function celebrateWorkoutComplete() {
  if (!canAnimate()) {
    return;
  }

  const fire = await getConfetti();
  if (!fire) {
    return;
  }

  const base = {
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 2147483647,
    scalar: 1.5,
    gravity: 0.7,
    ticks: 300,
  };

  fire({
    ...base,
    particleCount: 200,
    spread: 120,
    startVelocity: 60,
    origin: { x: 0.5, y: 0.5 },
  });

  const cannon = (angle: number, x: number, delay: number) => {
    window.setTimeout(() => {
      fire({
        ...base,
        particleCount: 100,
        angle,
        spread: 70,
        startVelocity: 58,
        origin: { x, y: 0.65 },
      });
    }, delay);
  };

  cannon(60, 0, 150);
  cannon(120, 1, 150);
  cannon(90, 0.5, 300);
}
