import type { NextRequest } from "next/server";

/** Trùng destination trong next.config rewrites (backend thật) */
const UPSTREAM =
  process.env.API_UPSTREAM_ORIGIN?.replace(/\/$/, "") ||
  "http://localhost:5000";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function buildUpstreamUrl(pathSegments: string[], search: string): URL {
  const rest = pathSegments.length ? pathSegments.join("/") : "";
  const path = `${UPSTREAM}/chatbot/${rest}`;
  return new URL(path + search);
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const url = buildUpstreamUrl(pathSegments, req.nextUrl.search);
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  const method = req.method;
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  const res = await fetch(url, init);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}
