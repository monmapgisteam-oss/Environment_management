import L from 'leaflet';
import { vectorBasemapLayer } from 'esri-leaflet-vector';

// IMPORTANT: this module pulls in esri-leaflet-vector (which touches `window`),
// so it must only be imported from client map components that are loaded with
// `dynamic(..., { ssr: false })`. Never import it from a server component.

const ARCGIS_API_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim() || '';

export function hasArcgisBasemap(): boolean {
  return ARCGIS_API_KEY.length > 0;
}

/**
 * Add the basemap to a Leaflet map and return the layer.
 * Uses an ArcGIS basemap (drawn with the API key) when one is configured,
 * otherwise falls back to OpenStreetMap so maps still work without a key.
 */
export function addBasemap(map: L.Map): L.Layer {
  if (ARCGIS_API_KEY) {
    const layer = vectorBasemapLayer('arcgis/navigation', { token: ARCGIS_API_KEY });
    layer.addTo(map);
    return layer;
  }
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
}
