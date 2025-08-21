// client/src/components/DataPreview.jsx
import React from 'react';

export default function DataPreview({ rows }) {
  if (!rows?.length) return null;
  const cols = Object.keys(rows[0]);
  const view = rows.slice(0, 20);
  return (
    <div>
      <div className="preview">Preview (first 20 rows)</div>
      <table className="table">
        <thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {view.map((r,i)=>(
            <tr key={i}>{cols.map(c=><td key={c}>{String(r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
