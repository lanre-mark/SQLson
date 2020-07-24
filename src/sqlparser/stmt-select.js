import { exprToData, getExprListSQL, orderOrPartitionByToData } from "./expr";
import { columnsToData } from "./column";
import { withToData } from "./stmt-with";
import { tablesToData } from "./tables";
import {
  hasVal,
  commonOptionConnector,
  connector,
  topToData,
} from "../misc/utility";

/**
 * @param {Object}      stmt
 * @param {?Array}      stmt.with
 * @param {?Array}      stmt.options
 * @param {?string}     stmt.distinct
 * @param {?Array|string}   stmt.columns
 * @param {?Array}      stmt.from
 * @param {?Object}     stmt.where
 * @param {?Array}      stmt.groupby
 * @param {?Object}     stmt.having
 * @param {?Array}      stmt.orderby
 * @param {?Array}      stmt.limit
 * @return {string}
 */

function selectToData(stmt) {
  const {
    with: withInfo,
    options,
    distinct,
    columns,
    from,
    where,
    groupby,
    having,
    orderby,
    limit,
    top,
  } = stmt;
  const clauses = [withToData(withInfo), "SELECT"];
  clauses.push(topToData(top));
  if (Array.isArray(options)) clauses.push(options.join(" "));
  clauses.push(distinct, columnsToData(columns, from));
  // FROM + joins
  clauses.push(commonOptionConnector("FROM", tablesToData, from));
  clauses.push(commonOptionConnector("WHERE", exprToData, where));
  clauses.push(connector("GROUP BY", getExprListSQL(groupby).join(", ")));
  clauses.push(commonOptionConnector("HAVING", exprToData, having));
  clauses.push(orderOrPartitionByToData(orderby, "order by"));
  if (limit) {
    const { seperator, value } = limit;
    clauses.push(
      connector(
        "LIMIT",
        value
          .map(exprToData)
          .join(
            `${seperator === "offset" ? " " : ""}${seperator.toUpperCase()} `
          )
      )
    );
  }
  return clauses.filter(hasVal).join(" ");
}

export { selectToData };
