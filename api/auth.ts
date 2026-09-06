import {
  authenticate,
  clearSessionCookie,
  readSessionCookie,
  sessionCookie,
  signSession,
  verifySession,
} from "./_auth";

function json(body: unknown, status = 200, cookie?: string) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request: Request) {
    const secure = new URL(request.url).protocol === "https:";

    try {
      if (request.method === "GET") {
        const user = await verifySession(readSessionCookie(request));
        return user ? json({ user }) : json({ error: "Unauthorized" }, 401);
      }

      if (request.method === "DELETE") {
        return json({ ok: true }, 200, clearSessionCookie(secure));
      }

      if (request.method === "POST") {
        const body = (await request.json()) as Record<string, unknown>;
        const username =
          typeof body.username === "string"
            ? body.username.trim().toLowerCase()
            : "";
        const password = typeof body.password === "string" ? body.password : "";
        const user = await authenticate(username, password);

        if (!user)
          return json({ error: "Incorrect username or password." }, 401);

        return json(
          { user },
          200,
          sessionCookie(await signSession(user), secure),
        );
      }

      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, POST, DELETE" },
      });
    } catch {
      return json({ error: "Authentication is temporarily unavailable." }, 500);
    }
  },
};
