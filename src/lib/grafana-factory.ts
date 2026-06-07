import type { GrafanaClient } from "./grafana/types";
import { LokiClient } from "./grafana/loki-client";
import { ElasticsearchClient } from "./grafana/elasticsearch-client";
import type { GrafanaDatasource } from "@/generated/prisma/client";

export function createGrafanaClient(datasource: GrafanaDatasource): GrafanaClient {
  switch (datasource.type) {
    case "LOKI":
      return new LokiClient(datasource);
    case "ELASTICSEARCH":
      return new ElasticsearchClient(datasource);
    default:
      throw new Error(`Unknown datasource type: ${datasource.type}`);
  }
}
