import { createHmac, timingSafeEqual } from "crypto";

type OAuthStatePayload = {
  nonce: string;
  userId: string;
};

function getOAuthStateSecret() {
  const secret = process.env.SPOTIFY_CLIENT_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing secret for Spotify OAuth state signing.");
  }
  return secret;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getOAuthStateSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createSpotifyOAuthState(userId: string) {
  const payload: OAuthStatePayload = {
    nonce: crypto.randomUUID(),
    userId,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifySpotifyOAuthState(state: string) {
  const separator = state.lastIndexOf(".");
  if (separator === -1) {
    return null;
  }

  const encodedPayload = state.slice(0, separator);
  const signature = state.slice(separator + 1);
  const expectedSignature = signPayload(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as OAuthStatePayload;

    if (!payload.userId || !payload.nonce) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}
