import { next } from "@vercel/functions";

import { readSessionCookie, verifySession } from "./api/_auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const isPublic =
    PUBLIC_PATHS.some(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}.`),
    ) || url.pathname.includes(".");

  if (isPublic) return next();

  try {
    if (await verifySession(readSessionCookie(request))) return next();
  } catch {
    // Missing or invalid deployment configuration behaves as signed out.
  }

  return Response.redirect(new URL("/login", request.url), 307);
}

export const config = {
  matcher: "/:path*",
  runtime: "nodejs",
};
