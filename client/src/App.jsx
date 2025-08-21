// client/src/App.jsx
import React, { useState } from 'react';
import UploadBox from './components/UploadBox';
import DataPreview from './components/DataPreview';
import Chat from './components/Chat';
import ResultPanel from './components/ResultPanel';
import { executePlan } from './lib/execPlan';

export default function App() {
  const [rows, setRows] = useState([]);
  const [schema, setSchema] = useState(null);
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [filename, setFilename] = useState('');

  function onData({ rows, schema, filename }) {
    setRows(rows);
    setSchema(schema);
    setFilename(filename);
    setMessages([]);
    setResult(null);
    setMessages([{ role: 'assistant', content: `Loaded ${filename} — ${rows.length} rows` }]);
  }

  function onMessage(m) { setMessages(prev => [...prev, m]); }

  function onPlan(plan, question) {
    const res = executePlan(plan, rows);
    setMessages(prev => [...prev, { role: 'assistant', content: plan.explanation || 'Result' }]);
    setResult(res);
  }

  return (
    <div className="app">
      <div className="panel">
        <div className="header">
          <img className="logo" src="/assets/logo.svg" alt="logo" />
          <h1 className="h1">Conversational Data Search</h1>
        </div>

        <UploadBox onData={onData} />

        <div style={{ marginTop: 12 }}>
          <div className="preview">{filename ? `Loaded: ${filename}` : 'No file loaded'}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }} className={`msg ${m.role === 'user' ? 'user' : 'bot'}`} >
              <div dangerouslySetInnerHTML={{ __html: m.content }} />
            </div>
          ))}
        </div>

        <Chat schema={schema} onPlan={onPlan} onMessage={onMessage} />
      </div>

      <div className="panel">
        {rows?.length ? <DataPreview rows={rows} /> : <div className="preview">Upload a CSV to begin.</div>}
        <div className="resultPanel">
          <ResultPanel result={result} title="Analysis" />
        </div>
      </div>
    </div>
  );
}
