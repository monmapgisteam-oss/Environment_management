"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SURVEY_EXCLUDED_OBJECT_IDS } from "@/lib/constants";
import { extractNominatimLocation, extractSurveyLocation, type AdministrativeLocation } from "@/lib/locationResolver";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-color-text-muted">
      Газрын зураг ачааллаж байна...
    </div>
  );
}

// Survey123 service — used to resolve a company's location from its register
// number, so entering РД drops the marker on the map automatically.
const SURVEY_QUERY_URL =
  "https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query";

interface LocationData {
  lat?: number;
  lng?: number;
  address?: string;
  province?: string;
  district?: string;
  khoroo?: string;
}

interface LocationCardProps {
  onLocationChange?: (location: LocationData) => void;
  // Pre-fills the card when editing an existing report.
  initialLocation?: LocationData | null;
  // The implementer register (РД). When it matches a survey record, that
  // company's location is shown on the map automatically.
  register?: string;
}

export default function LocationCard({ onLocationChange, initialLocation, register }: LocationCardProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [matchInfo, setMatchInfo] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [looking, setLooking] = useState(false);
  const seeded = useRef(false);

  const push = (
    nextCoords: { lat: number; lng: number } | null,
    nextAddress: string,
    nextLocation: AdministrativeLocation = {},
  ) => {
    onLocationChange?.({
      lat: nextCoords?.lat,
      lng: nextCoords?.lng,
      address: nextAddress || undefined,
      province: nextLocation.province,
      district: nextLocation.district,
      khoroo: nextLocation.khoroo,
    });
  };

  // Seed the card from an existing report's location exactly once (edit mode).
  useEffect(() => {
    if (!initialLocation || seeded.current) return;
    seeded.current = true;
    const nextCoords =
      initialLocation.lat != null && initialLocation.lng != null
        ? { lat: initialLocation.lat, lng: initialLocation.lng }
        : null;
    const nextAddress = initialLocation.address || "";
    setCoords(nextCoords);
    setAddress(nextAddress);
    push(nextCoords, nextAddress, initialLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

  // Look the register up in the survey service (debounced) and show its point.
  useEffect(() => {
    const reg = (register || "").trim();
    if (reg.length < 3) {
      setMatchInfo("");
      setNotFound(false);
      return;
    }

    let cancelled = false;
    setLooking(true);
    const handle = setTimeout(async () => {
      try {
        const safe = reg.replace(/'/g, "''");
        const where = encodeURIComponent(
          `UPPER(Register)=UPPER('${safe}') AND OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`,
        );
        const res = await fetch(
          `${SURVEY_QUERY_URL}?where=${where}&outFields=*&returnGeometry=true&f=geojson`,
        );
        const data = await res.json();
        if (cancelled) return;
        const feature = data.features?.[0];
        const c = feature?.geometry?.coordinates;
        if (c && c.length >= 2) {
          const [lng, lat] = c;
          const org = feature.properties?.Organization || feature.properties?.project_name || "";
          const resolvedLocation = extractSurveyLocation(feature.properties);
          setCoords({ lat, lng });
          setAddress(org);
          setMatchInfo(org || "Бүртгэлээс олдлоо");
          setNotFound(false);
          push({ lat, lng }, org, resolvedLocation);
        } else {
          // No match — keep any existing marker, just flag it so the user knows.
          setMatchInfo("");
          setNotFound(true);
        }
      } catch {
        /* network errors are non-fatal — the map still works manually */
      } finally {
        if (!cancelled) setLooking(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register]);

  // Manual fallback: clicking the map sets the point (e.g. when a register has
  // no survey record yet).
  const handleMapClick = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setNotFound(false);
    push({ lat, lng }, address);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=mn`,
      );
      const data = await res.json();
      const display = data.display_name || "";
      const resolvedLocation = extractNominatimLocation(data);
      setAddress(display);
      setMatchInfo("");
      push({ lat, lng }, display, resolvedLocation);
    } catch {}
  };

  return (
    <div className="border border-[#E8F0FE] rounded-2xl p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <h3 className="text-base font-semibold text-color-text-main">Газарзүйн мэдээлэл</h3>
      </div>
      <p className="text-[13px] text-color-text-muted mt-1 mb-4">
        Төсөл хэрэгжүүлэгчийн РД-г оруулахад тухайн байгууллагын байршил газрын
        зураг дээр автоматаар харагдана.
      </p>

      {/* Lookup status */}
      {looking && (
        <p className="mb-3 text-[13px] text-color-text-muted">Байршлыг хайж байна...</p>
      )}
      {!looking && matchInfo && (
        <p className="mb-3 text-[13px] font-medium text-emerald-600">
          ✔ {matchInfo} — бүртгэлээс олдлоо
        </p>
      )}
      {!looking && notFound && (
        <p className="mb-3 text-[13px] text-amber-600">
          Энэ РД-аар бүртгэлээс байршил олдсонгүй. Газрын зураг дээр дарж сонгож болно.
        </p>
      )}

      <div
        className="rounded-2xl overflow-hidden border border-[#E8F0FE]"
        style={{ height: 380 }}
      >
        <MapPicker
          lat={coords?.lat ?? 47.9184}
          lng={coords?.lng ?? 106.9177}
          hasMarker={!!coords}
          onMapClick={handleMapClick}
        />
      </div>

      {coords && (
        <div className="mt-4 p-3 rounded-xl bg-[#F8FBFF] border border-[#E8F0FE]">
          <p className="text-xs text-color-text-muted mb-1">Байршил</p>
          <p className="text-sm font-medium text-color-text-main">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
          {address && <p className="text-xs text-color-text-muted mt-1">{address}</p>}
        </div>
      )}
    </div>
  );
}
