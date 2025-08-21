// client/src/components/UploadBox.jsx
import React, { useRef } from 'react';
import { parseCSV, inferSchema } from '../lib/csv';

export default function UploadBox({ onData }) {
  const ref = useRef();

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseCSV(file);
    const schema = inferSchema(rows);
    onData({ rows, schema, filename: file.name });
  }

  async function loadSample() {
    // fetch sample file from public
    const res = await fetch('/sample/sales.csv');
    const text = await res.text();
    // convert to a Blob so parseCSV works the same way
    const file = new Blob([text], { type: 'text/csv' });
    const rows = await parseCSV(file);
    const schema = inferSchema(rows);
    onData({ rows, schema, filename: 'sales.csv (sample)' });
  }

  return (
    <div className="uploadBox">
      <label>Upload CSV</label>
      <input ref={ref} type="file" accept=".csv" onChange={onFile} />
      <div style={{ marginTop: 8 }}>
        <button onClick={loadSample} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>Load sample CSV</button>
      </div>
    </div>
  );
}
