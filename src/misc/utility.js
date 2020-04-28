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
  pipe,
  peek,
  pop,
  isPrimitive,
  ObjectlooksLike,
};
