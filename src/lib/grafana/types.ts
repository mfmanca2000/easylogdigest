export interface LogLine {
  timestamp: Date;
  message: string;
  labels: Record<string, string>;
  level?: string;
}

export interface GrafanaQueryParams {
  queryTemplate: string;
  appName: string;
  envName: string;
  from: Date;
  to: Date;
}

export interface GrafanaClient {
  queryLogs(params: GrafanaQueryParams): Promise<LogLine[]>;
}
