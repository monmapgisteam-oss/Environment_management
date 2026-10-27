"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { extractNominatimLocation, type AdministrativeLocation } from "@/lib/map/locationResolver";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
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
}

export default function LocationCard({ onLocationChange, initialLocation }: LocationCardProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
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

  // Clicking the map sets the point and looks up its address.
  const handleMapClick = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    push({ lat, lng }, address);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=mn`,
      );
      const data = await res.json();
      const display = data.display_name || "";
      const resolvedLocation = extractNominatimLocation(data);
      setAddress(display);
      push({ lat, lng }, display, resolvedLocation);
    } catch {}
  };

  return (
    <div className="border border-slate-200 p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F766E"
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
        Газрын зураг дээр дарж төсөл хэрэгжих байршлыг сонгоно уу.
      </p>

      <div
        className="overflow-hidden border border-slate-200"
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
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200">
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
