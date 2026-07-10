export const dashboardChartTheme = {
  brand: "#1C3A34",
  brandMid: "#2F5E54",
  brandSoft: "#4C8578",
  accent: "#8FB5A8",
  accentSoft: "#C2D9D2",
  gold: "#C9B87A",
  grid: "#eef2f6",
  axis: "#94a3b8",
  muted: "#64748b",
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
