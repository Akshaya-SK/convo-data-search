// client/src/lib/csv.js
import Papa from 'papaparse';

export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: res => resolve(res.data),
      error: err => reject(err)
    });
  });
}

export function inferSchema(rows) {
  if (!rows?.length) return { columns: [] };
  const keys = Object.keys(rows[0] || {});
  const columns = keys.map(k => {
    const sample = rows.find(r => r[k] !== null && r[k] !== undefined && r[k] !== '');
    const v = sample?.[k];
    const t = typeof v === 'number' ? 'number' : (/\d{4}-\d{2}-\d{2}/.test(String(v)) ? 'date' : 'string');
    return { name: k, type: t };
  });
  return { columns };
}
