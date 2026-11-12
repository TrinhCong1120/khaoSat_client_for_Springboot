import { FormulaErrorValue } from "../types";

export type TokenType =
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "REF"
  | "IDENT"
  | "OP"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EOF";

export type RefTokenValue = {
  raw: string;
  matrixRow?: string;
};

export type Token = {
  type: TokenType;
  value: string | number | boolean | RefTokenValue;
  pos: number;
};

const ARITHMETIC_OR_CMP_OPS = new Set(["+", "-", "*", "/", "^", "=", "==", "!=", "<>", ">", ">=", "<", "<="]);

export function tokenizeFormula(input: string): Token[] {
  const src = String(input ?? "").trim();
  const hasSemicolon = src.includes(";");
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(", pos: i });
      i++;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")", pos: i });
      i++;
      continue;
    }

    if (ch === ";" || ch === ",") {
      tokens.push({ type: "COMMA", value: ch, pos: i });
      i++;
      continue;
    }

    // Question / matrix / computed reference: [#id] or [Question Label] optionally followed by .[Row Label]
    if (ch === "[") {
      const start = i;
      i++;
      let refBody = "";
      let closed = false;
      while (i < src.length) {
        if (src[i] === "]") {
          closed = true;
          i++;
          break;
        }
        refBody += src[i];
        i++;
      }
      if (!closed || !refBody.trim()) {
        throw new FormulaErrorValue("#SYNTAX?", "Tham chiếu [...] chưa đóng hoặc rỗng");
      }

      let matrixRow: string | undefined;
      if (i + 1 < src.length && src[i] === "." && src[i + 1] === "[") {
        i += 2;
        let rowBody = "";
        let rowClosed = false;
        while (i < src.length) {
          if (src[i] === "]") {
            rowClosed = true;
            i++;
            break;
          }
          rowBody += src[i];
          i++;
        }
        if (!rowClosed || !rowBody.trim()) {
          throw new FormulaErrorValue("#SYNTAX?", "Tham chiếu hàng ma trận .[Row] chưa đóng");
        }
        matrixRow = rowBody.trim();
      }

      tokens.push({
        type: "REF",
        value: { raw: refBody.trim(), matrixRow },
        pos: start,
      });
      continue;
    }

    // String literal "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      let str = "";
      let closed = false;
      while (i < src.length) {
        if (src[i] === "\\" && i + 1 < src.length) {
          str += src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          closed = true;
          i++;
          break;
        }
        str += src[i];
        i++;
      }
      if (!closed) {
        throw new FormulaErrorValue("#SYNTAX?", "Chuỗi ký tự chưa đóng dấu nháy");
      }
      tokens.push({ type: "STRING", value: str, pos: start });
      continue;
    }

    // Number literal (supports dot decimal 8.5 and unambiguous VN comma decimal 8,5)
    if (/\d/.test(ch)) {
      const start = i;
      let numStr = "";
      while (i < src.length && /\d/.test(src[i])) {
        numStr += src[i];
        i++;
      }
      if (i < src.length && src[i] === "." && i + 1 < src.length && /\d/.test(src[i + 1])) {
        numStr += ".";
        i++;
        while (i < src.length && /\d/.test(src[i])) {
          numStr += src[i];
          i++;
        }
      } else if (i < src.length && src[i] === "," && i + 1 < src.length && /\d/.test(src[i + 1])) {
        // Check if comma is followed by digits and NOT another immediate ",\d" list like SUM(1,2,3)
        let look = i + 1;
        while (look < src.length && /\d/.test(src[look])) look++;
        const nextIsAnotherCommaDigit = look < src.length && src[look] === "," && look + 1 < src.length && /\d/.test(src[look + 1]);
        const prev = tokens[tokens.length - 1];
        const prevIsArithOrCmp = prev?.type === "OP" && ARITHMETIC_OR_CMP_OPS.has(String(prev.value));
        const parenDepth = countOpenParens(tokens);
        const canTreatCommaAsDecimal =
          !nextIsAnotherCommaDigit && (hasSemicolon || parenDepth === 0 || prevIsArithOrCmp);

        if (canTreatCommaAsDecimal) {
          numStr += ".";
          i++;
          while (i < src.length && /\d/.test(src[i])) {
            numStr += src[i];
            i++;
          }
        }
      }

      const parsed = Number(numStr);
      if (!Number.isFinite(parsed)) {
        throw new FormulaErrorValue("#VALUE?", `Số không hợp lệ: ${numStr}`);
      }
      tokens.push({ type: "NUMBER", value: parsed, pos: start });
      continue;
    }

    // Multi-char and single-char operators
    const twoChar = src.slice(i, i + 2);
    if (["==", "!=", "<>", ">=", "<=", "&&", "||"].includes(twoChar)) {
      tokens.push({ type: "OP", value: twoChar, pos: i });
      i += 2;
      continue;
    }
    if (["+", "-", "*", "/", "^", "=", ">", "<", "!", "&"].includes(ch)) {
      tokens.push({ type: "OP", value: ch, pos: i });
      i++;
      continue;
    }

    // Identifiers (Function names, TRUE/FALSE, or bare identifier keywords)
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      let ident = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) {
        ident += src[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (upper === "TRUE") {
        tokens.push({ type: "BOOLEAN", value: true, pos: start });
      } else if (upper === "FALSE") {
        tokens.push({ type: "BOOLEAN", value: false, pos: start });
      } else {
        tokens.push({ type: "IDENT", value: ident, pos: start });
      }
      continue;
    }

    throw new FormulaErrorValue("#SYNTAX?", `Ký tự không hợp lệ '${ch}' tại vị trí ${i + 1}`);
  }

  tokens.push({ type: "EOF", value: "", pos: i });
  return tokens;
}

function countOpenParens(tokens: Token[]): number {
  let depth = 0;
  for (const t of tokens) {
    if (t.type === "LPAREN") depth++;
    else if (t.type === "RPAREN") depth = Math.max(0, depth - 1);
  }
  return depth;
}

