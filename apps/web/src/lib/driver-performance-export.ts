import type { AssignedVehicleSummary, User } from "@smart-dispatch/types";
import type { jsPDF } from "jspdf";
import type { AdminDriversMessages } from "@/translations/types";
import { formatMessage } from "@/translations";

const BRAND: [number, number, number] = [28, 58, 52];
const GOLD: [number, number, number] = [201, 184, 122];
const MUTED: [number, number, number] = [100, 116, 139];
const MARGIN = 36;

type PerformanceExportCopy = AdminDriversMessages["performance"]["export"];

type DriverPerformanceExportInput = {
  users: User[];
  title: string;
  copy: PerformanceExportCopy;
  statusLabels: AdminDriversMessages["status"];
  assignmentLabels: AdminDriversMessages["assignment"];
  unratedLabel: string;
  generatedAt: string;
};

function formatDriverName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

function formatAssignedVehicle(vehicle: AssignedVehicleSummary | null | undefined) {
  if (!vehicle) return null;
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name ? `${vehicle.plate_number} · ${name}` : vehicle.plate_number;
}

function formatPercent(rate: number | null | undefined) {
  if (rate == null || Number.isNaN(rate)) return null;
  return `${Math.round(rate * 100)}%`;
}

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function slugifyFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "driver-performance"
  );
}

function fileStamp() {
  return new Date().toISOString().slice(0, 10);
}

function formatRating(user: User, unratedLabel: string) {
  const rating = user.driver?.rating;
  if (!rating || rating.count === 0 || rating.average == null) {
    return unratedLabel;
  }

  return `${rating.average.toFixed(1)} (${rating.count})`;
}

function buildTable(input: DriverPerformanceExportInput) {
  const columns = input.copy.columns;
  const head = [
    columns.name,
    columns.email,
    columns.mobile,
    columns.rating,
    columns.completed,
    columns.completionRate,
    columns.noShows,
    columns.onTime,
    columns.complaints,
    columns.attendance,
    columns.vehicle,
    columns.status,
  ];

  const rows = input.users.map((user) => {
    const performance = user.driver?.performance;
    return [
      formatDriverName(user),
      user.email,
      user.mobile_number,
      formatRating(user, input.unratedLabel),
      performance?.trips_completed ?? 0,
      dash(formatPercent(performance?.completion_rate)),
      performance?.trips_no_show ?? 0,
      dash(formatPercent(performance?.on_time_rate)),
      performance?.complaints ?? 0,
      dash(formatPercent(performance?.attendance_rate)),
      formatAssignedVehicle(user.assigned_vehicle) ?? input.assignmentLabels.unassigned,
      input.statusLabels[user.account_status],
    ];
  });

  return { head, rows };
}

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setStroke(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export async function exportDriverPerformanceExcel(input: DriverPerformanceExportInput) {
  const table = buildTable(input);
  if (table.rows.length === 0) {
    throw new Error(input.copy.empty);
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([table.head, ...table.rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Performance");
  XLSX.writeFile(workbook, `${slugifyFileName(input.title)}_${fileStamp()}.xlsx`);
}

export async function exportDriverPerformancePdf(input: DriverPerformanceExportInput) {
  const table = buildTable(input);
  if (table.rows.length === 0) {
    throw new Error(input.copy.empty);
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  setFill(doc, BRAND);
  doc.rect(0, 0, pageW, 72, "F");
  setFill(doc, GOLD);
  doc.rect(0, 72, pageW, 4, "F");

  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(input.title, MARGIN, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, [210, 224, 220]);
  doc.text(formatMessage(input.copy.generatedOn, { date: input.generatedAt }), MARGIN, 56);

  autoTable(doc, {
    startY: 92,
    head: [table.head],
    body: table.rows.map((row) => row.map((cell) => String(cell))),
    margin: { left: MARGIN, right: MARGIN, bottom: 40 },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setStroke(doc, [226, 232, 240]);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, pageH - 28, pageW - MARGIN, pageH - 28);
    setText(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(input.copy.footerBrand, MARGIN, pageH - 14);
    doc.text(
      formatMessage(input.copy.pageLabel, { page, pages: pageCount }),
      pageW - MARGIN,
      pageH - 14,
      { align: "right" },
    );
  }

  doc.save(`${slugifyFileName(input.title)}_${fileStamp()}.pdf`);
}
