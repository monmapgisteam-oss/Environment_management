// Embeds a web map authored in ArcGIS Online Map Viewer. The web map must be
// shared publicly; pass its item id (configured via NEXT_PUBLIC_ARCGIS_WEBMAP_ID).
// This is a plain (server-rendered) component — an iframe needs no client JS.

interface Props {
  webmapId?: string;
  height?: number;
}

export default function ArcgisWebMap({ webmapId, height = 560 }: Props) {
  const id = (webmapId || '').trim();

  if (!id) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-slate-600">ArcGIS вэб газрын зураг тохируулаагүй байна.</p>
        <p className="max-w-md text-xs text-slate-400">
          ArcGIS Online Map Viewer дээр вэб газрын зураг үүсгэж, нийтэд хуваалцаад, түүний web map
          ID-г <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_ARCGIS_WEBMAP_ID</code> тохиргоонд
          оруулна уу.
        </p>
      </div>
    );
  }

  // Classic public embed app for an ArcGIS web map.
  const src =
    `https://www.arcgis.com/apps/Embed/index.html?webmap=${encodeURIComponent(id)}` +
    `&home=true&zoom=true&scale=true&legend=true&disable_scroll=false&theme=light`;

  return (
    <iframe
      title="ArcGIS вэб газрын зураг"
      src={src}
      className="h-full w-full"
      style={{ border: 0, minHeight: height }}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
