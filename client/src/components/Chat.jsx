// client/src/components/Chat.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function Chat({ schema, onPlan, onMessage }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const lastQRef = useRef(null);

  // Safe ask: returns early if there's already a pending request for same query
  async function ask(question) {
    if (!question || !schema) return;
    // prevent duplicate rapid submissions
    if (loading) return;
    if (lastQRef.current && lastQRef.current.text === question && Date.now() - lastQRef.current.ts < 3000) {
      // similar query in last 3s — ignore duplicate
      return;
    }

    // register user message and get id
    const userMessageId = onMessage({ role: 'user', content: question });

    setLoading(true);
    lastQRef.current = { text: question, ts: Date.now() };

    try {
      const payload = { schema, question };
      const res = await axios.post('http://localhost:3000/api/plan', payload, { timeout: 20000 });
      // response contains plan in res.data.plan
      onPlan(res.data.plan, question, userMessageId);
    } catch (err) {
      // fallback plan (robust offline fallback)
      const low = question.toLowerCase();
      const fallback =
        (low.includes('top') && { intent:'topk', groupBy:'Product', metric:'Revenue', agg:'sum', k:5, chart:'bar', explanation:'Top 5 by Revenue' })
        || (low.includes('region') && { intent:'aggregate', groupBy:'Region', metric:'Revenue', agg:'sum', chart:'pie', explanation:'Revenue by Region' })
        || (low.includes('average') && { intent:'aggregate', metric:'Revenue', agg:'avg', chart:'none', explanation:'Average revenue' })
        || { intent:'summarize', chart:'none', explanation:'Dataset summary' };

      onPlan(fallback, question, userMessageId);
    } finally {
      setLoading(false);
      setQ('');
    }
  }

  // handle Enter key in textbox — prevent double submission by checking loading
  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(q.trim());
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="inputRow" role="group" aria-label="ask">
        <input
          type="text"
          placeholder="Ask e.g. Top 5 products by revenue"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!schema || loading}
        />
        <button onClick={() => ask(q.trim())} disabled={!schema || loading}>
          {loading ? 'Processing…' : 'Ask'}
        </button>
      </div>

      <div className="chips" style={{ marginTop: 8 }}>
        {['Top 5 products by revenue','Average revenue','Revenue by region as pie','Count rows','Filter only APAC'].map((t,i)=>(
          <div key={i} className="chip" onClick={()=>ask(t)}>{t}</div>
        ))}
      </div>
    </div>
  );
}
