import * as XLSX from "xlsx";

export type ExportRow = Record<string, string | number | null>;

/**
 * Download data as CSV via browser Blob.
 */
export function downloadCsv(rows: ExportRow[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

/**
 * Download data as Excel (.xlsx) via browser Blob.
 * IMPORTANT: Use type: "buffer" — type: "array" is broken in xlsx 0.18.5 CE.
 */
export function downloadXlsx(rows: ExportRow[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

/**
 * Trigger a browser file download from a Blob.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
