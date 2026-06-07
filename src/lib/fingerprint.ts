import { createHash } from "crypto";

export function normalizeMessage(raw: string): string {
  return raw
    .trim()
    // strip ISO timestamps
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/g, "")
    // strip log-level prefixes
    .replace(/\b(ERROR|WARN|WARNING|INFO|DEBUG|FATAL|TRACE|error|warn|warning|info|debug|fatal|trace)\b:?\s*/g, "")
    // strip [LEVEL] prefixes
    .replace(/\[(ERROR|WARN|WARNING|INFO|DEBUG|FATAL|TRACE)\]\s*/gi, "")
    // replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    // replace IPv6
    .replace(/([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}/gi, "<ipv6>")
    // replace IPv4
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, "<ip>")
    // replace hex strings >= 16 chars (memory addresses, hashes)
    .replace(/\b0x[0-9a-f]{4,}\b/gi, "<hex>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    // replace large numbers (IDs, timestamps as numbers)
    .replace(/\b\d{4,}\b/g, "<n>")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function fingerprintMessage(raw: string): { normalized: string; fingerprint: string } {
  const normalized = normalizeMessage(raw);
  const fingerprint = createHash("sha256").update(normalized).digest("hex");
  return { normalized, fingerprint };
}
