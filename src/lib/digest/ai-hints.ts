const STATIC_HINTS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /connection refused|econnrefused|econnreset/i, hint: "Check if the downstream service is running and reachable. Verify network policies and firewall rules." },
  { pattern: /timeout|timed out|deadline exceeded/i, hint: "A timeout occurred. Check network latency, service response times, and consider increasing timeout thresholds." },
  { pattern: /out of memory|oom|heap|memory pressure/i, hint: "Memory pressure detected. Review heap size limits, memory leaks, and object allocation patterns." },
  { pattern: /null pointer|nullpointerexception|cannot read prop|typeerror|undefined is not/i, hint: "Null reference error. Verify that all required fields are populated and add defensive null checks at the call site." },
  { pattern: /database|db error|sql|query failed|deadlock/i, hint: "Database error. Check query correctness, connection pool health, and look for long-running transactions or deadlocks." },
  { pattern: /authentication|unauthorized|401|403|forbidden|invalid token|jwt/i, hint: "Authentication or authorization failure. Verify credentials, token expiry, and access control configuration." },
  { pattern: /certificate|ssl|tls|x509/i, hint: "TLS/certificate error. Check certificate validity, chain, and expiry dates." },
  { pattern: /disk|no space left|quota exceeded|i\/o error/i, hint: "Storage issue. Check disk space, I/O performance, and storage quotas." },
  { pattern: /rate limit|too many requests|429/i, hint: "Rate limit hit. Review request throttling configuration and consider implementing exponential backoff." },
  { pattern: /parse error|invalid json|unexpected token|syntax error/i, hint: "Parsing error. Verify the input data format matches the expected schema." },
];

export async function getAiHint(normalizedMsg: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      return await fetchClaudeHint(normalizedMsg, apiKey);
    } catch {
      // fall through to static hints
    }
  }
  return getStaticHint(normalizedMsg);
}

function getStaticHint(msg: string): string {
  for (const { pattern, hint } of STATIC_HINTS) {
    if (pattern.test(msg)) return hint;
  }
  return "Review the stack trace and correlate with recent deployments or configuration changes.";
}

async function fetchClaudeHint(msg: string, apiKey: string): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Given this application error message, provide a concise 1-2 sentence investigation hint:\n\n"${msg.slice(0, 500)}"\n\nHint:`,
        },
      ],
    }),
  });

  if (!resp.ok) throw new Error(`Claude API error: ${resp.status}`);
  const json = await resp.json() as { content: Array<{ text: string }> };
  return json.content[0]?.text?.trim() ?? getStaticHint(msg);
}
