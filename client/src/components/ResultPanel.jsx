// client/src/components/ResultPanel.jsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function ResultPanel({ result, title }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!result || result.kind !== 'chart') return;
    const ctx = canvasRef.current.getContext('2d');
    const labels = result.data.map(d => d[result.x]);
    const values = result.data.map(d => d[result.y] ?? d.value);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: title || 'Result', data: values }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return () => chart.destroy();
  }, [result, title]);

  if (!result) return null;
  if (result.kind === 'text') return <div style={{ padding: 8 }}>{result.text}</div>;
  if (result.kind === 'table') {
    const cols = Object.keys(result.data[0] || {});
    return (
      <div>
        <table className="table">
          <thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {result.data.map((r,i)=><tr key={i}>{cols.map(c=><td key={c}>{String(r[c])}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    );
  }
  if (result.kind === 'chart') {
    return (
      <div style={{ height: 360 }}>
        <canvas ref={canvasRef} />
      </div>
    );
  }
  return null;
}
