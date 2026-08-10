export const dashboardChartTheme = {
  brand: "var(--dashboard-chart-brand)",
  brandMid: "var(--dashboard-chart-brand-mid)",
  brandSoft: "var(--dashboard-chart-brand-soft)",
  accent: "var(--dashboard-chart-accent)",
  accentSoft: "var(--dashboard-chart-accent-soft)",
  gold: "#C9B87A",
  grid: "var(--dashboard-chart-grid)",
  axis: "var(--dashboard-chart-axis)",
  muted: "var(--dashboard-chart-muted)",
} as const;

export const dashboardChartMargins = {
  top: 12,
  right: 12,
  left: 4,
  bottom: 4,
} as const;

export const dashboardChartAxisTick = {
  fontSize: 11,
  fill: dashboardChartTheme.muted,
};

export const dashboardChartGrid = {
  stroke: dashboardChartTheme.grid,
  strokeDasharray: "4 4",
  vertical: false,
};
