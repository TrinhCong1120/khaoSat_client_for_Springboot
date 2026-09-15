"use client";

import { useEffect, useState } from "react";
import SearchableCodeSelect, {
  type CodeOption,
} from "@/components/form/SearchableCodeSelect";

const PROVINCES_API = "https://provinces.open-api.vn/api/v2";

type Province = { name: string; code: number };
type Ward = { name: string; code: number };

export type ProvinceWardValue = {
  provinceCode: number;
  wardCode: number | null;
  province: string;
  ward: string;
};

function flattenWards(data: {
  wards?: { name: string; code: number }[];
  districts?: { wards?: { name: string; code: number }[] }[];
}): Ward[] {
  if (Array.isArray(data.wards) && data.wards.length > 0) {
    return data.wards.map((w) => ({ name: w.name, code: w.code }));
  }
  if (Array.isArray(data.districts)) {
    return data.districts.flatMap((d) =>
      (d.wards || []).map((w) => ({ name: w.name, code: w.code }))
    );
  }
  return [];
}

type ProvinceWardSelectProps = {
  value: ProvinceWardValue;
  onChange: (next: ProvinceWardValue) => void;
  disabled?: boolean;
  className?: string;
  /** Mặc định khi cha chưa gán province (Đà Nẵng = 48) */
  defaultProvinceCode?: number;
};

export default function ProvinceWardSelect({
  value,
  onChange,
  disabled = false,
  className = "",
  defaultProvinceCode = 48,
}: ProvinceWardSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provinceCode =
    value.provinceCode != null && Number.isFinite(value.provinceCode)
      ? value.provinceCode
      : defaultProvinceCode;

  const provinceOptions: CodeOption[] = provinces.map((p) => ({
    code: p.code,
    name: p.name,
  }));
  const wardOptions: CodeOption[] = wards.map((w) => ({
    code: w.code,
    name: w.name,
  }));

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    fetch(`${PROVINCES_API}/`)
      .then((r) => {
        if (!r.ok) throw new Error("Không tải được danh sách tỉnh/thành");
        return r.json();
      })
      .then((data: { name: string; code: number }[]) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []).map((p) => ({
          name: p.name,
          code: p.code,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setProvinces(list);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Không tải được danh sách tỉnh/thành");
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (provinceCode == null || !Number.isFinite(provinceCode)) {
      setWards([]);
      return;
    }
    let cancelled = false;
    setLoadingWards(true);
    fetch(`${PROVINCES_API}/p/${provinceCode}?depth=2`)
      .then((r) => {
        if (!r.ok) throw new Error("ward");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const w = flattenWards(data);
        w.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setWards(w);
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  return (
    <div className={className}>
      {error && (
        <p className="text-red-500 text-xs font-medium mb-2">{error}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SearchableCodeSelect
          aria-label="Tỉnh / Thành phố"
          placeholder={
            loadingProvinces ? "Đang tải tỉnh/thành…" : "Gõ tìm theo tên…"
          }
          options={provinceOptions}
          value={provinceCode}
          onChange={(code) => {
            if (code == null || !Number.isFinite(code)) return;
            const selectedProvince =
              provinces.find((p) => p.code === code)?.name ?? "";
            onChange({
              provinceCode: code,
              wardCode: null,
              province: selectedProvince,
              ward: "",
            });
          }}
          disabled={disabled || !!error || loadingProvinces}
          allowCodeInput={false}
        />
        <SearchableCodeSelect
          aria-label="Xã / Phường"
          placeholder={
            loadingWards
              ? "Đang tải…"
              : "Gõ tìm xã/phường theo tên…"
          }
          options={wardOptions}
          value={
            value.wardCode != null && Number.isFinite(value.wardCode)
              ? value.wardCode
              : null
          }
          onChange={(code) => {
            const selectedWard =
              wards.find((w) => w.code === code)?.name ?? "";
            onChange({
              provinceCode,
              wardCode: code,
              province:
                provinces.find((p) => p.code === provinceCode)?.name ?? "",
              ward: selectedWard,
            });
          }}
          disabled={disabled || !!error || loadingWards || wardOptions.length === 0}
          allowNull
          nullLabel="Chưa chọn xã/phường"
          allowCodeInput={false}
        />
      </div>
    </div>
  );
}
