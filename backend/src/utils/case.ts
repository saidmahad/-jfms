type Row = Record<string, unknown>;

export function toCamel(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return out;
}

export function toCamelList(rows: Row[]): Row[] {
  return rows.map(toCamel);
}
