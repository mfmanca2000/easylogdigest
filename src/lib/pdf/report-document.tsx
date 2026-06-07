import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica", fontWeight: "normal" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937" },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#6b7280", marginBottom: 2 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 12, backgroundColor: "#f3f4f6", borderRadius: 6 },
  summaryLabel: { fontSize: 9, color: "#6b7280", marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  summaryNew: { color: "#dc2626" },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#111827", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 4 },
  table: { width: "100%", marginBottom: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", padding: "6 8", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableRow: { flexDirection: "row", padding: "6 8", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableRowAlt: { backgroundColor: "#f9fafb" },
  colCount: { width: "10%", textAlign: "right", fontWeight: "bold" },
  colStatus: { width: "10%", textAlign: "center" },
  colFirst: { width: "15%" },
  colMessage: { flex: 1, paddingRight: 8 },
  colHint: { width: "30%", color: "#6b7280", fontStyle: "italic" },
  newBadge: { color: "#dc2626", fontWeight: "bold" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#9ca3af" },
});

export interface ReportPdfData {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  appName: string;
  envName: string;
  errorCount: number;
  uniqueErrors: number;
  newErrors: number;
  entries: Array<{
    fingerprint: string;
    normalizedMsg: string;
    countInWindow: number;
    isNew: boolean;
    firstSeenAt: Date;
    aiHint: string | null;
  }>;
}

export function ReportDocument({ report }: { report: ReportPdfData }) {
  const sortedEntries = [...report.entries].sort((a, b) => b.countInWindow - a.countInWindow);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>EasyLogDigest — Daily Report</Text>
          <Text style={styles.subtitle}>
            {report.appName} / {report.envName}
          </Text>
          <Text style={styles.subtitle}>
            Report date: {format(report.reportDate, "MMMM d, yyyy")} · Generated:{" "}
            {format(report.generatedAt, "MMM d, yyyy HH:mm")} UTC
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total log lines</Text>
            <Text style={styles.summaryValue}>{report.errorCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Unique error types</Text>
            <Text style={styles.summaryValue}>{report.uniqueErrors}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>New errors</Text>
            <Text style={[styles.summaryValue, report.newErrors > 0 ? styles.summaryNew : {}]}>
              {report.newErrors}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Recurring errors</Text>
            <Text style={styles.summaryValue}>{report.uniqueErrors - report.newErrors}</Text>
          </View>
        </View>

        {/* Error table */}
        <Text style={styles.sectionTitle}>Error Details (sorted by frequency)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCount}>#</Text>
            <Text style={styles.colStatus}>Status</Text>
            <Text style={styles.colFirst}>First seen</Text>
            <Text style={styles.colMessage}>Error message</Text>
            <Text style={styles.colHint}>Investigation hint</Text>
          </View>
          {sortedEntries.map((entry, i) => (
            <View key={entry.fingerprint} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.colCount}>{entry.countInWindow}</Text>
              <Text style={[styles.colStatus, entry.isNew ? styles.newBadge : {}]}>
                {entry.isNew ? "NEW" : "old"}
              </Text>
              <Text style={styles.colFirst}>
                {format(entry.firstSeenAt, "MMM d")}
              </Text>
              <Text style={styles.colMessage}>{entry.normalizedMsg.slice(0, 200)}</Text>
              <Text style={styles.colHint}>{entry.aiHint?.slice(0, 150) ?? "—"}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `EasyLogDigest · ${report.appName}/${report.envName} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
