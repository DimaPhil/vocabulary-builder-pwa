export const SESSION_COOKIE = "vocabulary_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 365;

export type AuthUser = {
  username: string;
  displayName: string;
};

type ConfiguredUser = AuthUser & {
  password: string;
};

type SessionPayload = AuthUser & {
  expiresAt: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64Url(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function signature(value: string) {
  const secret = process.env.VOCAB_AUTH_SECRET;

  if (!secret) {
    throw new Error("VOCAB_AUTH_SECRET is not configured.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encodeBase64Url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  );
}

function equal(left: string, right: string) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

export async function signSession(user: AuthUser, now = Date.now()) {
  const payload = encodeBase64Url(
    encoder.encode(
      JSON.stringify({
        ...user,
        expiresAt: Math.floor(now / 1000) + SESSION_SECONDS,
      } satisfies SessionPayload),
    ),
  );
  return `${payload}.${await signature(payload)}`;
}

export async function verifySession(token: string, now = Date.now()) {
  const [payload, suppliedSignature, extra] = token.split(".");

  if (
    !payload ||
    !suppliedSignature ||
    extra ||
    !equal(suppliedSignature, await signature(payload))
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      decoder.decode(decodeBase64Url(payload)),
    ) as Partial<SessionPayload>;
    return typeof session.username === "string" &&
      typeof session.displayName === "string" &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Math.floor(now / 1000)
      ? { username: session.username, displayName: session.displayName }
      : null;
  } catch {
    return null;
  }
}

export function readSessionCookie(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const value = cookies
    .split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.[1];
  return value ? decodeURIComponent(value) : "";
}

export function sessionCookie(token: string, secure = true) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure = true) {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function configuredUsers(): ConfiguredUser[] {
  const raw = process.env.VOCAB_USERS_JSON;

  if (!raw) {
    throw new Error("VOCAB_USERS_JSON is not configured.");
  }

  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) {
    throw new Error("VOCAB_USERS_JSON must be an array.");
  }

  return value.map((user) => {
    if (
      !user ||
      typeof user !== "object" ||
      !("username" in user) ||
      !("password" in user) ||
      !("displayName" in user) ||
      typeof user.username !== "string" ||
      typeof user.password !== "string" ||
      typeof user.displayName !== "string" ||
      !/^[a-z0-9_-]{1,32}$/.test(user.username)
    ) {
      throw new Error("VOCAB_USERS_JSON contains an invalid user.");
    }

    return {
      username: user.username,
      password: user.password,
      displayName: user.displayName,
    };
  });
}

export async function authenticate(username: string, password: string) {
  const user = configuredUsers().find(
    (candidate) => candidate.username === username,
  );
  const valid = equal(password, user?.password ?? "invalid-password");
  return valid && user
    ? { username: user.username, displayName: user.displayName }
    : null;
}
