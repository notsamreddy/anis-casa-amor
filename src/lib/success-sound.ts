let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) {
      return null;
    }

    audioContext = new AudioCtx();
  }

  return audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 0.1,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

function playSequence(notes: Array<{ freq: number; at: number; len: number }>) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  void ctx.resume().then(() => {
    const start = ctx.currentTime;
    for (const note of notes) {
      playTone(ctx, note.freq, start + note.at, note.len);
    }
  });
}

export function playExerciseCompleteSound() {
  playSequence([{ freq: 659.25, at: 0, len: 0.1 }]);
}

/** Softer chime when the whole workout is done. */
export function playWorkoutCompleteSound() {
  playSequence([
    { freq: 523.25, at: 0, len: 0.1 },
    { freq: 659.25, at: 0.12, len: 0.16 },
  ]);
}
