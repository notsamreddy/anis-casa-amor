import type { MediaType } from "@/db/schema";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";
const TMDB_POSTER_LARGE = "https://image.tmdb.org/t/p/w342";

export type MediaSearchResult = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  mediaType: MediaType;
};

export type MediaDetails = {
  title: string;
  overview: string | null;
  year: string | null;
  runtime: string | null;
  rating: number | null;
  genres: string[];
  posterUrl: string | null;
  tagline: string | null;
  mediaType: MediaType;
};

type TmdbMovieResult = {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
};

type TmdbTvResult = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
};

type TmdbSearchResponse<T> = {
  results: T[];
};

function getApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is not set");
  }
  return key;
}

function posterUrl(path: string | null, size: "sm" | "lg" = "sm") {
  if (!path) {
    return null;
  }
  const base = size === "lg" ? TMDB_POSTER_LARGE : TMDB_IMAGE_BASE;
  return `${base}${path}`;
}

function formatMovieRuntime(minutes?: number | null) {
  if (!minutes) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTvRuntime(
  episodeRunTime?: number[],
  seasons?: number,
) {
  const runtime = episodeRunTime?.[0];
  const parts: string[] = [];
  if (seasons) {
    parts.push(`${seasons} season${seasons === 1 ? "" : "s"}`);
  }
  if (runtime) {
    parts.push(`${runtime}m per episode`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function yearFromDate(value?: string) {
  if (!value) {
    return null;
  }
  return value.slice(0, 4) || null;
}

export async function searchTmdb(
  query: string,
  mediaType: MediaType,
): Promise<MediaSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const endpoint =
    mediaType === "movie"
      ? `${TMDB_BASE}/search/movie`
      : `${TMDB_BASE}/search/tv`;

  const url = new URL(endpoint);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("query", trimmed);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error("Failed to search TMDB");
  }

  if (mediaType === "movie") {
    const data = (await response.json()) as TmdbSearchResponse<TmdbMovieResult>;
    return data.results.slice(0, 8).map((item) => ({
      tmdbId: item.id,
      title: item.title,
      year: yearFromDate(item.release_date),
      posterUrl: posterUrl(item.poster_path),
      mediaType: "movie",
    }));
  }

  const data = (await response.json()) as TmdbSearchResponse<TmdbTvResult>;
  return data.results.slice(0, 8).map((item) => ({
    tmdbId: item.id,
    title: item.name,
    year: yearFromDate(item.first_air_date),
    posterUrl: posterUrl(item.poster_path),
    mediaType: "series",
  }));
}

type TmdbGenre = { id: number; name: string };

type TmdbMovieDetails = {
  title: string;
  overview?: string;
  release_date?: string;
  runtime?: number | null;
  vote_average?: number;
  genres?: TmdbGenre[];
  poster_path: string | null;
  tagline?: string;
};

type TmdbTvDetails = {
  name: string;
  overview?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  vote_average?: number;
  genres?: TmdbGenre[];
  poster_path: string | null;
  tagline?: string;
};

export async function getTmdbDetails(
  tmdbId: number,
  mediaType: MediaType,
): Promise<MediaDetails> {
  const endpoint =
    mediaType === "movie"
      ? `${TMDB_BASE}/movie/${tmdbId}`
      : `${TMDB_BASE}/tv/${tmdbId}`;

  const url = new URL(endpoint);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", "en-US");

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) {
    throw new Error("Failed to fetch TMDB details");
  }

  if (mediaType === "movie") {
    const data = (await response.json()) as TmdbMovieDetails;
    return {
      title: data.title,
      overview: data.overview || null,
      year: yearFromDate(data.release_date),
      runtime: formatMovieRuntime(data.runtime),
      rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
      genres: data.genres?.map((genre) => genre.name) ?? [],
      posterUrl: posterUrl(data.poster_path, "lg"),
      tagline: data.tagline || null,
      mediaType: "movie",
    };
  }

  const data = (await response.json()) as TmdbTvDetails;
  return {
    title: data.name,
    overview: data.overview || null,
    year: yearFromDate(data.first_air_date),
    runtime: formatTvRuntime(data.episode_run_time, data.number_of_seasons),
    rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
    genres: data.genres?.map((genre) => genre.name) ?? [],
    posterUrl: posterUrl(data.poster_path, "lg"),
    tagline: data.tagline || null,
    mediaType: "series",
  };
}
