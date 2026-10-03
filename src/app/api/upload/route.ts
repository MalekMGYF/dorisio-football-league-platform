import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, jsonError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Image upload endpoint.
 * Validates MIME type and size server-side before accepting anything, and only
 * authenticated users may upload. Files are stored as data URLs on the record
 * they belong to; swap `store()` for S3/Firebase Storage in production (SETUP.md).
 */
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg+xml"],
]);
const MAX_BYTES = 1.2 * 1024 * 1024;

function sniffIsImage(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  const png = [0x89, 0x50, 0x4e, 0x47];
  const jpg = [0xff, 0xd8, 0xff];
  const webp = [0x52, 0x49, 0x46, 0x46];
  const svg = Buffer.from("<svg", "utf8");
  const head = buffer.subarray(0, 4);
  if (png.every((byte, index) => head[index] === byte)) return true;
  if (jpg.every((byte, index) => head[index] === byte)) return true;
  if (webp.every((byte, index) => head[index] === byte)) return true;
  return buffer.subarray(0, 512).includes(svg);
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const body = await readJson<{ contentType?: unknown; data?: unknown; name?: unknown }>(request);

    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    if (!ALLOWED.has(contentType)) {
      throw new ApiError(
        "نوع الملف غير مدعوم. الأنواع المسموحة: JPG، PNG، WEBP، SVG.",
        "invalid_file_type",
      );
    }
    if (typeof body.data !== "string" || !body.data.includes(",")) {
      throw new ApiError("ملف الصورة غير صالح.", "invalid_file");
    }

    const base64 = body.data.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) {
      throw new ApiError("ملف الصورة فارغ.", "invalid_file");
    }
    if (buffer.length > MAX_BYTES) {
      throw new ApiError("حجم الصورة يتجاوز الحد المسموح (1.2MB).", "file_too_large");
    }
    if (!sniffIsImage(buffer)) {
      throw new ApiError("الملف ليس صورة صالحة.", "invalid_file");
    }

    const dataUrl = `data:${contentType};base64,${base64}`;
    return ok({ ok: true, url: dataUrl, size: buffer.length });
  } catch (error) {
    return jsonError(error);
  }
}
