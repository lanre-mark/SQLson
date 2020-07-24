import { tablesToData } from "./tables";
import { exprToData } from "./expr";
import {
  identifierToData,
  commonOptionConnector,
  hasVal,
  toUpper,
  returningToData,
} from "../misc/utility";
import { selectToData } from "./stmt-select";

/**
 * @param {Array} values
 * @return {string}
 */
function valuesToData(values) {
  if (values.type === "select") return selectToData(values);
  const clauses = values.map(exprToSQL);
  return `(${clauses.join("),(")})`;
}

function partitionToData(partition) {
  if (!partition) return "";
  const partitionArr = ["PARTITION", "("];
  if (Array.isArray(partition)) {
    partitionArr.push(partition.map(identifierToData).join(", "));
  } else {
    const { value } = partition;
    partitionArr.push(value.map(exprToData).join(", "));
  }
  partitionArr.push(")");
  return partitionArr.filter(hasVal).join("");
}

function insertToData(stmt) {
  const {
    table,
    prefix = "into",
    columns,
    values,
    where,
    partition,
    returning,
  } = stmt;
  const clauses = [
    "INSERT",
    toUpper(prefix),
    tablesToData(table),
    partitionToData(partition),
  ];
  if (Array.isArray(columns))
    clauses.push(`(${columns.map(identifierToData).join(", ")})`);
  clauses.push(
    commonOptionConnector(
      Array.isArray(values) ? "VALUES" : "",
      valuesToData,
      values
    )
  );
  clauses.push(commonOptionConnector("WHERE", exprToSQL, where));
  clauses.push(returningToData(returning));
  return clauses.filter(hasVal).join(" ");
}

export { insertToData };
