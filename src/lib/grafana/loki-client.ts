import type { GrafanaClient, GrafanaQueryParams, LogLine } from "./types";
import type { GrafanaDatasource } from "@/generated/prisma/client";

const PAGE_LIMIT = 5000;

export class LokiClient implements GrafanaClient {
  constructor(private ds: GrafanaDatasource) {}

  async queryLogs({ queryTemplate, appName, envName, from, to }: GrafanaQueryParams): Promise<LogLine[]> {
    const query = queryTemplate
      .replace(/\{app\}/g, appName)
      .replace(/\{env\}/g, envName);

    const lines: LogLine[] = [];
    let start = from.getTime() * 1_000_000; // nanoseconds
    const end = to.getTime() * 1_000_000;

    while (true) {
      const url = new URL(`${this.ds.baseUrl}/loki/api/v1/query_range`);
      url.searchParams.set("query", query);
      url.searchParams.set("start", String(start));
      url.searchParams.set("end", String(end));
      url.searchParams.set("limit", String(PAGE_LIMIT));
      url.searchParams.set("direction", "forward");

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.ds.apiKey}`,
        "Content-Type": "application/json",
      };
      if (this.ds.lokiOrgId) headers["X-Scope-OrgID"] = this.ds.lokiOrgId;

      const resp = await fetch(url.toString(), { headers });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Loki query failed: ${resp.status} ${text}`);
      }

      const json = await resp.json() as LokiResponse;
      let count = 0;

      for (const stream of json.data.result) {
        for (const [ts, msg] of stream.values) {
          lines.push({
            timestamp: new Date(Number(ts) / 1_000_000),
            message: msg,
            labels: stream.stream,
            level: stream.stream.level,
          });
          count++;
          // advance cursor to max timestamp seen
          const tsNs = Number(ts);
          if (tsNs >= start) start = tsNs + 1;
        }
      }

      if (count < PAGE_LIMIT) break;
    }

    return lines;
  }
}

interface LokiResponse {
  data: {
    result: Array<{
      stream: Record<string, string>;
      values: Array<[string, string]>;
    }>;
  };
}
