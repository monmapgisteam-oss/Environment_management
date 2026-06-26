"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

// Улаанбаатар хот + Монгол улсын 21 аймаг.
const PROVINCES = [
  "Улаанбаатар",
  "Архангай",
  "Баян-Өлгий",
  "Баянхонгор",
  "Булган",
  "Говь-Алтай",
  "Говьсүмбэр",
  "Дархан-Уул",
  "Дорноговь",
  "Дорнод",
  "Дундговь",
  "Завхан",
  "Орхон",
  "Өвөрхангай",
  "Өмнөговь",
  "Сүхбаатар",
  "Сэлэнгэ",
  "Төв",
  "Увс",
  "Ховд",
  "Хөвсгөл",
  "Хэнтий",
];

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
}

export default function LocationCard({ onLocationChange }: LocationCardProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [fields, setFields] = useState({ province: "", district: "", khoroo: "" });
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  // The sender types the administrative divisions; the map only adds optional
  // coordinates. Always emit the latest snapshot of everything together.
  const push = (
    nextCoords: { lat: number; lng: number } | null,
    nextAddress: string,
    nextFields: { province: string; district: string; khoroo: string },
  ) => {
    onLocationChange?.({
      lat: nextCoords?.lat,
      lng: nextCoords?.lng,
      address: nextAddress || undefined,
      province: nextFields.province || undefined,
      district: nextFields.district || undefined,
      khoroo: nextFields.khoroo || undefined,
    });
  };

  const handleFieldChange = (name: "province" | "district" | "khoroo", value: string) => {
    const next = { ...fields, [name]: value };
    setFields(next);
    push(coords, address, next);
  };

  const applyGeo = (
    lat: number,
    lng: number,
    display: string | undefined,
    a: any,
  ) => {
    const nextCoords = { lat, lng };
    const nextAddress = display || "";
    // Province is a fixed-list choice the sender selects, so the map never
    // touches it. District / khoroo are auto-filled only when still empty.
    const next = {
      province: fields.province,
      district: fields.district || a.county || a.city || a.town || a.municipality || a.state_district || "",
      khoroo: fields.khoroo || a.suburb || a.neighbourhood || a.quarter || a.city_district || a.village || "",
    };
    setCoords(nextCoords);
    setAddress(nextAddress);
    setFields(next);
    push(nextCoords, nextAddress, next);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    push({ lat, lng }, address, fields);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=mn`,
      );
      const data = await res.json();
      applyGeo(lat, lng, data.display_name, data.address || {});
    } catch {}
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&addressdetails=1&limit=1&accept-language=mn`,
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name, address: a } = data[0];
        applyGeo(parseFloat(lat), parseFloat(lon), display_name, a || {});
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
            Аймаг, сум/дүүрэг, баг/хорооны мэдээллийг бичнэ үү. Байршлыг газрын
            зураг дээрээс нэмж сонгож болно.
          </p>

          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-color-text-main mb-1.5">
                Аймаг / Хот <span className="text-red-500">*</span>
              </label>
              <select
                value={fields.province}
                onChange={(e) => handleFieldChange("province", e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-[#D9E4F0] bg-white px-4 text-sm text-color-text-main appearance-none focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
              >
                <option value="">Сонгоно уу</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-color-text-main mb-1.5">
                Сум / Дүүрэг <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fields.district}
                onChange={(e) => handleFieldChange("district", e.target.value)}
                placeholder="Жишээ нь: Баянзүрх"
                required
                className="w-full h-11 rounded-xl border border-[#D9E4F0] bg-white px-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-color-text-main mb-1.5">
                Баг / Хороо <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fields.khoroo}
                onChange={(e) => handleFieldChange("khoroo", e.target.value)}
                placeholder="Жишээ нь: 5-р хороо"
                required
                className="w-full h-11 rounded-xl border border-[#D9E4F0] bg-white px-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
              />
            </div>
          </div>

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

          {coords && (
            <div className="mt-4 p-3 rounded-xl bg-[#F8FBFF] border border-[#E8F0FE]">
              <p className="text-xs text-color-text-muted mb-1">
                Сонгосон байршил
              </p>
              <p className="text-sm font-medium text-color-text-main">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              {address && (
                <p className="text-xs text-color-text-muted mt-1">{address}</p>
              )}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl overflow-hidden border border-[#E8F0FE]"
          style={{ height: 300 }}
        >
          <MapPicker
            lat={coords?.lat ?? 47.9184}
            lng={coords?.lng ?? 106.9177}
            hasMarker={!!coords}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  );
}
