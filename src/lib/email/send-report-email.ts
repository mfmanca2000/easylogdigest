import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { generateReportPdf } from "@/lib/pdf/generate-pdf";
import type { ReportPdfData } from "@/lib/pdf/report-document";
import { format } from "date-fns";

export async function sendReportEmails(reports: ReportPdfData[]): Promise<void> {
  const emailConfig = await prisma.emailConfig.findFirst();
  if (!emailConfig) return;

  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: { user: emailConfig.user, pass: emailConfig.password },
  });

  const recipients = emailConfig.recipients.split(",").map((s: string) => s.trim()).filter(Boolean);
  if (recipients.length === 0) return;

  for (const report of reports) {
    try {
      const pdfBuffer = await generateReportPdf(report);
      const dateStr = format(report.reportDate, "yyyy-MM-dd");
      const filename = `report-${report.appName}-${report.envName}-${dateStr}.pdf`;

      await transporter.sendMail({
        from: emailConfig.fromAddress,
        to: recipients,
        subject: `[EasyLogDigest] ${report.appName}/${report.envName} — ${dateStr} (${report.newErrors} new, ${report.uniqueErrors} total)`,
        html: buildEmailHtml(report),
        attachments: [{ filename, content: pdfBuffer }],
      });

      await prisma.dailyReport.updateMany({
        where: { id: report.id },
        data: { emailSentAt: new Date() },
      });
    } catch (err) {
      console.error(`[EasyLogDigest] Email failed for ${report.appName}/${report.envName}:`, err);
    }
  }
}

function buildEmailHtml(report: ReportPdfData): string {
  const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111827;">EasyLogDigest Daily Report</h2>
      <p style="color: #6b7280;">${report.appName} / ${report.envName} — ${format(report.reportDate, "MMMM d, yyyy")}</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #6b7280;">Total errors</td>
          <td style="padding: 8px 12px; font-size: 20px; font-weight: bold;">${report.errorCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #6b7280;">Unique error types</td>
          <td style="padding: 8px 12px; font-size: 20px; font-weight: bold;">${report.uniqueErrors}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #6b7280;">New errors</td>
          <td style="padding: 8px 12px; font-size: 20px; font-weight: bold; color: ${report.newErrors > 0 ? "#dc2626" : "#111827"};">${report.newErrors}</td>
        </tr>
      </table>
      <p>
        <a href="${appUrl}/reports" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
          View full report online
        </a>
      </p>
      <p style="color: #9ca3af; font-size: 12px;">The full PDF report is attached to this email.</p>
    </div>
  `;
}
