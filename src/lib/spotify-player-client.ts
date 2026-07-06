"use client";

import { getSpotifyClientToken, playSpotifyTrackOnDevice } from "@/actions/spotify";

type PlayerStateListener = (state: Spotify.PlaybackState | null) => void;
type PlayerErrorListener = (message: string) => void;

let playerInstance: Spotify.Player | null = null;
let playerPromise: Promise<Spotify.Player> | null = null;
let deviceId: string | null = null;
let deviceIdPromise: Promise<string> | null = null;
let playbackVolume = 0.8;
const stateListeners = new Set<PlayerStateListener>();
const errorListeners = new Set<PlayerErrorListener>();

function notifyState(state: Spotify.PlaybackState | null) {
  for (const listener of stateListeners) {
    listener(state);
  }
}

function notifyError(message: string) {
  for (const listener of errorListeners) {
    listener(message);
  }
}

function resetSpotifyPlayer() {
  if (playerInstance) {
    playerInstance.disconnect();
  }

  playerInstance = null;
  playerPromise = null;
  deviceId = null;
  deviceIdPromise = null;
}

function loadSpotifySdk() {
  return new Promise<typeof Spotify>((resolve, reject) => {
    if (window.Spotify?.Player) {
      resolve(window.Spotify);
      return;
    }

    const finish = () => {
      if (window.Spotify?.Player) {
        resolve(window.Spotify);
        return;
      }
      reject(new Error("Spotify Player SDK failed to initialize."));
    };

    window.onSpotifyWebPlaybackSDKReady = finish;

    const existing = document.querySelector(
      'script[src="https://sdk.scdn.co/spotify-player.js"]',
    );

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      script.onerror = () => {
        reject(new Error("Failed to load Spotify Player SDK."));
      };
      document.body.appendChild(script);
      return;
    }

    const startedAt = Date.now();
    const poll = window.setInterval(() => {
      if (window.Spotify?.Player) {
        window.clearInterval(poll);
        resolve(window.Spotify);
        return;
      }

      if (Date.now() - startedAt > 10_000) {
        window.clearInterval(poll);
        reject(new Error("Spotify Player SDK timed out."));
      }
    }, 100);
  });
}

function waitForDeviceId() {
  if (deviceId) {
    return Promise.resolve(deviceId);
  }

  if (!deviceIdPromise) {
    deviceIdPromise = new Promise<string>((resolve, reject) => {
      const startedAt = Date.now();
      const poll = window.setInterval(() => {
        if (deviceId) {
          window.clearInterval(poll);
          resolve(deviceId);
          return;
        }

        if (Date.now() - startedAt > 10_000) {
          window.clearInterval(poll);
          deviceIdPromise = null;
          reject(new Error("Spotify player did not become ready."));
        }
      }, 100);
    });
  }

  return deviceIdPromise;
}

export function subscribeToSpotifyPlayerState(listener: PlayerStateListener) {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function subscribeToSpotifyPlayerError(listener: PlayerErrorListener) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

export async function getSpotifyPlayer() {
  if (playerInstance) {
    return playerInstance;
  }

  if (!playerPromise) {
    playerPromise = (async () => {
      const Spotify = await loadSpotifySdk();
      const player = new Spotify.Player({
        name: "Casa Amor Web Player",
        getOAuthToken: (callback) => {
          void getSpotifyClientToken()
            .then((token) => {
              callback(token);
            })
            .catch(() => {
              resetSpotifyPlayer();
              notifyError("Spotify is not connected. Reconnect Spotify.");
            });
        },
        volume: playbackVolume,
      });

      player.addListener("ready", (data) => {
        deviceId = (data as { device_id: string }).device_id;
      });
      player.addListener("not_ready", () => {
        deviceId = null;
        deviceIdPromise = null;
      });
      player.addListener("initialization_error", (data) => {
        resetSpotifyPlayer();
        notifyError((data as { message: string }).message);
      });
      player.addListener("authentication_error", (data) => {
        resetSpotifyPlayer();
        const message = (data as { message: string }).message;
        notifyError(
          message.toLowerCase().includes("scope")
            ? "Playback permissions missing. Disconnect and reconnect Spotify."
            : message || "Spotify authentication failed. Reconnect Spotify.",
        );
      });
      player.addListener("account_error", () => {
        notifyError("Full playback needs Spotify Premium.");
      });
      player.addListener("playback_error", (data) => {
        const message = (data as { message: string }).message;
        if (message.toLowerCase().includes("no list was loaded")) {
          return;
        }
        notifyError(message);
      });
      player.addListener("player_state_changed", (state) => {
        notifyState(state as Spotify.PlaybackState | null);
      });

      const connected = await player.connect();
      if (!connected) {
        resetSpotifyPlayer();
        throw new Error("Could not connect Spotify player.");
      }

      playerInstance = player;
      return player;
    })().catch((error) => {
      playerPromise = null;
      throw error;
    });
  }

  return playerPromise;
}

export async function getSpotifyPlaybackState() {
  const player = await getSpotifyPlayer();
  return player.getCurrentState();
}

export async function playSpotifyTrack(uri: string) {
  await getSpotifyPlayer();
  const activeDeviceId = await waitForDeviceId();
  await playSpotifyTrackOnDevice(activeDeviceId, uri);
}

export async function toggleSpotifyPlayback() {
  const player = await getSpotifyPlayer();
  const state = await player.getCurrentState();
  if (!state) {
    return false;
  }

  if (state.paused) {
    await player.resume();
    return true;
  }

  await player.pause();
  return true;
}

export async function seekSpotifyPlayback(positionMs: number) {
  const player = await getSpotifyPlayer();
  const state = await player.getCurrentState();
  if (!state) {
    return;
  }

  await player.seek(positionMs);
}

export async function pauseSpotifyPlayback() {
  if (!playerInstance) {
    return;
  }

  const state = await playerInstance.getCurrentState();
  if (!state) {
    return;
  }

  await playerInstance.pause();
}

export function getSpotifyPlaybackVolume() {
  return playbackVolume;
}

export async function setSpotifyPlaybackVolume(volume: number) {
  const clamped = Math.min(1, Math.max(0, volume));
  playbackVolume = clamped;

  if (!playerInstance) {
    return;
  }

  await playerInstance.setVolume(clamped);
}
