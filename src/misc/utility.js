const escapeMap = {
  "\0": "\\0",
  "'": "\\'",
  '"': '\\"',
  "\b": "\\b",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\x1a": "\\Z",
  // '\\'   : '\\\\',
};

const DEFAULT_OPT = { database: "", type: "table" };

let parserOpt = DEFAULT_OPT;

function commonOptionConnector(keyword, action, opt) {
  if (!opt) return;
  if (!keyword) return action(opt);
  return `${keyword.toUpperCase()} ${action(opt)}`;
}

function connector(keyword, str) {
  if (!str) return;
  return `${keyword.toUpperCase()} ${str}`;
}

/**
 * @param {(Array|boolean|string|number|null)} value
 * @return {Object}
 */
function createValueExpr(value) {
  const type = typeof value;
  if (Array.isArray(value))
    return { type: "expr_list", value: value.map(createValueExpr) };
  if (value === null) return { type: "null", value: null };
  switch (type) {
    case "boolean":
      return { type: "bool", value };
    case "string":
      return { type: "string", value };
    case "number":
      return { type: "number", value };
    default:
      throw new Error(`Cannot convert value "${type}" to SQL`);
  }
}

/**
 * @param operator
 * @param left
 * @param right
 * @return {Object}
 */
function createBinaryExpr(operator, left, right) {
  const expr = { operator, type: "binary_expr" };
  expr.left = left.type ? left : createValueExpr(left);
  if (operator === "BETWEEN" || operator === "NOT BETWEEN") {
    expr.right = {
      type: "expr_list",
      value: [createValueExpr(right[0]), createValueExpr(right[1])],
    };
    return expr;
  }
  expr.right = right.type ? right : createValueExpr(right);
  return expr;
}

/**
 * Replace param expressions
 *
 * @param {Object} ast    - AST object
 * @param {Object} keys   - Keys = parameter names, values = parameter values
 * @return {Object}     - Newly created AST object
 */
function replaceParamsInner(ast, keys) {
  Object.keys(ast)
    .filter((key) => {
      const value = ast[key];
      return (
        Array.isArray(value) || (typeof value === "object" && value !== null)
      );
    })
    .forEach((key) => {
      const expr = ast[key];
      if (!(typeof expr === "object" && expr.type === "param"))
        return replaceParamsInner(expr, keys);
      if (typeof keys[expr.value] === "undefined")
        throw new Error(`no value for parameter :${expr.value} found`);
      ast[key] = createValueExpr(keys[expr.value]);
      return null;
    });

  return ast;
}

function escape(str) {
  const res = [];
  for (let i = 0, len = str.length; i < len; ++i) {
    let char = str[i];
    const escaped = escapeMap[char];
    if (escaped) char = escaped;
    res.push(char);
  }
  return res.join("");
}

function getParserOpt() {
  return parserOpt;
}

function setParserOpt(opt) {
  parserOpt = opt;
}

function topToData(opt) {
  if (!opt) return;
  const { value, percent } = opt;
  const prefix = `TOP ${value}`;
  if (!percent) return prefix;
  return `${prefix} ${percent.toUpperCase()}`;
}

function identifierToData(ident, isDual) {
  const { database } = getParserOpt();
  if (isDual === true) return `'${ident}'`;
  if (!ident) return;
  switch (database && database.toLowerCase()) {
    case "mysql":
    case "mariadb":
      return `\`${ident}\``;
    case "postgresql":
      return `"${ident}"`;
    case "transactsql":
      return `[${ident}]`;
    default:
      return `\`${ident}\``;
  }
}

function literalToData(literal) {
  const { type, parentheses, value } = literal;
  let str = value;
  switch (type) {
    case "string":
      str = `'${escape(value)}'`;
      break;
    case "single_quote_string":
      str = `'${value}'`;
      break;
    case "boolean":
    case "bool":
      str = value ? "TRUE" : "FALSE";
      break;
    case "null":
      str = "NULL";
      break;
    case "star":
      str = "*";
      break;
    case "param":
      str = `:${value}`;
      break;
    case "origin":
      str = value.toUpperCase();
      break;
    case "time":
    case "date":
    case "timestamp":
      str = `${type.toUpperCase()} '${value}'`;
      break;
    default:
      break;
  }
  return parentheses ? `(${str})` : str;
}

function replaceParams(ast, params) {
  return replaceParamsInner(JSON.parse(JSON.stringify(ast)), params);
}

function commonTypeValue(opt) {
  const result = [];
  if (!opt) return result;
  const { type, value } = opt;
  result.push(type.toUpperCase());
  result.push(value.toUpperCase());
  return result;
}

function columnRefToData(expr) {
  const { arrow, collate, column, isDual, table, parentheses, property } = expr;
  let str = column === "*" ? "*" : identifierToSql(column, isDual);
  if (table) str = `${identifierToSql(table)}.${str}`;
  if (arrow) str += ` ${arrow} ${literalToSQL(property)}`;
  if (collate) str += ` ${commonTypeValue(collate).join(" ")}`;
  return parentheses ? `(${str})` : str;
}

function toUpper(val) {
  if (!val) return;
  return val.toUpperCase();
}

function hasVal(val) {
  return val;
}

function commentToData(comment) {
  if (!comment) return;
  const result = [];
  const { keyword, symbol, value } = comment;
  result.push(keyword.toUpperCase());
  if (symbol) result.push(symbol);
  result.push(literalToSQL(value));
  return result.join(" ");
}

function triggerEventToData(events) {
  return events
    .map((event) => {
      const { keyword: kw, args } = event;
      const result = [toUpper(kw)];
      if (args) {
        const { keyword: kwArgs, columns } = args;
        result.push(toUpper(kwArgs), columns.map(columnRefToSQL).join(", "));
      }
      return result.join(" ");
    })
    .join(" OR ");
}

function returningToData(returning) {
  if (!returning) return "";
  const { columns } = returning;
  return [
    "RETURNING",
    columns.map(columnRefToSQL).filter(hasVal).join(", "),
  ].join(" ");
}

function commonKeywordArgsToData(kwArgs) {
  if (!kwArgs) return [];
  return [toUpper(kwArgs.keyword), toUpper(kwArgs.args)];
}

const pipe = (...funcs) => (value) =>
  funcs.reduce((value, func) => func(value), value);

function peek(array) {
  return array[0];
}

function pop(array) {
  return array.shift();
}

function ObjectlooksLike(a, b) {
  return (
    a &&
    b &&
    Object.keys(b).every((bKey) => {
      const bVal = b[bKey];
      const aVal = a[bKey];
      if (typeof bVal === "function") {
        return bVal(aVal);
      }
      return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
    })
  );
}

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val);
}

module.exports = {
  commonKeywordArgsToData,
  commonOptionConnector,
  connector,
  commonTypeValue,
  columnRefToData,
  commentToData,
  createBinaryExpr,
  createValueExpr,
  DEFAULT_OPT,
  escape,
  literalToData,
  identifierToData,
  replaceParams,
  returningToData,
  hasVal,
  setParserOpt,
  toUpper,
  topToData,
  triggerEventToData,
  pipe,
  peek,
  pop,
  isPrimitive,
  ObjectlooksLike,
};
