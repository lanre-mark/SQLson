import {
  literalToData,
  identifierToData,
  toUpper,
  hasVal,
  commentToData,
} from "../misc/utility";

function indexTypeToData(indexType) {
  if (!indexType) return;
  const { keyword, type } = indexType;
  return `${keyword.toUpperCase()} ${type.toUpperCase()}`;
}

function indexOptionToData(indexOpt) {
  if (!indexOpt) return;
  const { type, expr, symbol } = indexOpt;
  const upperType = type.toUpperCase();
  const indexOptArray = [];
  indexOptArray.push(upperType);
  switch (upperType) {
    case "KEY_BLOCK_SIZE":
      if (symbol) indexOptArray.push(symbol);
      indexOptArray.push(literalToData(expr));
      break;
    case "BTREE":
    case "HASH":
      indexOptArray.length = 0;
      indexOptArray.push(indexTypeToData(indexOpt));
      break;
    case "WITH PARSER":
      indexOptArray.push(expr);
      break;
    case "VISIBLE":
    case "INVISIBLE":
      break;
    case "COMMENT":
      indexOptArray.shift();
      indexOptArray.push(commentToData(indexOpt));
      break;
    default:
      break;
  }
  return indexOptArray.join(" ");
}

function indexTypeAndOptionToData(indexDefinition) {
  const {
    index_type: indexType,
    index_options: indexOptions = [],
    definition,
  } = indexDefinition;
  const dataType = [];
  dataType.push(indexTypeToData(indexType));
  if (definition && definition.length)
    dataType.push(
      `(${definition.map((col) => identifierToData(col)).join(", ")})`
    );
  dataType.push(indexOptions && indexOptions.map(indexOptionToData).join(" "));
  return dataType;
}

function indexDefinitionToData(indexDefinition) {
  const indexSQL = [];
  const { keyword, index } = indexDefinition;
  indexSQL.push(toUpper(keyword));
  indexSQL.push(index);
  indexSQL.push(...indexTypeAndOptionToData(indexDefinition));
  return indexSQL.filter(hasVal).join(" ");
}

export {
  indexDefinitionToData,
  indexTypeToData,
  indexOptionToData,
  indexTypeAndOptionToData,
};
