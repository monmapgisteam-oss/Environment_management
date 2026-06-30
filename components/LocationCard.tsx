"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { PROVINCES, DISTRICTS, getSubDistricts } from "@/lib/mongolia";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

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
  const [fields, setFields] = useState({ province: "", district: "", khoroo: "" });
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const seeded = useRef(false);

  // Seed the card from an existing report's location exactly once.
  useEffect(() => {
    if (!initialLocation || seeded.current) return;
    seeded.current = true;
    const nextFields = {
      province: initialLocation.province || "",
      district: initialLocation.district || "",
      khoroo: initialLocation.khoroo || "",
    };
    const nextCoords =
      initialLocation.lat != null && initialLocation.lng != null
        ? { lat: initialLocation.lat, lng: initialLocation.lng }
        : null;
    const nextAddress = initialLocation.address || "";
    setFields(nextFields);
    setCoords(nextCoords);
    setAddress(nextAddress);
    onLocationChange?.({
      lat: nextCoords?.lat,
      lng: nextCoords?.lng,
      address: nextAddress || undefined,
      province: nextFields.province || undefined,
      district: nextFields.district || undefined,
      khoroo: nextFields.khoroo || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

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
    // Cascading selects: changing the province clears the district + khoroo, and
    // changing the district clears the khoroo, so a stale child value can never
    // remain selected under a new parent.
    let next = { ...fields, [name]: value };
    if (name === "province") next = { province: value, district: "", khoroo: "" };
    if (name === "district") next = { ...next, khoroo: "" };
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
    // Province / district / khoroo are now fixed-list choices the sender selects
    // from dropdowns, so the map only contributes coordinates + a display
    // address and never overwrites the administrative divisions.
    setCoords(nextCoords);
    setAddress(nextAddress);
    push(nextCoords, nextAddress, fields);
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

  const districtOptions = DISTRICTS[fields.province] ?? [];
  const subDistrictOptions = getSubDistricts(fields.province, fields.district);
  const selectClass =
    "w-full h-11 rounded-xl border border-[#D9E4F0] bg-white px-4 text-sm text-color-text-main appearance-none focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition disabled:bg-slate-50 disabled:text-color-text-muted disabled:cursor-not-allowed";

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
            Аймаг, сум/дүүрэг, баг/хороог жагсаалтаас сонгоно уу. Байршлыг газрын
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
              <select
                value={fields.district}
                onChange={(e) => handleFieldChange("district", e.target.value)}
                required
                disabled={!fields.province}
                className={selectClass}
              >
                <option value="">
                  {fields.province ? "Сонгоно уу" : "Эхлээд аймаг сонгоно уу"}
                </option>
                {fields.district && !districtOptions.includes(fields.district) && (
                  <option value={fields.district}>{fields.district}</option>
                )}
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-color-text-main mb-1.5">
                Баг / Хороо <span className="text-red-500">*</span>
              </label>
              <select
                value={fields.khoroo}
                onChange={(e) => handleFieldChange("khoroo", e.target.value)}
                required
                disabled={!fields.district}
                className={selectClass}
              >
                <option value="">
                  {fields.district ? "Сонгоно уу" : "Эхлээд сум/дүүрэг сонгоно уу"}
                </option>
                {fields.khoroo && !subDistrictOptions.includes(fields.khoroo) && (
                  <option value={fields.khoroo}>{fields.khoroo}</option>
                )}
                {subDistrictOptions.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
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
