import { tablesToData } from "./tables";
import { exprToData } from "./expr";
import {
  hasVal,
  identifierToData,
  commonOptionConnector,
  returningToData,
} from "./util";

/**
 * @param {Array} sets
 * @return {string}
 */
function setToData(sets) {
  if (!sets || sets.length === 0) return "";
  const clauses = [];
  for (const set of sets) {
    let str = "";
    const { table, column, value } = set;
    str = [table, column]
      .filter(hasVal)
      .map((info) => identifierToData(info))
      .join(".");
    if (value) str = `${str} = ${exprToData(value)}`;
    clauses.push(str);
  }
  return clauses.join(", ");
}

function updateToData(stmt) {
  const { table, set, where, returning } = stmt;
  const clauses = [
    "UPDATE",
    tablesToData(table),
    commonOptionConnector("SET", setToData, set),
    commonOptionConnector("WHERE", exprToSQL, where),
    returningToData(returning),
  ];
  return clauses.filter(hasVal).join(" ");
}

export { updateToData };
