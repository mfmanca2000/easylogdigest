import type { GrafanaClient, GrafanaQueryParams, LogLine } from "./types";
import type { GrafanaDatasource } from "@/generated/prisma/client";

const PAGE_SIZE = 1000;

export class ElasticsearchClient implements GrafanaClient {
  constructor(private ds: GrafanaDatasource) {}

  async queryLogs({ appName, envName, from, to }: GrafanaQueryParams): Promise<LogLine[]> {
    const index = (this.ds.esIndex ?? "logs-*")
      .replace(/\{app\}/g, appName)
      .replace(/\{env\}/g, envName);

    const baseUrl = `${this.ds.baseUrl}/${index}/_search`;
    const headers = this.buildHeaders();
    const lines: LogLine[] = [];
    let searchAfter: unknown[] | undefined;

    while (true) {
      const body = this.buildQuery(appName, envName, from, to, searchAfter);
      const resp = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Elasticsearch query failed: ${resp.status} ${text}`);
      }

      const json = await resp.json() as ESResponse;
      const hits = json.hits?.hits ?? [];

      for (const hit of hits) {
        const src = hit._source;
        lines.push({
          timestamp: new Date(src["@timestamp"] ?? src.timestamp ?? Date.now()),
          message: src.message ?? src.msg ?? JSON.stringify(src),
          labels: { app: appName, env: envName, index: hit._index },
          level: src.level ?? src.severity,
        });
      }

      if (hits.length < PAGE_SIZE) break;
      searchAfter = hits[hits.length - 1].sort;
    }

    return lines;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.ds.apiKey) {
      headers["Authorization"] = `Bearer ${this.ds.apiKey}`;
    } else if (this.ds.esUsername && this.ds.esPassword) {
      const token = Buffer.from(`${this.ds.esUsername}:${this.ds.esPassword}`).toString("base64");
      headers["Authorization"] = `Basic ${token}`;
    }
    return headers;
  }

  private buildQuery(appName: string, envName: string, from: Date, to: Date, searchAfter?: unknown[]) {
    const query = {
      size: PAGE_SIZE,
      sort: [{ "@timestamp": "asc" }, { _id: "asc" }],
      query: {
        bool: {
          filter: [
            { range: { "@timestamp": { gte: from.toISOString(), lte: to.toISOString() } } },
            {
              bool: {
                should: [
                  { match: { level: "error" } },
                  { match: { level: "ERROR" } },
                  { match: { severity: "error" } },
                ],
                minimum_should_match: 1,
              },
            },
            ...(appName ? [{ term: { "app.keyword": appName } }] : []),
            ...(envName ? [{ term: { "env.keyword": envName } }] : []),
          ],
        },
      },
      ...(searchAfter ? { search_after: searchAfter } : {}),
    };
    return query;
  }
}

interface ESResponse {
  hits: {
    hits: Array<{
      _index: string;
      _source: Record<string, string>;
      sort: unknown[];
    }>;
  };
}
