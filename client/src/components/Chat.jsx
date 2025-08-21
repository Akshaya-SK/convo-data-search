// client/src/components/Chat.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function Chat({ schema, onPlan, onMessage }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(question) {
    if (!question) return;
    onMessage({ role: 'user', content: question });
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:3000/api/plan', { schema, question });
      onPlan(data.plan, question);
    } catch {
      // fallback simple plans
      const simple = (question.toLowerCase().includes('top') && { intent:'topk', groupBy:'Product', metric:'Revenue', agg:'sum', k:5, chart:'bar', explanation:'Top 5 by Revenue' })
        || (question.toLowerCase().includes('region') && { intent:'aggregate', groupBy:'Region', metric:'Revenue', agg:'sum', chart:'pie', explanation:'Revenue by Region' })
        || (question.toLowerCase().includes('average') && { intent:'aggregate', metric:'Revenue', agg:'avg', chart:'none', explanation:'Average revenue' })
        || { intent:'summarize', chart:'none', explanation:'Dataset summary' };
      onPlan(simple, question);
    } finally {
      setLoading(false);
      setQ('');
    }
  }

  return (
    <>
      <div className="inputRow">
        <input
          type="text"
          placeholder="Ask e.g. Top 5 products by revenue"
          value={q}
          onChange={e=>setQ(e.target.value)}
          disabled={!schema || loading}
        />
        <button onClick={()=>ask(q)} disabled={!schema || loading}>Ask</button>
      </div>
      <div className="chips">
        {['Top 5 products by revenue','Average revenue','Revenue by region as pie','Count rows','Filter only APAC'].map((t,i)=>(
          <div key={i} className="chip" onClick={()=>ask(t)}>{t}</div>
        ))}
      </div>
    </>
  );
}
