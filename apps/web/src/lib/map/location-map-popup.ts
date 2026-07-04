import type { Location } from "@smart-dispatch/types";
import { formatCoordinatePair } from "./coordinates";

export type LocationMapPopupLabels = {
  eyebrow: string;
  active: string;
  inactive: string;
  region: string;
  address: string;
  coordinates: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function iconRegion() {
  return `<svg class="locations-map-popup__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5c-2.9 0-5.25 2.2-5.25 4.92 0 3.69 5.25 10.58 5.25 10.58s5.25-6.89 5.25-10.58C15.25 4.7 12.9 2.5 10 2.5Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="7.4" r="1.75" stroke="currentColor" stroke-width="1.5"/></svg>`;
}

function iconAddress() {
  return `<svg class="locations-map-popup__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 8.5 10 3.5l6 5v7.25a.75.75 0 0 1-.75.75H4.75A.75.75 0 0 1 4 15.75V8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 16V11h4v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function iconCoordinates() {
  return `<svg class="locations-map-popup__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.25" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="1.75" fill="currentColor"/><path d="M10 3.25v2M10 14.75v2M3.25 10H1.25M18.75 10H16.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function popupRow(
  icon: string,
  label: string,
  value: string,
  variant: "default" | "coordinates" = "default",
) {
  const variantClass =
    variant === "coordinates" ? " locations-map-popup__row--coordinates" : "";

  return `
    <div class="locations-map-popup__row${variantClass}">
      <div class="locations-map-popup__icon-wrap">${icon}</div>
      <div class="locations-map-popup__row-copy">
        <span class="locations-map-popup__label">${escapeHtml(label)}</span>
        <span class="locations-map-popup__value">${escapeHtml(value)}</span>
      </div>
    </div>
  `;
}

export function buildLocationMapPopupHtml(
  location: Location,
  labels: LocationMapPopupLabels,
) {
  const statusClass = location.is_active
    ? "locations-map-popup__status locations-map-popup__status--active"
    : "locations-map-popup__status locations-map-popup__status--inactive";
  const statusLabel = location.is_active ? labels.active : labels.inactive;
  const region = location.region?.name;
  const address = location.address;
  const coordinates = formatCoordinatePair(location.latitude, location.longitude);

  const rows = [
    region ? popupRow(iconRegion(), labels.region, region) : "",
    address ? popupRow(iconAddress(), labels.address, address) : "",
    popupRow(iconCoordinates(), labels.coordinates, coordinates, "coordinates"),
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="locations-map-popup">
      <header class="locations-map-popup__header">
        <div class="locations-map-popup__header-copy">
          <p class="locations-map-popup__eyebrow">${escapeHtml(labels.eyebrow)}</p>
          <h3 class="locations-map-popup__name">${escapeHtml(location.name)}</h3>
        </div>
        <span class="${statusClass}">${escapeHtml(statusLabel)}</span>
      </header>
      <div class="locations-map-popup__body">
        ${rows}
      </div>
    </article>
  `;
}

export const LOCATION_MAP_POPUP_OPTIONS = {
  className: "locations-map-popup-pane",
  maxWidth: 680,
  minWidth: 420,
  autoPanPadding: [28, 28] as [number, number],
};
