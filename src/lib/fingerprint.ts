import { createHash } from "crypto";

export function normalizeMessage(raw: string): string {
  const normalized = raw
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
    // replace numbers with units (e.g. 16430ms, 512kb)
    .replace(/\b\d+(\.\d+)?(ms|us|ns|s|kb|mb|gb|tb|b)\b/gi, "<n>$2")
    // replace numeric path segments in URLs/routes (e.g. /orders/303)
    .replace(/\/\d+/g, "/<n>")
    // replace word-hyphen-number identifiers (e.g. thread-739, worker-12)
    .replace(/\b([a-z][a-z0-9_]*)-\d+\b/gi, "$1-<n>")
    // strip volatile location suffixes (e.g. "at position 787", "at line 42")
    .replace(/\s+(?:at\s+)?(?:position|line|col(?:umn)?|offset|index)\s+\d+\b/gi, "")
    // replace large numbers (IDs, timestamps as numbers)
    .replace(/\b\d{4,}\b/g, "<n>")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // if message is "context: ExceptionClass", keep only the exception class
  const exceptionMatch = normalized.match(/^.+:\s+([a-z][a-z0-9]*(?:exception|error|fault))$/);
  if (exceptionMatch) return exceptionMatch[1];

  return normalized;
}

export function fingerprintMessage(raw: string): { normalized: string; fingerprint: string } {
  const normalized = normalizeMessage(raw);
  const fingerprint = createHash("sha256").update(normalized).digest("hex");
  return { normalized, fingerprint };
}
