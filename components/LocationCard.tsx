"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

export default function LocationCard() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  const handleMapClick = (lat: number, lng: number) => {
    setLocation({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=mn`,
      );
      const data = await res.json();
      if (data.display_name) {
        setLocation((prev) =>
          prev ? { ...prev, address: data.display_name } : prev,
        );
      }
    } catch {}
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1&accept-language=mn`,
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setLocation({
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: display_name,
        });
      }
    } catch {
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="border border-[#E8F0FE] rounded-2xl p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
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
            <h3 className="text-base font-semibold text-color-text-main">
              Газарзүйн мэдээлэл
            </h3>
          </div>
          <p className="text-[13px] text-color-text-muted mt-1 mb-5">
            Байршлыг хайх эсвэл газрын зураг дээр дарж сонгоно уу.
          </p>

          <div className="relative mb-4">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-color-text-muted"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Хаяг, байршил хайх"
              className="w-full h-11 rounded-xl border border-[#D9E4F0] bg-white pl-10 pr-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-color-primary text-color-primary text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searching ? "Хайж байна..." : "Байршил хайх"}
          </button>

          {location && (
            <div className="mt-4 p-3 rounded-xl bg-[#F8FBFF] border border-[#E8F0FE]">
              <p className="text-xs text-color-text-muted mb-1">
                Сонгосон байршил
              </p>
              <p className="text-sm font-medium text-color-text-main">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
              {location.address && (
                <p className="text-xs text-color-text-muted mt-1">
                  {location.address}
                </p>
              )}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl overflow-hidden border border-[#E8F0FE]"
          style={{ height: 300 }}
        >
          <MapPicker
            lat={location?.lat ?? 47.9184}
            lng={location?.lng ?? 106.9177}
            hasMarker={!!location}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  );
}
