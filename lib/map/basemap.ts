import L from 'leaflet';

// IMPORTANT: keep this a plain raster XYZ tile layer (no WebGL). The vector
// basemap (esri-leaflet-vector + maplibre-gl) hung the whole tab — WebGL
// rendering can lock up the main thread in sandboxed/virtualized/no-GPU
// environments, showing as "This page isn't responding". Esri's classic
// raster tile service below is plain <img> tiles, same mechanism as
// OpenStreetMap, and needs no API key.
const ARCGIS_RASTER_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

/**
 * Add the basemap to a Leaflet map and return the layer.
 */
export function addBasemap(map: L.Map): L.Layer {
  return L.tileLayer(ARCGIS_RASTER_URL, {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  }).addTo(map);
}
