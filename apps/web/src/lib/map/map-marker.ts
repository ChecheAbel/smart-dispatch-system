import L from "leaflet";

export const MAP_MARKER_ICON_SIZE: L.PointExpression = [40, 52];
export const MAP_MARKER_ICON_ANCHOR: L.PointExpression = [20, 50];
export const MAP_MARKER_POPUP_ANCHOR: L.PointExpression = [0, -46];

export type MapMarkerVariant = "active" | "inactive";

let markerIdCounter = 0;

function nextMarkerId(variant: MapMarkerVariant) {
  markerIdCounter += 1;
  return `${variant}-${markerIdCounter}`;
}

const MARKER_PALETTE = {
  active: {
    fillTop: "#2a5249",
    fillBottom: "#1C3A34",
    stroke: "#C9B87A",
    inner: "#F8FAFB",
    accent: "#C9B87A",
    shadow: "rgba(28, 58, 52, 0.28)",
  },
  inactive: {
    fillTop: "#94a3b8",
    fillBottom: "#64748b",
    stroke: "#cbd5e1",
    inner: "#f8fafc",
    accent: "#e2e8f0",
    shadow: "rgba(100, 116, 139, 0.22)",
  },
} as const;

export function getMapMarkerHtml(variant: MapMarkerVariant = "active") {
  const colors = MARKER_PALETTE[variant];
  const markerId = nextMarkerId(variant);
  const gradientId = `dispatch-pin-gradient-${markerId}`;
  const shadowId = `dispatch-pin-shadow-${markerId}`;

  return `
    <svg
      class="dispatch-map-pin"
      viewBox="0 0 40 52"
      width="40"
      height="52"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="${gradientId}" x1="20" y1="2" x2="20" y2="48" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.fillTop}" />
          <stop offset="1" stop-color="${colors.fillBottom}" />
        </linearGradient>
        <filter id="${shadowId}" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="${colors.shadow}" />
        </filter>
      </defs>
      <ellipse cx="20" cy="47.5" rx="7" ry="2.2" fill="${colors.shadow}" opacity="0.55" />
      <path
        d="M20 3.5C12.544 3.5 6.5 9.82 6.5 17.45C6.5 27.8 20 48.5 20 48.5C20 48.5 33.5 27.8 33.5 17.45C33.5 9.82 27.456 3.5 20 3.5Z"
        fill="url(#${gradientId})"
        stroke="${colors.stroke}"
        stroke-width="2.25"
        stroke-linejoin="round"
        filter="url(#${shadowId})"
      />
      <circle cx="20" cy="17.5" r="7.25" fill="${colors.inner}" />
      <circle cx="20" cy="17.5" r="3.25" fill="${colors.accent}" />
    </svg>
  `;
}

export function createMapMarkerIcon(variant: MapMarkerVariant = "active") {
  return L.divIcon({
    className: `dispatch-map-marker dispatch-map-marker--${variant}`,
    html: getMapMarkerHtml(variant),
    iconSize: MAP_MARKER_ICON_SIZE,
    iconAnchor: MAP_MARKER_ICON_ANCHOR,
    popupAnchor: MAP_MARKER_POPUP_ANCHOR,
  });
}

export function getMapLegendPinHtml(variant: MapMarkerVariant = "active") {
  return getMapMarkerHtml(variant).replace(
    'class="dispatch-map-pin"',
    'class="dispatch-map-pin dispatch-map-pin--legend"',
  );
}
