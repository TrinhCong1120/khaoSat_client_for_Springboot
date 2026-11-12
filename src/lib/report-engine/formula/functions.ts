import { parseSmartNumber, extractText } from "../extractors";
import { FormulaErrorValue } from "../types";

export type FormulaRuntimeValue = string | number | boolean | null | FormulaErrorValue;

export function toNumberValue(val: FormulaRuntimeValue): number | FormulaErrorValue {
  if (val instanceof FormulaErrorValue) return val;
  if (val == null || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : new FormulaErrorValue("#VALUE?");
  if (typeof val === "boolean") return val ? 1 : 0;
  const parsed = parseSmartNumber(String(val));
  if (parsed === null) {
    return new FormulaErrorValue("#VALUE?", `Không chuyển được '${String(val)}' thành số`);
  }
  return parsed;
}

export function toStrictNumber(val: FormulaRuntimeValue): number | null {
  if (val instanceof FormulaErrorValue || val == null || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "boolean") return val ? 1 : 0;
  return parseSmartNumber(String(val));
}

export function toBooleanValue(val: FormulaRuntimeValue): boolean {
  if (val instanceof FormulaErrorValue) return false;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return s !== "" && s !== "false" && s !== "0";
}

export function toTextValue(val: FormulaRuntimeValue): string {
  if (val instanceof FormulaErrorValue) return val.code;
  if (val == null) return "";
  return extractText(val);
}

function parseDateSafe(val: FormulaRuntimeValue): Date | null {
  if (val instanceof FormulaErrorValue || val == null || val === "") return null;
  if (typeof val === "number") {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  if (!str) return null;
  // Normalize yyyy-MM-dd to avoid timezone off-by-one when extracting Y/M/D
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
  }
  const vnDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (vnDate) {
    return new Date(Number(vnDate[3]), Number(vnDate[2]) - 1, Number(vnDate[1]));
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function firstError(vals: FormulaRuntimeValue[]): FormulaErrorValue | null {
  for (const v of vals) {
    if (v instanceof FormulaErrorValue) return v;
  }
  return null;
}

function expectArgCount(name: string, args: unknown[], min: number, max = min): FormulaErrorValue | null {
  if (args.length < min || args.length > max) {
    return new FormulaErrorValue(
      "#VALUE?",
      `Hàm ${name} yêu cầu ${min === max ? min : `${min}-${max}`} tham số`
    );
  }
  return null;
}

export const FORMULA_FUNCTION_CATALOG: Array<{
  name: string;
  signature: string;
  description: string;
  example: string;
}> = [
  { name: "IF", signature: "IF(điều_kiện, nếu_đúng, nếu_sai)", description: "Rẽ nhánh có điều kiện", example: 'IF([#Toán] >= 8, "Tốt", "Chưa đạt")' },
  { name: "IFS", signature: "IFS(đk1, kq1, đk2, kq2, ...)", description: "Nhiều nhánh điều kiện liên tiếp", example: 'IFS([#Điểm] >= 9, "A", [#Điểm] >= 7, "B", TRUE, "C")' },
  { name: "AND", signature: "AND(đk1, đk2, ...)", description: "Đúng khi tất cả tham số đúng", example: "AND([#Toán] >= 5, [#Văn] >= 5)" },
  { name: "OR", signature: "OR(đk1, đk2, ...)", description: "Đúng khi có ít nhất 1 tham số đúng", example: "OR([#Toán] >= 9, [#Lý] >= 9)" },
  { name: "NOT", signature: "NOT(đk)", description: "Đảo ngược giá trị logic", example: 'NOT(CONTAINS([#Lớp], "10"))' },
  { name: "COALESCE", signature: "COALESCE(giá_trị1, giá_trị2, ...)", description: "Lấy giá trị đầu tiên không rỗng", example: 'COALESCE([#Ghi chú], "Không có")' },
  { name: "AVG", signature: "AVG(số1, số2, ...)", description: "Trung bình cộng các số", example: "AVG([#Toán], [#Văn])" },
  { name: "SUM", signature: "SUM(số1, số2, ...)", description: "Tổng các số", example: "SUM([#Điểm 1], [#Điểm 2])" },
  { name: "MIN", signature: "MIN(số1, số2, ...)", description: "Giá trị nhỏ nhất", example: "MIN([#Toán], [#Văn])" },
  { name: "MAX", signature: "MAX(số1, số2, ...)", description: "Giá trị lớn nhất", example: "MAX([#Toán], [#Văn])" },
  { name: "COUNT", signature: "COUNT(gt1, gt2, ...)", description: "Đếm số ô có giá trị không rỗng", example: "COUNT([#Câu 1], [#Câu 2])" },
  { name: "ROUND", signature: "ROUND(số, [số_lẻ])", description: "Làm tròn số", example: "ROUND(AVG([#Toán], [#Văn]), 2)" },
  { name: "ABS", signature: "ABS(số)", description: "Trị tuyệt đối", example: "ABS([#A] - [#B])" },
  { name: "FLOOR", signature: "FLOOR(số)", description: "Làm tròn xuống số nguyên", example: "FLOOR([#Điểm])" },
  { name: "CEIL", signature: "CEIL(số)", description: "Làm tròn lên số nguyên", example: "CEIL([#Điểm])" },
  { name: "LEFT", signature: "LEFT(chuỗi, n)", description: "Lấy n ký tự đầu", example: "LEFT([#Lớp], 1)" },
  { name: "RIGHT", signature: "RIGHT(chuỗi, n)", description: "Lấy n ký tự cuối", example: "RIGHT([#Lớp], 2)" },
  { name: "MID", signature: "MID(chuỗi, bắt_đầu, độ_dài)", description: "Cắt chuỗi từ vị trí (bắt đầu từ 1)", example: "MID([#Mã], 2, 3)" },
  { name: "LEN", signature: "LEN(chuỗi)", description: "Độ dài chuỗi", example: "LEN(TRIM([#Tên]))" },
  { name: "LOWER", signature: "LOWER(chuỗi)", description: "Chuyển thành chữ thường", example: "LOWER([#Lớp])" },
  { name: "UPPER", signature: "UPPER(chuỗi)", description: "Chuyển thành chữ hoa", example: "UPPER(LEFT([#Lớp], 1))" },
  { name: "TRIM", signature: "TRIM(chuỗi)", description: "Xóa khoảng trắng thừa đầu/cuối", example: "TRIM([#Lớp])" },
  { name: "CONTAINS", signature: "CONTAINS(chuỗi, từ_khóa)", description: "Kiểm tra có chứa từ khóa (không phân biệt hoa thường)", example: 'CONTAINS([#Lớp], "12")' },
  { name: "REGEXMATCH", signature: "REGEXMATCH(chuỗi, pattern)", description: "Kiểm tra khớp biểu thức chính quy", example: 'REGEXMATCH([#Lớp], "^12[A-Z]")' },
  { name: "REGEXEXTRACT", signature: "REGEXEXTRACT(chuỗi, pattern)", description: "Trích xuất chuỗi con theo regex", example: 'REGEXEXTRACT([#Lớp], "[A-Za-z]+")' },
  { name: "VALUE", signature: "VALUE(chuỗi)", description: 'Chuyển chữ ("8,5") sang số', example: "VALUE([#Điểm nhập tay])" },
  { name: "TEXT", signature: "TEXT(giá_trị)", description: "Chuyển sang dạng chuỗi", example: 'TEXT(ROUND([#Điểm], 1)) & " đ"' },
  { name: "YEAR", signature: "YEAR(ngày)", description: "Lấy năm (4 chữ số)", example: "YEAR([#Ngày sinh])" },
  { name: "MONTH", signature: "MONTH(ngày)", description: "Lấy tháng (1-12)", example: "MONTH([#Ngày nộp])" },
  { name: "DAY", signature: "DAY(ngày)", description: "Lấy ngày trong tháng (1-31)", example: "DAY([#Ngày nộp])" },
  { name: "WEEKDAY", signature: "WEEKDAY(ngày)", description: "Lấy thứ trong tuần (Thứ 2 = 1 .. CN = 7)", example: "WEEKDAY([#Ngày nộp])" },
  { name: "DATEDIF", signature: "DATEDIF(ngày_1, ngày_2, \"D\"|\"M\"|\"Y\")", description: "Khoảng cách giữa 2 ngày", example: 'DATEDIF([#Ngày sinh], [#Ngày nộp], "Y")' },
];

export function evaluateEagerFunction(
  rawName: string,
  args: FormulaRuntimeValue[]
): FormulaRuntimeValue {
  const name = rawName === "AVERAGE" ? "AVG" : rawName;
  const err = firstError(args);
  if (err && name !== "COALESCE" && name !== "COUNT") {
    return err;
  }

  switch (name) {
    case "NOT": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      return !toBooleanValue(args[0]);
    }

    case "COALESCE": {
      for (const arg of args) {
        if (arg instanceof FormulaErrorValue) continue;
        if (arg !== null && arg !== undefined && String(arg).trim() !== "") return arg;
      }
      return null;
    }

    case "LEFT": {
      const check = expectArgCount(name, args, 2);
      if (check) return check;
      const n = toNumberValue(args[1]);
      if (n instanceof FormulaErrorValue) return n;
      return toTextValue(args[0]).slice(0, Math.max(0, Math.floor(n)));
    }

    case "RIGHT": {
      const check = expectArgCount(name, args, 2);
      if (check) return check;
      const n = toNumberValue(args[1]);
      if (n instanceof FormulaErrorValue) return n;
      const s = toTextValue(args[0]);
      const count = Math.max(0, Math.floor(n));
      return count === 0 ? "" : s.slice(-count);
    }

    case "MID": {
      const check = expectArgCount(name, args, 3);
      if (check) return check;
      const start = toNumberValue(args[1]);
      if (start instanceof FormulaErrorValue) return start;
      const length = toNumberValue(args[2]);
      if (length instanceof FormulaErrorValue) return length;
      const s = toTextValue(args[0]);
      const idx = Math.max(0, Math.floor(start) - 1);
      const len = Math.max(0, Math.floor(length));
      return s.slice(idx, idx + len);
    }

    case "LEN": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      return toTextValue(args[0]).length;
    }

    case "LOWER": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      return toTextValue(args[0]).toLowerCase();
    }

    case "UPPER": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      return toTextValue(args[0]).toUpperCase();
    }

    case "TRIM": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      return toTextValue(args[0]).trim();
    }

    case "CONTAINS": {
      const check = expectArgCount(name, args, 2);
      if (check) return check;
      return toTextValue(args[0]).toLowerCase().includes(toTextValue(args[1]).toLowerCase());
    }

    case "REGEXMATCH": {
      const check = expectArgCount(name, args, 2);
      if (check) return check;
      const pattern = toTextValue(args[1]);
      if (pattern.length > 200) return new FormulaErrorValue("#VALUE?", "Regex quá dài");
      try {
        return new RegExp(pattern, "i").test(toTextValue(args[0]));
      } catch {
        return new FormulaErrorValue("#VALUE?", "Regex không hợp lệ");
      }
    }

    case "REGEXEXTRACT": {
      const check = expectArgCount(name, args, 2, 3);
      if (check) return check;
      const pattern = toTextValue(args[1]);
      if (pattern.length > 200) return new FormulaErrorValue("#VALUE?", "Regex quá dài");
      const groupIdx = args[2] !== undefined ? Number(toNumberValue(args[2])) : 0;
      if (!Number.isFinite(groupIdx) || groupIdx < 0) {
        return new FormulaErrorValue("#VALUE?");
      }
      try {
        const match = new RegExp(pattern).exec(toTextValue(args[0]));
        if (!match) return "";
        return match[groupIdx] ?? match[1] ?? match[0] ?? "";
      } catch {
        return new FormulaErrorValue("#VALUE?", "Regex không hợp lệ");
      }
    }

    case "ROUND": {
      const check = expectArgCount(name, args, 1, 2);
      if (check) return check;
      const num = toNumberValue(args[0]);
      if (num instanceof FormulaErrorValue) return num;
      const digits = args[1] !== undefined ? toNumberValue(args[1]) : 0;
      if (digits instanceof FormulaErrorValue) return digits;
      const factor = Math.pow(10, Math.min(10, Math.max(-10, Math.trunc(digits))));
      return Math.round((num + Number.EPSILON) * factor) / factor;
    }

    case "ABS": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      const num = toNumberValue(args[0]);
      return num instanceof FormulaErrorValue ? num : Math.abs(num);
    }

    case "FLOOR": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      const num = toNumberValue(args[0]);
      return num instanceof FormulaErrorValue ? num : Math.floor(num);
    }

    case "CEIL": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      const num = toNumberValue(args[0]);
      return num instanceof FormulaErrorValue ? num : Math.ceil(num);
    }

    case "SUM":
    case "AVG":
    case "MIN":
    case "MAX": {
      if (args.length === 0) return new FormulaErrorValue("#VALUE?");
      const nums: number[] = [];
      for (const a of args) {
        if (a == null || a === "") continue;
        const n = toStrictNumber(a);
        if (n === null) {
          return new FormulaErrorValue("#VALUE?", `Giá trị '${String(a)}' không phải số`);
        }
        nums.push(n);
      }
      if (nums.length === 0) {
        return name === "SUM" ? 0 : null;
      }
      if (name === "SUM") return nums.reduce((acc, v) => acc + v, 0);
      if (name === "AVG") return nums.reduce((acc, v) => acc + v, 0) / nums.length;
      if (name === "MIN") return Math.min(...nums);
      return Math.max(...nums);
    }

    case "COUNT": {
      let c = 0;
      for (const a of args) {
        if (!(a instanceof FormulaErrorValue) && a != null && String(a).trim() !== "") {
          c++;
        }
      }
      return c;
    }

    case "VALUE": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      if (args[0] == null || args[0] === "") return null;
      const parsed = parseSmartNumber(args[0]);
      if (parsed === null) return new FormulaErrorValue("#VALUE?", "Không thể ép kiểu sang số");
      return parsed;
    }

    case "TEXT": {
      const check = expectArgCount(name, args, 1, 2);
      if (check) return check;
      return toTextValue(args[0]);
    }

    case "YEAR":
    case "MONTH":
    case "DAY":
    case "WEEKDAY": {
      const check = expectArgCount(name, args, 1);
      if (check) return check;
      const d = parseDateSafe(args[0]);
      if (!d) return new FormulaErrorValue("#VALUE?", "Ngày không hợp lệ");
      if (name === "YEAR") return d.getFullYear();
      if (name === "MONTH") return d.getMonth() + 1;
      if (name === "DAY") return d.getDate();
      const jsDay = d.getDay();
      return jsDay === 0 ? 7 : jsDay;
    }

    case "DATEDIF": {
      const check = expectArgCount(name, args, 3);
      if (check) return check;
      const d1 = parseDateSafe(args[0]);
      const d2 = parseDateSafe(args[1]);
      if (!d1 || !d2) return new FormulaErrorValue("#VALUE?", "Ngày không hợp lệ");
      const unit = toTextValue(args[2]).trim().toUpperCase();
      if (unit === "D") {
        return Math.floor((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
      }
      if (unit === "M") {
        let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
        if (d2.getDate() < d1.getDate()) months--;
        return months;
      }
      if (unit === "Y") {
        let years = d2.getFullYear() - d1.getFullYear();
        if (
          d2.getMonth() < d1.getMonth() ||
          (d2.getMonth() === d1.getMonth() && d2.getDate() < d1.getDate())
        ) {
          years--;
        }
        return years;
      }
      return new FormulaErrorValue("#VALUE?", "Đơn vị DATEDIF phải là D, M hoặc Y");
    }

    default:
      return new FormulaErrorValue("#NAME?", `Hàm '${rawName}' không được hỗ trợ`);
  }
}

