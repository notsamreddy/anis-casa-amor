import http from "node:http";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
const SECRET = process.env.CONVERTER_SECRET ?? "";
const YT_DLP = process.env.YT_DLP_PATH ?? "yt-dlp";

if (!SECRET) {
  console.error("Set CONVERTER_SECRET in converter-service/.env");
  process.exit(1);
}

function extractYouTubeVideoId(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isYouTubeHost =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com";

  if (!isYouTubeHost) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let videoId = null;

  if (host === "youtu.be") {
    videoId = segments[0] ?? null;
  } else if (segments[0] === "shorts" || segments[0] === "embed") {
    videoId = segments[1] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  }

  return videoId;
}

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function sanitizeFilename(title) {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  return cleaned || "audio";
}

function buildContentDisposition(filename) {
  const fallback = "audio.mp3";
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_") || fallback;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isAuthorized(request) {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token.length > 0 && token === SECRET;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(command, args, { windowsHide: true });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            `${command} is not installed or not on PATH. Install yt-dlp and ffmpeg.`,
          ),
        );
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function fetchVideoInfo(rawUrl) {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("That doesn't look like a valid YouTube link.");
  }

  const { stdout } = await runCommand(YT_DLP, [
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    rawUrl,
  ]);

  const info = JSON.parse(stdout);
  const title = String(info.title ?? "audio").trim() || "audio";

  return {
    videoId,
    title,
    durationLabel: formatDuration(Number(info.duration)),
    thumbnailUrl: info.thumbnail ?? null,
    filename: `${sanitizeFilename(title)}.mp3`,
  };
}

async function downloadMp3(rawUrl) {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("That doesn't look like a valid YouTube link.");
  }

  const workDir = await mkdtemp(join(tmpdir(), "converter-"));
  const outputTemplate = join(workDir, "audio.%(ext)s");

  try {
    const { stdout } = await runCommand(YT_DLP, [
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--output",
      outputTemplate,
      "--no-playlist",
      "--no-warnings",
      "--print",
      "%(title)s",
      "--print",
      "%(duration)s",
      "--print",
      "%(thumbnail)s",
      rawUrl,
    ]);

    const [titleLine = "audio", durationLine = "", thumbnailLine = ""] = stdout
      .trim()
      .split(/\r?\n/);
    const title = titleLine.trim() || "audio";

    const files = await readdir(workDir);
    const mp3File = files.find((file) => file.endsWith(".mp3"));
    if (!mp3File) {
      throw new Error("ffmpeg did not produce an MP3 file.");
    }

    return {
      filePath: join(workDir, mp3File),
      workDir,
      info: {
        videoId,
        title,
        durationLabel: formatDuration(Number(durationLine)),
        thumbnailUrl: thumbnailLine || null,
        filename: `${sanitizeFilename(title)}.mp3`,
      },
    };
  } catch (error) {
    await rm(workDir, { recursive: true, force: true });
    throw error;
  }
}

function parseServiceError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("valid YouTube link")) {
    return message;
  }

  if (message.includes("ffmpeg") || message.includes("yt-dlp")) {
    return message;
  }

  if (message.includes("Private video") || message.includes("unavailable")) {
    return "This video can't be downloaded — it may be private or unavailable.";
  }

  return "Couldn't download that video. Double-check the link and try again.";
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { message: "Unauthorized" });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
    return;
  }

  const rawUrl = String(body.url ?? "").trim();
  if (!rawUrl) {
    sendJson(response, 400, { message: "Paste a YouTube link first." });
    return;
  }

  try {
    if (request.url === "/info") {
      const info = await fetchVideoInfo(rawUrl);
      sendJson(response, 200, info);
      return;
    }

    if (request.url === "/download") {
      const download = await downloadMp3(rawUrl);

      const fileStream = createReadStream(download.filePath);
      response.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": buildContentDisposition(download.info.filename),
        "Cache-Control": "no-store",
      });

      fileStream.on("end", () => {
        void rm(download.workDir, { recursive: true, force: true });
      });

      fileStream.on("error", () => {
        void rm(download.workDir, { recursive: true, force: true });
      });

      fileStream.pipe(response);
      return;
    }

    sendJson(response, 404, { message: "Not found." });
  } catch (error) {
    sendJson(response, 422, { message: parseServiceError(error) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Converter service listening on http://0.0.0.0:${PORT}`);
});
