# Converter service

Small Node server that converts YouTube links to MP3 with `yt-dlp` + `ffmpeg`.
Used by the main Next.js app via `CONVERTER_SERVICE_URL`.

## Local

```powershell
copy .env.example .env
# set CONVERTER_SECRET
npm start
```

## Railway

1. Create a new Railway project → **Deploy from GitHub**
2. Select this repo
3. Set **Root Directory** to `converter-service`
4. Railway will use the `Dockerfile` automatically
5. Add variable:
   - `CONVERTER_SECRET` = long random string (same as Vercel)
6. Generate a public domain in Railway Networking
7. In Vercel, set:
   - `CONVERTER_SERVICE_URL` = `https://your-service.up.railway.app`
   - `CONVERTER_SERVICE_SECRET` = same value as `CONVERTER_SECRET`

### Health check

```bash
curl https://your-service.up.railway.app/health
```

Should return `{"ok":true}`.
