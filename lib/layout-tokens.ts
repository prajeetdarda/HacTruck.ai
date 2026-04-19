/**
 * Stacking order: map < tray < panel < top bar shell < alerts popover < toast
 * TopBar must sit above the map row so header dropdowns (bell) aren’t covered by Mapbox.
 */
export const Z_MAP = 10;
export const Z_TRAY = 30;
export const Z_PANEL = 40;
export const Z_TOPBAR = 90;
export const Z_ALERTS = 95;
export const Z_TOAST = 100;
