import L from 'leaflet';

// IMPORTANT: keep these plain raster XYZ tile layers (no WebGL). The vector
// basemap (esri-leaflet-vector + maplibre-gl) hung the whole tab — WebGL
// rendering can lock up the main thread in sandboxed/virtualized/no-GPU
// environments, showing as "This page isn't responding". Esri's classic
// raster tile services below are plain <img> tiles, same mechanism as
// OpenStreetMap, and need no API key.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const STORAGE_KEY = 'basemap';

type Basemap = {
  label: string;
  // Base tiles first, then label/reference tiles drawn on top.
  services: string[];
  // Deepest zoom Esri serves for the service; Leaflet enlarges beyond it.
  maxNativeZoom: number;
};

// Canvas (gray) basemaps keep the colors for the data on top; the others are
// for looking at the ground itself.
const BASEMAPS: Record<string, Basemap> = {
  gray: { label: 'Саарал', services: ['Canvas/World_Light_Gray_Base', 'Canvas/World_Light_Gray_Reference'], maxNativeZoom: 16 },
  dark: { label: 'Бараан', services: ['Canvas/World_Dark_Gray_Base', 'Canvas/World_Dark_Gray_Reference'], maxNativeZoom: 16 },
  streets: { label: 'Гудамж', services: ['World_Street_Map'], maxNativeZoom: 19 },
  topo: { label: 'Топограф', services: ['World_Topo_Map'], maxNativeZoom: 19 },
  imagery: { label: 'Хиймэл дагуул', services: ['World_Imagery', 'Reference/World_Boundaries_and_Places'], maxNativeZoom: 19 },
};

function createLayer({ services, maxNativeZoom }: Basemap) {
  return L.layerGroup(
    services.map((service) =>
      L.tileLayer(`${ESRI}/${service}/MapServer/tile/{z}/{y}/{x}`, {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        maxNativeZoom,
      }),
    ),
  );
}

// The viewer's last pick in this browser, else the topographic map.
function initialKey() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in BASEMAPS) return saved;
  } catch {
    // Storage blocked: fall back to the default.
  }
  return 'topo';
}

/**
 * Add the basemap to a Leaflet map and return every basemap by its label.
 * With `control` (the default) a switcher is added in the bottom-right
 * corner; pass false when the caller builds its own layers control from the
 * returned layers.
 */
export function addBasemap(map: L.Map, { control = true }: { control?: boolean } = {}): Record<string, L.Layer> {
  const layers: Record<string, L.Layer> = {};
  const keyByLabel: Record<string, string> = {};
  for (const [key, basemap] of Object.entries(BASEMAPS)) {
    layers[basemap.label] = createLayer(basemap);
    keyByLabel[basemap.label] = key;
  }
  layers[BASEMAPS[initialKey()].label].addTo(map);

  map.on('baselayerchange', (event: L.LayersControlEvent) => {
    const key = keyByLabel[event.name];
    if (!key) return;
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Not remembered; the switch still applies.
    }
  });

  if (control) L.control.layers(layers, undefined, { position: 'bottomright' }).addTo(map);
  return layers;
}
