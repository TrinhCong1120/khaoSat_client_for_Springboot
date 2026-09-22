import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const publicDir = path.join(process.cwd(), "public", "failed-surveys");

const ensureFolder = () => {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
};

const formatFileName = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `failed_${datePart}_${Date.now()}.json`;
};

export async function GET(req: NextRequest) {
  ensureFolder();

  const fileName = req.nextUrl.searchParams.get("file");

  if (fileName) {
    const target = path.join(publicDir, fileName);
    if (!fs.existsSync(target)) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const text = fs.readFileSync(target, "utf8");
    return new Response(text, {
      headers: { "Content-Type": "application/json" },
    });
  }

  const files = fs.readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(publicDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        fileName: entry.name,
        fileSize: stat.size,
        lastModified: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  return Response.json(files);
}

export async function POST(req: NextRequest) {
  ensureFolder();

  try {
    const body = await req.json();
    const fileName = body?.fileName || formatFileName();
    const target = path.join(publicDir, fileName);
    const payload = JSON.stringify(body, null, 2);
    fs.writeFileSync(target, payload, "utf8");
    return Response.json({ ok: true, fileName });
  } catch (error) {
    console.error("Failed survey save error:", error);
    return Response.json({ error: "Unable to save failed survey" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  ensureFolder();

  const fileName = req.nextUrl.searchParams.get("file");
  if (fileName) {
    const target = path.join(publicDir, fileName);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    return Response.json({ ok: true });
  }

  const files = fs.readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  files.forEach((name) => fs.unlinkSync(path.join(publicDir, name)));

  return Response.json({ ok: true, deleted: files.length });
}
