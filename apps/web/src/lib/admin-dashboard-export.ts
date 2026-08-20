import type {
  AdminDashboardAnalytics,
  AdminRideRequest,
  InvoiceStatus,
  RideRequestStatus,
  VehicleComplianceStatus,
  VehicleFuelLog,
  VehicleStatus,
} from "@smart-dispatch/types";
import type { jsPDF } from "jspdf";
import type { AdminDashboardMessages } from "@/translations/types";

export type DashboardExportAccess = {
  canReadRideRequests: boolean;
  canReadVehicles: boolean;
  canViewCompliance: boolean;
  canReadInvoices: boolean;
  canViewRegistrations: boolean;
};

export type DashboardExportInput = {
  analytics: AdminDashboardAnalytics;
  fromDate: string;
  toDate: string;
  copy: AdminDashboardMessages;
  access: DashboardExportAccess;
  rideRequests?: AdminRideRequest[];
  fuelLogs?: VehicleFuelLog[];
};

type SheetTable = {
  name: string;
  title: string;
  head: string[];
  rows: Array<Array<string | number>>;
};

type KpiCard = {
  label: string;
  value: string;
  hint?: string;
  accent: [number, number, number];
};

const BRAND: [number, number, number] = [28, 58, 52];
const GOLD: [number, number, number] = [201, 184, 122];
const SLATE: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [148, 163, 184];
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 36;

function safeSheetName(name: string, used: Set<string>) {
  const base = name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet";
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    const suffix = ` (${index})`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function rideStatusLabel(status: string, copy: AdminDashboardMessages) {
  const labels = copy.charts.rideStatuses as Record<string, string>;
  return labels[status] ?? status;
}

function vehicleStatusLabel(status: VehicleStatus, copy: AdminDashboardMessages) {
  return copy.charts.vehicleStatuses[status] ?? status;
}

function invoiceStatusLabel(status: InvoiceStatus, copy: AdminDashboardMessages) {
  return copy.charts.invoiceStatuses[status] ?? status;
}

function complianceStatusLabel(
  status: VehicleComplianceStatus,
  copy: AdminDashboardMessages,
) {
  return copy.charts.complianceStatuses[status] ?? status;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${formatNumber(value)}`;
}

function sumRecord(record: Record<string, number>) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function requesterName(request: AdminRideRequest) {
  const requester = request.requester;
  if (!requester) return "-";
  return [requester.first_name, requester.middle_name, requester.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || requester.email || "-";
}

function requesterCompany(request: AdminRideRequest) {
  return request.requester?.requester_profile?.organization_name?.trim() || "-";
}

function buildExportTables({
  analytics,
  fromDate,
  toDate,
  copy,
  access,
  rideRequests = [],
  fuelLogs = [],
}: DashboardExportInput): SheetTable[] {
  const tables: SheetTable[] = [];
  const metric = copy.export.metric;
  const value = copy.export.value;
  const date = copy.export.date;
  const count = copy.export.count;
  const status = copy.export.status;
  const region = copy.export.region;
  const detail = copy.export.detail;

  tables.push({
    name: copy.export.sheets.summary,
    title: copy.export.sheets.summary,
    head: [metric, value],
    rows: [
      [copy.export.period, formatPeriodRange(fromDate, toDate)],
      [
        copy.charts.periodLabel.replace("{days}", String(analytics.period_days)),
        analytics.period_days,
      ],
      ...(access.canReadInvoices && analytics.payments
        ? ([
            [copy.charts.paidLabel, analytics.payments.paid_total],
            [copy.charts.outstandingLabel, analytics.payments.outstanding_total],
          ] as Array<Array<string | number>>)
        : []),
      ...(access.canViewCompliance && analytics.fleet?.compliance
        ? ([
            [
              copy.charts.attentionLabel,
              analytics.fleet.compliance.vehicles_needing_attention,
            ],
          ] as Array<Array<string | number>>)
        : []),
    ],
  });

  if (access.canReadRideRequests && analytics.ride_requests) {
    tables.push({
      name: copy.export.sheets.rideStatus,
      title: copy.charts.rideStatusTitle,
      head: [status, count],
      rows: Object.entries(analytics.ride_requests.by_status).map(
        ([key, amount]) => [rideStatusLabel(key as RideRequestStatus, copy), amount],
      ),
    });

    tables.push({
      name: copy.export.sheets.rideTrend,
      title: copy.charts.rideTrendTitle,
      head: [
        detail.date,
        detail.customer,
        detail.company,
        detail.status,
        detail.pickup,
        detail.dropoff,
        detail.vehiclePlate,
      ],
      rows:
        rideRequests.length > 0
          ? rideRequests.map((request) => [
              formatDateTime(request.created_at),
              requesterName(request),
              requesterCompany(request),
              rideStatusLabel(request.status, copy),
              request.pickup_address || "-",
              request.dropoff_address || "-",
              request.assigned_vehicle?.plate_number || "-",
            ])
          : [["-", detail.noRows, "-", "-", "-", "-", "-"]],
    });

    tables.push({
      name: copy.export.sheets.rideRegion,
      title: copy.charts.rideRegionTitle,
      head: [region, count],
      rows: analytics.ride_requests.by_region.map((point) => [
        point.region_name || copy.charts.unassignedRegion,
        point.count,
      ]),
    });
  }

  if (access.canReadVehicles && analytics.fleet) {
    tables.push({
      name: copy.export.sheets.fleetStatus,
      title: copy.charts.fleetStatusTitle,
      head: [status, count],
      rows: Object.entries(analytics.fleet.by_status).map(([key, amount]) => [
        vehicleStatusLabel(key as VehicleStatus, copy),
        amount,
      ]),
    });
  }

  if (access.canViewCompliance && analytics.fleet?.compliance) {
    tables.push({
      name: copy.export.sheets.compliance,
      title: copy.charts.complianceTitle,
      head: [copy.export.type, status, count],
      rows: [
        ...analytics.fleet.compliance.insurance.map((point) => [
          copy.charts.insuranceLabel,
          complianceStatusLabel(point.status, copy),
          point.count,
        ]),
        ...analytics.fleet.compliance.inspection.map((point) => [
          copy.charts.inspectionLabel,
          complianceStatusLabel(point.status, copy),
          point.count,
        ]),
      ],
    });
  }

  if (access.canReadVehicles && analytics.fuel) {
    tables.push({
      name: copy.export.sheets.fuel,
      title: copy.charts.fuelSpendTitle,
      head: [
        detail.date,
        detail.vehiclePlate,
        detail.requestedBy,
        detail.driver,
        detail.liters,
        detail.cost,
        detail.station,
      ],
      rows:
        fuelLogs.length > 0
          ? fuelLogs.map((log) => [
              formatDateTime(log.logged_at),
              log.vehicle.plate_number || "-",
              log.created_by?.name || "-",
              log.driver_at_refill?.name || "-",
              log.quantity_liters,
              log.total_cost ?? "-",
              log.station_name || "-",
            ])
          : [["-", "-", detail.noRows, "-", "-", "-", "-"]],
    });
  }

  if (access.canReadInvoices && analytics.payments) {
    tables.push({
      name: copy.export.sheets.paymentStatus,
      title: copy.charts.paymentStatusTitle,
      head: [status, count],
      rows: Object.entries(analytics.payments.by_status).map(([key, amount]) => [
        invoiceStatusLabel(key as InvoiceStatus, copy),
        amount,
      ]),
    });

    tables.push({
      name: copy.export.sheets.paymentTrend,
      title: copy.charts.paymentTrendTitle,
      head: [date, copy.charts.paidAmountLabel, copy.charts.issuedAmountLabel],
      rows: analytics.payments.trend.map((point) => [
        point.date,
        point.paid_amount,
        point.issued_amount,
      ]),
    });
  }

  if (access.canViewRegistrations && analytics.registrations) {
    tables.push({
      name: copy.export.sheets.registrations,
      title: copy.charts.registrationTrendTitle,
      head: [date, count],
      rows: analytics.registrations.trend.map((point) => [point.date, point.count]),
    });
  }

  return tables.filter((table) => table.rows.length > 0);
}

function fileStamp(fromDate: string, toDate: string) {
  return `dashboard_${fromDate}_to_${toDate}`;
}

function formatPeriodRange(fromDate: string, toDate: string) {
  return `${fromDate} to ${toDate}`;
}

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setStroke(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 8,
  style: "F" | "S" | "FD" = "F",
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

function lastAutoTableY(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
    ?.finalY;
}

function drawHero(doc: jsPDF, input: DashboardExportInput) {
  setFill(doc, BRAND);
  doc.rect(0, 0, PAGE_W, 148, "F");

  setFill(doc, GOLD);
  doc.rect(0, 148, PAGE_W, 5, "F");

  setText(doc, GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(input.copy.export.report.eyebrow.toUpperCase(), MARGIN, 38);

  setText(doc, [255, 255, 255]);
  doc.setFontSize(24);
  doc.text(input.copy.export.reportTitle, MARGIN, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, [210, 224, 220]);
  const subtitle = doc.splitTextToSize(
    input.copy.export.report.subtitle,
    PAGE_W - MARGIN * 2,
  );
  doc.text(subtitle, MARGIN, 90);

  setFill(doc, [255, 255, 255]);
  roundedRect(doc, MARGIN, 112, 230, 26, 8, "F");
  setText(doc, BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `${input.copy.export.period}: ${formatPeriodRange(input.fromDate, input.toDate)}`,
    MARGIN + 12,
    129,
  );

  setText(doc, [210, 224, 220]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    input.copy.export.report.generatedAt.replace(
      "{datetime}",
      new Date().toLocaleString(),
    ),
    PAGE_W - MARGIN,
    129,
    { align: "right" },
  );
}

function drawKpiCards(doc: jsPDF, cards: KpiCard[], startY: number) {
  if (cards.length === 0) {
    return startY;
  }

  const gap = 10;
  const cols = Math.min(3, cards.length);
  const cardW = (PAGE_W - MARGIN * 2 - gap * (cols - 1)) / cols;
  const cardH = 64;
  let cursorY = startY;

  for (let i = 0; i < cards.length; i += cols) {
    if (cursorY + cardH > PAGE_H - 48) {
      doc.addPage();
      cursorY = 48;
    }

    const rowCards = cards.slice(i, i + cols);
    rowCards.forEach((card, col) => {
      const x = MARGIN + col * (cardW + gap);
      const radius = 10;
      const accentWidth = 5;

      // Full rounded card in accent, then white body so the stripe follows the corners
      setFill(doc, card.accent);
      roundedRect(doc, x, cursorY, cardW, cardH, radius, "F");

      setFill(doc, [255, 255, 255]);
      doc.rect(x + accentWidth, cursorY, cardW - accentWidth, cardH, "F");

      setStroke(doc, [226, 232, 240]);
      doc.setLineWidth(0.8);
      roundedRect(doc, x, cursorY, cardW, cardH, radius, "S");

      setText(doc, MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(card.label.toUpperCase(), x + 14, cursorY + 18);

      setText(doc, BRAND);
      doc.setFontSize(15);
      doc.text(doc.splitTextToSize(card.value, cardW - 24)[0], x + 14, cursorY + 40);

      if (card.hint) {
        setText(doc, SLATE);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(doc.splitTextToSize(card.hint, cardW - 24)[0], x + 14, cursorY + 54);
      }
    });

    cursorY += cardH + gap;
  }

  return cursorY + 4;
}

function drawFooters(doc: jsPDF, copy: AdminDashboardMessages) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setStroke(doc, [226, 232, 240]);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, PAGE_H - 28, PAGE_W - MARGIN, PAGE_H - 28);

    setText(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(copy.export.report.footerBrand, MARGIN, PAGE_H - 14);
    doc.text(
      copy.export.report.pageLabel
        .replace("{page}", String(page))
        .replace("{pages}", String(pageCount)),
      PAGE_W - MARGIN,
      PAGE_H - 14,
      { align: "right" },
    );
  }
}

function buildKpis(input: DashboardExportInput): KpiCard[] {
  const { analytics, copy, access } = input;
  const cards: KpiCard[] = [];

  if (access.canReadRideRequests && analytics.ride_requests) {
    cards.push({
      label: copy.export.report.kpiTotalRides,
      value: formatNumber(sumRecord(analytics.ride_requests.by_status)),
      hint: copy.charts.operationsTitle,
      accent: BRAND,
    });
    cards.push({
      label: copy.operations.pendingTitle,
      value: formatNumber(analytics.ride_requests.by_status.pending ?? 0),
      hint: copy.operations.pendingDescription,
      accent: GOLD,
    });
  }

  if (access.canReadVehicles && analytics.fleet) {
    cards.push({
      label: copy.charts.vehiclesLabel,
      value: formatNumber(sumRecord(analytics.fleet.by_status)),
      hint: copy.charts.fleetStatusDescription,
      accent: [76, 133, 120],
    });
  }

  if (access.canViewCompliance && analytics.fleet?.compliance) {
    cards.push({
      label: copy.charts.attentionLabel,
      value: formatNumber(analytics.fleet.compliance.vehicles_needing_attention),
      hint: copy.compliance.attentionDescription,
      accent: [220, 38, 38],
    });
  }

  if (access.canReadInvoices && analytics.payments) {
    cards.push({
      label: copy.charts.paidLabel,
      value: formatMoney(analytics.payments.paid_total, copy.charts.currencyCode),
      hint: copy.charts.paymentsTitle,
      accent: [5, 150, 105],
    });
    cards.push({
      label: copy.charts.outstandingLabel,
      value: formatMoney(
        analytics.payments.outstanding_total,
        copy.charts.currencyCode,
      ),
      hint: copy.charts.paymentStatusDescription,
      accent: [217, 119, 6],
    });
  }

  if (access.canViewRegistrations && analytics.registrations) {
    cards.push({
      label: copy.charts.registrationsLabel,
      value: formatNumber(
        analytics.registrations.trend.reduce((sum, point) => sum + point.count, 0),
      ),
      hint: copy.charts.registrationsTitle,
      accent: [79, 70, 229],
    });
  }

  return cards.slice(0, 6);
}

function formatCell(value: string | number) {
  return typeof value === "number" ? formatNumber(value) : value;
}

export async function exportAdminDashboardExcel(input: DashboardExportInput) {
  const XLSX = await import("xlsx");
  const tables = buildExportTables(input);
  if (tables.length === 0) {
    throw new Error(input.copy.export.empty);
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const table of tables) {
    const sheet = XLSX.utils.aoa_to_sheet([table.head, ...table.rows]);
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      safeSheetName(table.name, usedNames),
    );
  }

  XLSX.writeFile(workbook, `${fileStamp(input.fromDate, input.toDate)}.xlsx`);
}

export async function exportAdminDashboardPdf(input: DashboardExportInput) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const tables = buildExportTables(input);

  if (tables.length === 0) {
    throw new Error(input.copy.export.empty);
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  drawHero(doc, input);

  let y = drawKpiCards(doc, buildKpis(input), 176);

  for (const table of tables) {
    if (y > PAGE_H - 100) {
      doc.addPage();
      y = 48;
    }

    setFill(doc, BRAND);
    roundedRect(doc, MARGIN, y, 5, 18, 2, "F");
    setText(doc, BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(table.title, MARGIN + 12, y + 13);
    y += 22;

    const isDetailTable =
      table.name === input.copy.export.sheets.rideTrend ||
      table.name === input.copy.export.sheets.fuel ||
      table.head.length >= 5;

    autoTable(doc, {
      startY: y,
      head: [table.head],
      body: table.rows.map((row) => row.map(formatCell)),
      margin: { left: MARGIN, right: MARGIN, bottom: 40 },
      styles: {
        font: "helvetica",
        fontSize: isDetailTable ? 7.5 : 8.5,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
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
        fontSize: isDetailTable ? 7.5 : 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: isDetailTable
        ? undefined
        : {
            0: { cellWidth: "auto", fontStyle: "bold", textColor: BRAND },
          },
    });

    y = (lastAutoTableY(doc) ?? y) + 22;
  }

  drawFooters(doc, input.copy);
  doc.save(`${fileStamp(input.fromDate, input.toDate)}.pdf`);
}

export type ChartExportTable = {
  title: string;
  head: string[];
  rows: Array<Array<string | number>>;
  fromDate: string;
  toDate: string;
  copy: AdminDashboardMessages;
};

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "chart";
}

export async function exportDashboardChartExcel(table: ChartExportTable) {
  if (table.rows.length === 0) {
    throw new Error(table.copy.export.empty);
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([table.head, ...table.rows]);
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    safeSheetName(table.title, new Set()),
  );
  XLSX.writeFile(
    workbook,
    `${slugifyFileName(table.title)}_${table.fromDate}_to_${table.toDate}.xlsx`,
  );
}

export async function exportDashboardChartPdf(table: ChartExportTable) {
  if (table.rows.length === 0) {
    throw new Error(table.copy.export.empty);
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({
    orientation: table.head.length >= 5 ? "landscape" : "portrait",
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
  doc.text(table.title, MARGIN, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, [210, 224, 220]);
  doc.text(
    `${table.copy.export.period}: ${formatPeriodRange(table.fromDate, table.toDate)}`,
    MARGIN,
    56,
  );

  const isDetailTable = table.head.length >= 5;

  autoTable(doc, {
    startY: 92,
    head: [table.head],
    body: table.rows.map((row) => row.map(formatCell)),
    margin: { left: MARGIN, right: MARGIN, bottom: 40 },
    styles: {
      font: "helvetica",
      fontSize: isDetailTable ? 7.5 : 9,
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
    doc.text(table.copy.export.report.footerBrand, MARGIN, pageH - 14);
    doc.text(
      table.copy.export.report.pageLabel
        .replace("{page}", String(page))
        .replace("{pages}", String(pageCount)),
      pageW - MARGIN,
      pageH - 14,
      { align: "right" },
    );
  }

  doc.save(
    `${slugifyFileName(table.title)}_${table.fromDate}_to_${table.toDate}.pdf`,
  );
}

export function buildRideRequestDetailRows(
  requests: AdminRideRequest[],
  copy: AdminDashboardMessages,
) {
  const detail = copy.export.detail;
  return {
    head: [
      detail.date,
      detail.customer,
      detail.company,
      detail.status,
      detail.pickup,
      detail.dropoff,
      detail.vehiclePlate,
    ],
    rows: requests.map((request) => [
      formatDateTime(request.created_at),
      requesterName(request),
      requesterCompany(request),
      rideStatusLabel(request.status, copy),
      request.pickup_address || "-",
      request.dropoff_address || "-",
      request.assigned_vehicle?.plate_number || "-",
    ]),
  };
}

export function buildFuelLogDetailRows(
  logs: VehicleFuelLog[],
  copy: AdminDashboardMessages,
) {
  const detail = copy.export.detail;
  return {
    head: [
      detail.date,
      detail.vehiclePlate,
      detail.requestedBy,
      detail.driver,
      detail.liters,
      detail.cost,
      detail.station,
    ],
    rows: logs.map((log) => [
      formatDateTime(log.logged_at),
      log.vehicle.plate_number || "-",
      log.created_by?.name || "-",
      log.driver_at_refill?.name || "-",
      log.quantity_liters,
      log.total_cost ?? "-",
      log.station_name || "-",
    ]),
  };
}
