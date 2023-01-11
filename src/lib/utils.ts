export function namedLog(values: { [name: string]: any }) {
  Object.entries(values).forEach(([n, v]) => console.log(n, v));
}

export function objectContainsKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
) {
  const objKeys = Object.keys(obj);
  return keys.every((k) => objKeys.includes(k.toString()));
}
