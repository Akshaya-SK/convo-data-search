// client/src/App.jsx
import React, { useState } from 'react';
import UploadBox from './components/UploadBox';
import DataPreview from './components/DataPreview';
import Chat from './components/Chat';
import ResultPanel from './components/ResultPanel';
import { executePlan } from './lib/execPlan';

function genId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [schema, setSchema] = useState(null);
  const [messages, setMessages] = useState([]); // {id, role, content, status}
  const [result, setResult] = useState(null);
  const [filename, setFilename] = useState('');

  function onData({ rows, schema, filename }) {
    setRows(rows);
    setSchema(schema);
    setFilename(filename);
    setMessages([{ id: genId(), role: 'assistant', content: `Loaded ${filename} — ${rows.length} rows`, status: 'done' }]);
    setResult(null);
  }

  // add a message and return its id
  function onMessage({ role, content }) {
    const id = genId();
    setMessages(prev => [...prev, { id, role, content, status: role === 'user' ? 'pending' : 'done' }]);
    return id;
  }

  // attach assistant response for a given userMessageId
  function onPlan(plan, question, userMessageId) {
    // execute plan locally
    const res = executePlan(plan, rows);

    // mark user message as done and append assistant message
    setMessages(prev => {
      const mapped = prev.map(m => (m.id === userMessageId ? { ...m, status: 'done' } : m));
      // assistant message content: use explanation if available, else textual result
      const assistantContent = plan?.explanation || (res.kind === 'text' ? res.text : (plan?.explanation || 'Here is your result'));
      mapped.push({ id: genId(), role: 'assistant', content: assistantContent, status: 'done' });
      return mapped;
    });

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
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', transition: 'all 160ms ease' }}>
              <div className={`msg ${m.role === 'user' ? 'user' : 'bot'}`} title={m.status === 'pending' ? 'pending...' : 'done'}>
                <div dangerouslySetInnerHTML={{ __html: m.content }} />
                {m.role === 'user' && m.status === 'pending' ? <div className="mini-spinner" style={{ marginLeft: 8, display: 'inline-block' }} /> : null}
              </div>
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
