// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic bytes (file signatures) keyed by MIME type.
// A file claiming to be image/jpeg but without FF D8 FF at the start is spoofed.
const MAGIC_BYTES: Record<string, readonly number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png":  [0x89, 0x50, 0x4e, 0x47],
  "image/gif":  [0x47, 0x49, 0x46, 0x38],
  // WebP: bytes 0-3 are "RIFF", bytes 8-11 are "WEBP"
  // We check the RIFF header only (4 bytes) as a practical heuristic.
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type UploadValidation =
  | { valid: true }
  | { valid: false; error: string };

// ─── Validators ──────────────────────────────────────────────────────────────

/**
 * Validates a File's metadata (MIME type, extension, size, filename safety).
 * Does NOT read the file buffer — use `validateFileBytes` for deep validation.
 *
 * Suitable for use at the HTTP layer before processing the file.
 */
export function validateFileUpload(file: File): UploadValidation {
  // Reject MIME types not on the allow-list
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Accepted: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
    };
  }

  // Reject extensions not on the allow-list
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension "${ext}" is not allowed.` };
  }

  // Reject oversized files
  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the ${MAX_SIZE_BYTES / 1024 / 1024} MB limit.`,
    };
  }

  // Reject filenames that could be used for path traversal
  if (/[./\\]/.test(file.name.slice(0, -ext.length)) || file.name.includes("..")) {
    return { valid: false, error: "File name contains invalid characters." };
  }

  return { valid: true };
}

/**
 * Extends `validateFileUpload` with magic-byte verification.
 * Reads the first few bytes of the file buffer to confirm the content matches
 * the declared MIME type, preventing MIME-spoofing attacks.
 *
 * Call this in upload handlers after basic metadata validation passes.
 */
export async function validateFileBytes(file: File): Promise<UploadValidation> {
  const meta = validateFileUpload(file);
  if (!meta.valid) return meta;

  const expected = MAGIC_BYTES[file.type];
  if (!expected) return { valid: true }; // no signature defined → skip deep check

  const buffer = await file.arrayBuffer();
  const bytes  = new Uint8Array(buffer, 0, expected.length);
  const matches = expected.every((byte, i) => bytes[i] === byte);

  if (!matches) {
    return {
      valid: false,
      error: "File content does not match its declared type. Upload rejected.",
    };
  }

  return { valid: true };
}
