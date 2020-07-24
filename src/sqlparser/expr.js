import {
  literalToData,
  columnRefToData,
  toUpper,
  connector,
} from "../misc/utility";
import { alterExprToData } from "./stmt-alter";
import { aggrToData } from "./stmt-aggregation";
import { assignToData } from "./stmt-assign";
import { binaryToData } from "./stmt-binary";
import { caseToData } from "./stmt-case";
import { castToData, funcToData } from "./fxn";
import { intervalToData } from "./stmt-interval";
import { selectToData } from "./stmt-select";
import { unionToData } from "./stmt-union";

const exprToDataConvertFn = {
  alter: alterExprToData,
  aggr_func: aggrToData,
  assign: assignToData,
  binary_expr: binaryToData,
  case: caseToData,
  cast: castToData,
  column_ref: columnRefToData,
  function: funcToData,
  interval: intervalToData,
};

function varToData(expr) {
  const { prefix = "@", name, members, keyword } = expr;
  const val = [];
  if (keyword) val.push(keyword);
  const varName =
    members && members.length > 0 ? `${name}.${members.join(".")}` : name;
  val.push(`${prefix || ""}${varName}`);
  return val.join(" ");
}

exprToDataConvertFn.var = varToData;

function exprToData(exprOrigin) {
  const expr = exprOrigin;
  if (exprOrigin.ast) {
    const { ast } = expr;
    Reflect.deleteProperty(expr, ast);
    for (const key of Object.keys(ast)) {
      expr[key] = ast[key];
    }
  }
  return exprToDataConvertFn[expr.type]
    ? exprToDataConvertFn[expr.type](expr)
    : literalToData(expr);
}

function unaryToData(expr) {
  const str = `${expr.operator} ${exprToData(expr.expr)}`;
  return expr.parentheses ? `(${str})` : str;
}

function getExprListSQL(exprList) {
  if (!exprList) return [];
  return exprList.map(exprToData);
}

exprToDataConvertFn.expr_list = (expr) => {
  const str = getExprListSQL(expr.value);
  return expr.parentheses ? `(${str})` : str;
};

exprToDataConvertFn.select = (expr) => {
  const str =
    typeof expr._next === "object" ? unionToData(expr) : selectToData(expr);
  return expr.parentheses ? `(${str})` : str;
};

exprToDataConvertFn.unary_expr = unaryToData;

function orderOrPartitionByToData(expr, prefix) {
  if (!Array.isArray(expr)) return "";
  let expressions = [];
  const upperPrefix = toUpper(prefix);
  switch (upperPrefix) {
    case "ORDER BY":
      expressions = expr.map((info) => `${exprToData(info.expr)} ${info.type}`);
      break;
    case "PARTITION BY":
      expressions = expr.map((info) => `${columnRefToData(info.expr)}`);
      break;
    default:
      expressions = expr.map((info) => `${columnRefToData(info.expr)}`);
      break;
  }
  return connector(upperPrefix, expressions.join(", "));
}

export {
  exprToDataConvertFn,
  exprToData,
  getExprListSQL,
  varToData,
  orderOrPartitionByToData,
};
