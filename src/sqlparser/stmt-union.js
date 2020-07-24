import { createToData } from "./stmt-create";
import { alterToData } from "./stmt-alter";
import { selectToData } from "./stmt-select";
import { deleteToData } from "./stmt-delete";
import { updateToData } from "./stmt-update";
import { insertToData } from "./stmt-insert";
import {
  dropToData,
  truncateToData,
  useToData,
  renameToData,
  callToData,
  setVarToData,
  lockUnlockToData,
} from "./command";

const typeToSQLFn = {
  alter: alterToData,
  create: createToData,
  select: selectToData,
  delete: deleteToData,
  update: updateToData,
  insert: insertToData,
  drop: dropToData,
  truncate: truncateToData,
  use: useToData,
  rename: renameToData,
  call: callToData,
  set: setVarToData,
  lock: lockUnlockToData,
  unlock: lockUnlockToData,
};

function unionToData(stmt) {
  const fun = typeToSQLFn[stmt.type];
  const res = [fun(stmt)];
  while (stmt._next) {
    const unionKeyword = (stmt.union || "union").toUpperCase();
    res.push(unionKeyword, fun(stmt._next));
    stmt = stmt._next;
  }
  return res.join(" ");
}

function multipleToData(stmt) {
  const res = [];
  for (let i = 0, len = stmt.length; i < len; ++i) {
    let astInfo = stmt[i] && stmt[i].ast;
    if (!astInfo) astInfo = stmt[i];
    res.push(unionToData(astInfo));
  }
  return res.join(" ; ");
}

export { unionToData, multipleToData };
