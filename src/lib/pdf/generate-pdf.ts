// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ReportDocument, type ReportPdfData } from "./report-document";

export async function generateReportPdf(report: ReportPdfData): Promise<Buffer> {
  // renderToBuffer accepts any React element at runtime; cast to satisfy its strict generic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(ReportDocument, { report }) as any);
  return Buffer.from(buffer);
}
