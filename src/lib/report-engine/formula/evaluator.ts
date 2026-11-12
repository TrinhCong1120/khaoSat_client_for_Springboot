import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { extractText, resolveFieldRawValue, resolveQuestionByFormulaRef } from "../extractors";
import { FormulaErrorValue, type FieldRef } from "../types";
import {
  evaluateEagerFunction,
  toBooleanValue,
  toNumberValue,
  toStrictNumber,
  toTextValue,
  type FormulaRuntimeValue,
} from "./functions";
import { parseFormula, type ASTNode } from "./parser";

const MAX_OPS = 500;

export type EvalContext = {
  record: DatasetRecord;
  questionsById: Map<string, SurveyResultQuestion>;
  computedValues?: Record<string, unknown>;
  systemFieldRefs?: Set<string>;
};

export function evaluateAst(ast: ASTNode, ctx: EvalContext): FormulaRuntimeValue {
  let ops = 0;

  function tick() {
    ops++;
    if (ops > MAX_OPS) {
      throw new FormulaErrorValue("#VALUE?", "Công thức vượt quá giới hạn thao tác cho phép");
    }
  }

  function evalRef(raw: string, matrixRow?: string): FormulaRuntimeValue {
    tick();
    const fieldRef = resolveReferenceToFieldRef(raw, matrixRow, ctx.questionsById);
    if (fieldRef instanceof FormulaErrorValue) return fieldRef;

    const rawVal = resolveFieldRawValue(ctx.record, fieldRef, ctx.questionsById, ctx.computedValues);
    if (rawVal == null) return null;
    if (typeof rawVal === "number" || typeof rawVal === "boolean") return rawVal;
    if (typeof rawVal === "string") return rawVal;
    return extractText(rawVal);
  }

  function evalNode(node: ASTNode): FormulaRuntimeValue {
    tick();
    switch (node.kind) {
      case "Literal":
        return node.value;

      case "Ref":
        return evalRef(node.ref.raw, node.ref.matrixRow);

      case "UnaryOp": {
        const val = evalNode(node.operand);
        if (val instanceof FormulaErrorValue) return val;
        if (node.op === "!") return !toBooleanValue(val);
        const num = toNumberValue(val);
        return num instanceof FormulaErrorValue ? num : -num;
      }

      case "BinaryOp": {
        // Short-circuit logical operators
        if (node.op === "&&") {
          const left = evalNode(node.left);
          if (left instanceof FormulaErrorValue) return left;
          if (!toBooleanValue(left)) return false;
          const right = evalNode(node.right);
          return right instanceof FormulaErrorValue ? right : toBooleanValue(right);
        }
        if (node.op === "||") {
          const left = evalNode(node.left);
          if (left instanceof FormulaErrorValue) return left;
          if (toBooleanValue(left)) return true;
          const right = evalNode(node.right);
          return right instanceof FormulaErrorValue ? right : toBooleanValue(right);
        }

        const left = evalNode(node.left);
        if (left instanceof FormulaErrorValue) return left;
        const right = evalNode(node.right);
        if (right instanceof FormulaErrorValue) return right;

        if (node.op === "&") {
          return toTextValue(left) + toTextValue(right);
        }

        if (["=", "==", "!=", "<>"].includes(node.op)) {
          const eq = compareEquality(left, right);
          return node.op === "=" || node.op === "==" ? eq : !eq;
        }

        if ([">", ">=", "<", "<="].includes(node.op)) {
          return compareOrder(left, right, node.op);
        }

        // Arithmetic (+, -, *, /, ^)
        const ln = toNumberValue(left);
        if (ln instanceof FormulaErrorValue) return ln;
        const rn = toNumberValue(right);
        if (rn instanceof FormulaErrorValue) return rn;

        switch (node.op) {
          case "+":
            return ln + rn;
          case "-":
            return ln - rn;
          case "*":
            return ln * rn;
          case "/":
            if (rn === 0) return new FormulaErrorValue("#DIV/0!", "Chia cho 0");
            return ln / rn;
          case "^": {
            const p = Math.pow(ln, rn);
            return Number.isFinite(p) ? p : new FormulaErrorValue("#VALUE?");
          }
          default:
            return new FormulaErrorValue("#SYNTAX?");
        }
      }

      case "Call": {
        // Short-circuit lazy control-flow functions so IF(N==0, 0, X/N) won't divide by 0
        if (node.name === "IF") {
          if (node.args.length < 2 || node.args.length > 3) {
            return new FormulaErrorValue("#VALUE?", "Hàm IF yêu cầu 2-3 tham số");
          }
          const cond = evalNode(node.args[0]);
          if (cond instanceof FormulaErrorValue) return cond;
          if (toBooleanValue(cond)) {
            return evalNode(node.args[1]);
          }
          return node.args.length === 3 ? evalNode(node.args[2]) : false;
        }

        if (node.name === "IFS") {
          if (node.args.length < 2 || node.args.length % 2 !== 0) {
            return new FormulaErrorValue("#VALUE?", "Hàm IFS yêu cầu các cặp (điều_kiện, giá_trị)");
          }
          for (let i = 0; i < node.args.length; i += 2) {
            const cond = evalNode(node.args[i]);
            if (cond instanceof FormulaErrorValue) return cond;
            if (toBooleanValue(cond)) {
              return evalNode(node.args[i + 1]);
            }
          }
          return null;
        }

        if (node.name === "AND") {
          if (node.args.length === 0) return new FormulaErrorValue("#VALUE?");
          for (const arg of node.args) {
            const v = evalNode(arg);
            if (v instanceof FormulaErrorValue) return v;
            if (!toBooleanValue(v)) return false;
          }
          return true;
        }

        if (node.name === "OR") {
          if (node.args.length === 0) return new FormulaErrorValue("#VALUE?");
          for (const arg of node.args) {
            const v = evalNode(arg);
            if (v instanceof FormulaErrorValue) return v;
            if (toBooleanValue(v)) return true;
          }
          return false;
        }

        const evaluatedArgs = node.args.map(evalNode);
        return evaluateEagerFunction(node.name, evaluatedArgs);
      }
    }
  }

  try {
    return evalNode(ast);
  } catch (err) {
    if (err instanceof FormulaErrorValue) return err;
    return new FormulaErrorValue("#VALUE?");
  }
}

export function evaluateFormulaExpression(
  expression: string,
  ctx: EvalContext
): FormulaRuntimeValue {
  try {
    const ast = parseFormula(expression);
    return evaluateAst(ast, ctx);
  } catch (err) {
    if (err instanceof FormulaErrorValue) return err;
    return new FormulaErrorValue("#SYNTAX?");
  }
}

export function resolveReferenceToFieldRef(
  raw: string,
  matrixRow: string | undefined,
  questionsById: Map<string, SurveyResultQuestion>
): FieldRef | FormulaErrorValue {
  const key = raw.trim();
  if (key.startsWith("#")) {
    const id = key.slice(1).trim();
    if (id === "submittedAt" || id === "system:submittedAt") return "system:submittedAt";
    if (id === "durationMs" || id === "system:durationMs") return "system:durationMs";
    if (id === "totalScore" || id === "system:totalScore") return "system:totalScore";
    if (id.startsWith("computed:")) return id as FieldRef;

    if (!questionsById.has(id)) {
      return new FormulaErrorValue("#REF!", `Không tìm thấy câu hỏi có mã #${id}`);
    }
    return matrixRow ? (`question:${id}:${matrixRow}` as FieldRef) : (`question:${id}` as FieldRef);
  }

  const lower = key.toLowerCase();
  if (lower === "thời gian nộp" || lower === "submittedat") return "system:submittedAt";
  if (lower === "thời lượng" || lower === "durationms") return "system:durationMs";
  if (lower === "tổng điểm" || lower === "totalscore") return "system:totalScore";

  const matched = resolveQuestionByFormulaRef(key, questionsById.values());
  if (matched) {
    return matrixRow
      ? (`question:${matched.id}:${matrixRow}` as FieldRef)
      : (`question:${matched.id}` as FieldRef);
  }

  return new FormulaErrorValue("#NAME?", `Không tìm thấy câu hỏi [${key}]`);
}

function compareEquality(left: FormulaRuntimeValue, right: FormulaRuntimeValue): boolean {
  const ln = toStrictNumber(left);
  const rn = toStrictNumber(right);
  if (ln !== null && rn !== null && typeof left !== "boolean" && typeof right !== "boolean") {
    return Math.abs(ln - rn) < 1e-9;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return left === right;
  }
  return toTextValue(left).trim().toLowerCase() === toTextValue(right).trim().toLowerCase();
}

function compareOrder(
  left: FormulaRuntimeValue,
  right: FormulaRuntimeValue,
  op: string
): boolean | FormulaErrorValue {
  const ln = toStrictNumber(left);
  const rn = toStrictNumber(right);
  if (ln !== null && rn !== null) {
    if (op === ">") return ln > rn;
    if (op === ">=") return ln >= rn;
    if (op === "<") return ln < rn;
    return ln <= rn;
  }
  const ls = toTextValue(left).toLowerCase();
  const rs = toTextValue(right).toLowerCase();
  if (op === ">") return ls > rs;
  if (op === ">=") return ls >= rs;
  if (op === "<") return ls < rs;
  return ls <= rs;
}
