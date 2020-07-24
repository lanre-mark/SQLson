import { exprToData } from "./expr";
import { hasVal } from "../misc/utility";
import { overToData } from "./over";

function castToData(expr) {
  const { target, expr: expression, symbol } = expr;
  const { length, dataType, parentheses, scale } = target;
  let str = "";
  if (length) {
    str = scale ? `${length}, ${scale}` : length;
  }
  if (parentheses) str = `(${str})`;
  let prefix = exprToData(expression);
  let symbolChar = "::";
  let suffix = "";
  if (symbol === "as") {
    prefix = `CAST(${prefix}`;
    suffix = ")";
    symbolChar = ` ${symbol.toUpperCase()} `;
  }
  return `${prefix}${symbolChar}${dataType}${str}${suffix}`;
}

function funcToData(expr) {
  const { args, name } = expr;
  if (!args) return name;
  const { parentheses, over } = expr;
  const str = `${name}(${exprToData(args).join(", ")})`;
  const overStr = overToData(over);
  return [parentheses ? `(${str})` : str, overStr].filter(hasVal).join(" ");
}

export { castToData, funcToData };
