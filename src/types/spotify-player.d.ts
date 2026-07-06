declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    pause(): Promise<void>;
    resume(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getVolume(): Promise<number>;
    getCurrentState(): Promise<PlaybackState | null>;
    addListener(event: string, callback: (data: unknown) => void): void;
    removeListener(event: string, callback?: (data: unknown) => void): void;
  }

  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        uri: string;
        name: string;
        duration_ms: number;
      };
    };
  }

  interface PlayerInit {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
  }

  interface PlayerConstructor {
    new (options: PlayerInit): Player;
  }

  const Player: PlayerConstructor;
}

interface Window {
  Spotify?: typeof Spotify;
  onSpotifyWebPlaybackSDKReady?: () => void;
}
