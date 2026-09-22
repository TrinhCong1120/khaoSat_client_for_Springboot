import { API_PROVINCES } from "@/lib/api";

const PROVINCES_API = API_PROVINCES;

type WardRow = { name: string; code: number };

function flattenWards(data: {
  wards?: WardRow[];
  districts?: { wards?: WardRow[] }[];
}): WardRow[] {
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

let provincesMapCache: Map<number, string> | null = null;
let provincesLoad: Promise<Map<number, string>> | null = null;

const wardsMapByProvince = new Map<number, Map<number, string>>();
const wardsLoadByProvince = new Map<number, Promise<Map<number, string>>>();

export async function loadProvincesNameMap(): Promise<Map<number, string>> {
  if (provincesMapCache) return provincesMapCache;
  if (provincesLoad) return provincesLoad;

  provincesLoad = fetch(`${PROVINCES_API}/`)
    .then((r) => {
      if (!r.ok) throw new Error("provinces");
      return r.json() as Promise<{ name: string; code: number }[]>;
    })
    .then((rows) => {
      const m = new Map<number, string>();
      for (const p of Array.isArray(rows) ? rows : []) {
        m.set(p.code, p.name);
      }
      provincesMapCache = m;
      return m;
    })
    .finally(() => {
      provincesLoad = null;
    });

  return provincesLoad;
}

export async function loadWardsNameMap(
  provinceCode: number
): Promise<Map<number, string>> {
  const cached = wardsMapByProvince.get(provinceCode);
  if (cached) return cached;

  const pending = wardsLoadByProvince.get(provinceCode);
  if (pending) return pending;

  const p = fetch(`${PROVINCES_API}/p/${provinceCode}?depth=2`)
    .then((r) => {
      if (!r.ok) throw new Error("wards");
      return r.json();
    })
    .then((data) => {
      const m = new Map<number, string>();
      for (const w of flattenWards(data)) {
        m.set(w.code, w.name);
      }
      wardsMapByProvince.set(provinceCode, m);
      return m;
    })
    .finally(() => {
      wardsLoadByProvince.delete(provinceCode);
    });

  wardsLoadByProvince.set(provinceCode, p);
  return p;
}

/** Lấy tên tỉnh (đồng bộ) sau khi đã gọi loadProvincesNameMap */
export function getProvinceNameSync(
  map: Map<number, string> | null,
  code: number
): string | null {
  return map?.get(code) ?? null;
}

export function getWardNameSync(
  map: Map<number, string> | null,
  code: number
): string | null {
  return map?.get(code) ?? null;
}

export async function formatAddressFromCodes(
  provinceCode: number,
  wardCode: number
): Promise<string> {
  const [pMap, wMap] = await Promise.all([
    loadProvincesNameMap(),
    loadWardsNameMap(provinceCode),
  ]);
  const pName = pMap.get(provinceCode) ?? `Tỉnh/TP #${provinceCode}`;
  const wName = wMap.get(wardCode) ?? `Xã/Phường #${wardCode}`;
  return `${pName} / ${wName}`;
}

/**
 * Chỉ coi là câu ADDRESS khi backend gắn đúng loại / mã.
 * Không suy từ nội dung `value` (tránh câu single choice có số bị gọi API địa giới).
 */
export function isAddressQuestionType(q: {
  type?: string;
  questionTypeCode?: string;
  questionTypeId?: number;
}): boolean {
  const t = String(q.type ?? "").toUpperCase();
  const code = String(q.questionTypeCode ?? "").toUpperCase();
  return (
    t === "ADDRESS" ||
    code === "ADDRESS" ||
    Number(q.questionTypeId) === 6
  );
}

/** Tách hai mã số từ chuỗi kiểu "48 / 123", "48,123", v.v. */
function parseCodesFromAddressString(s: string): {
  provinceCode: number;
  wardCode: number;
} | null {
  const t = s.trim();
  if (!t) return null;
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      const jpc =
        o.provinceCode ??
        o.ProvinceCode ??
        o.province_code;
      const jwc =
        o.wardCode ?? o.WardCode ?? o.ward_code;
      if (
        jpc != null &&
        jwc != null &&
        Number.isFinite(Number(jpc)) &&
        Number.isFinite(Number(jwc))
      ) {
        return { provinceCode: Number(jpc), wardCode: Number(jwc) };
      }
    } catch {
      /* ignore */
    }
    return null;
  }
  const parts = t.split(/[,|/]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { provinceCode: a, wardCode: b };
    }
  }
  const nums = t.match(/\d+/g);
  if (nums && nums.length >= 2) {
    const a = Number(nums[0]);
    const b = Number(nums[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { provinceCode: a, wardCode: b };
    }
  }
  return null;
}

/** Đọc mã từ object câu trả lời API (camelCase / PascalCase / snake_case / value / JSON) */
export function parseAddressCodesFromAnswer(answer: any): {
  provinceCode: number;
  wardCode: number;
} | null {
  if (answer == null) return null;
  if (typeof answer === "string") {
    return parseCodesFromAddressString(answer);
  }
  if (typeof answer !== "object") return null;

  const pc =
    answer.provinceCode ??
    answer.ProvinceCode ??
    answer.province_code;
  const wc =
    answer.wardCode ?? answer.WardCode ?? answer.ward_code;
  if (
    pc != null &&
    wc != null &&
    Number.isFinite(Number(pc)) &&
    Number.isFinite(Number(wc))
  ) {
    return { provinceCode: Number(pc), wardCode: Number(wc) };
  }

  const vRaw = answer.value ?? answer.Value;
  if (vRaw != null && vRaw !== "") {
    const fromVal = parseCodesFromAddressString(String(vRaw).trim());
    if (fromVal) return fromVal;
  }

  const nested = answer.address ?? answer.Address;
  if (nested != null && typeof nested === "object") {
    return parseAddressCodesFromAnswer(nested);
  }

  return null;
}
