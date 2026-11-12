import { FormulaErrorValue } from "../types";
import { tokenizeFormula, type RefTokenValue, type Token } from "./lexer";

export type ASTNode =
  | { kind: "Literal"; value: string | number | boolean }
  | { kind: "Ref"; ref: RefTokenValue }
  | { kind: "UnaryOp"; op: "-" | "!"; operand: ASTNode }
  | { kind: "BinaryOp"; op: string; left: ASTNode; right: ASTNode }
  | { kind: "Call"; name: string; args: ASTNode[] };

const MAX_AST_DEPTH = 50;

export function parseFormula(expression: string): ASTNode {
  const cleaned = String(expression ?? "").trim();
  const normalized = cleaned.startsWith("=") ? cleaned.slice(1).trim() : cleaned;
  if (!normalized) {
    throw new FormulaErrorValue("#SYNTAX?", "Công thức không được để trống");
  }

  const tokens = tokenizeFormula(normalized);
  let cursor = 0;

  const peek = (): Token => tokens[cursor] ?? { type: "EOF", value: "", pos: normalized.length };
  const consume = (): Token => {
    const t = peek();
    cursor++;
    return t;
  };

  const guardDepth = (depth: number) => {
    if (depth > MAX_AST_DEPTH) {
      throw new FormulaErrorValue("#SYNTAX?", "Biểu thức lồng nhau vượt quá giới hạn 50 cấp");
    }
  };

  function parseExpression(depth: number): ASTNode {
    guardDepth(depth);
    return parseOr(depth + 1);
  }

  function parseOr(depth: number): ASTNode {
    guardDepth(depth);
    let left = parseAnd(depth + 1);
    while (peek().type === "OP" && peek().value === "||") {
      const op = String(consume().value);
      const right = parseAnd(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parseAnd(depth: number): ASTNode {
    guardDepth(depth);
    let left = parseEquality(depth + 1);
    while (peek().type === "OP" && peek().value === "&&") {
      const op = String(consume().value);
      const right = parseEquality(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parseEquality(depth: number): ASTNode {
    guardDepth(depth);
    let left = parseComparison(depth + 1);
    while (
      peek().type === "OP" &&
      ["=", "==", "!=", "<>"].includes(String(peek().value))
    ) {
      const op = String(consume().value);
      const right = parseComparison(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parseComparison(depth: number): ASTNode {
    guardDepth(depth);
    let left = parseConcat(depth + 1);
    while (
      peek().type === "OP" &&
      [">", ">=", "<", "<="].includes(String(peek().value))
    ) {
      const op = String(consume().value);
      const right = parseConcat(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parseConcat(depth: number): ASTNode {
    guardDepth(depth);
    let left = parseAdditive(depth + 1);
    while (peek().type === "OP" && peek().value === "&") {
      const op = String(consume().value);
      const right = parseAdditive(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parseAdditive(depth: number): ASTNode {
    guardDepth(depth);
    let left = parseMultiplicative(depth + 1);
    while (peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
      const op = String(consume().value);
      const right = parseMultiplicative(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parseMultiplicative(depth: number): ASTNode {
    guardDepth(depth);
    let left = parsePower(depth + 1);
    while (peek().type === "OP" && (peek().value === "*" || peek().value === "/")) {
      const op = String(consume().value);
      const right = parsePower(depth + 1);
      left = { kind: "BinaryOp", op, left, right };
    }
    return left;
  }

  function parsePower(depth: number): ASTNode {
    guardDepth(depth);
    const base = parseUnary(depth + 1);
    if (peek().type === "OP" && peek().value === "^") {
      const op = String(consume().value);
      const exponent = parsePower(depth + 1);
      return { kind: "BinaryOp", op, left: base, right: exponent };
    }
    return base;
  }

  function parseUnary(depth: number): ASTNode {
    guardDepth(depth);
    if (peek().type === "OP" && (peek().value === "-" || peek().value === "!")) {
      const op = String(consume().value) as "-" | "!";
      const operand = parseUnary(depth + 1);
      return { kind: "UnaryOp", op, operand };
    }
    return parsePrimary(depth + 1);
  }

  function parsePrimary(depth: number): ASTNode {
    guardDepth(depth);
    const token = peek();

    if (token.type === "NUMBER" || token.type === "STRING" || token.type === "BOOLEAN") {
      consume();
      return { kind: "Literal", value: token.value as string | number | boolean };
    }

    if (token.type === "REF") {
      consume();
      return { kind: "Ref", ref: token.value as RefTokenValue };
    }

    if (token.type === "LPAREN") {
      consume();
      const expr = parseExpression(depth + 1);
      if (peek().type !== "RPAREN") {
        throw new FormulaErrorValue("#SYNTAX?", "Thiếu dấu ngoặc đóng ')'");
      }
      consume();
      return expr;
    }

    if (token.type === "IDENT") {
      const name = String(consume().value).toUpperCase();
      if (peek().type !== "LPAREN") {
        throw new FormulaErrorValue("#NAME?", `Không nhận diện được định danh '${token.value}'`);
      }
      consume(); // LPAREN
      const args: ASTNode[] = [];
      if (peek().type !== "RPAREN") {
        while (true) {
          args.push(parseExpression(depth + 1));
          if (peek().type === "COMMA") {
            consume();
            if (peek().type === "RPAREN") {
              throw new FormulaErrorValue("#SYNTAX?", `Thiếu tham số sau dấu phân cách trong hàm ${name}`);
            }
            continue;
          }
          break;
        }
      }
      if (peek().type !== "RPAREN") {
        throw new FormulaErrorValue("#SYNTAX?", `Hàm ${name} thiếu dấu ngoặc đóng ')'`);
      }
      consume();
      return { kind: "Call", name, args };
    }

    throw new FormulaErrorValue("#SYNTAX?", `Lỗi cú pháp gần '${String(token.value || "cuối biểu thức")}'`);
  }

  const ast = parseExpression(0);
  if (peek().type !== "EOF") {
    throw new FormulaErrorValue("#SYNTAX?", `Ký tự dư thừa '${String(peek().value)}'`);
  }
  return ast;
}

