function escapeCell(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Build CSV from rows (first row = headers) and trigger download in the browser. */
export function downloadCsv(filename: string, rows: string[][]): void {
  const lines = rows.map((row) => row.map((c) => escapeCell(String(c ?? ""))).join(","));
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
