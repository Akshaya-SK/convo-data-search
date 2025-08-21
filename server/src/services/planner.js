// server/src/services/planner.js
import OpenAI from 'openai';

const hasKey = !!process.env.OPENAI_API_KEY;
const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Plan type the frontend can execute:
 * {
 *  intent: "aggregate"|"topk"|"filter"|"summarize",
 *  groupBy?: string,
 *  metric?: string,
 *  agg?: "sum"|"avg"|"count"|"max"|"min",
 *  k?: number,
 *  filters?: [{column,op,value}],
 *  select?: string[],
 *  chart?: "bar"|"line"|"pie"|"none",
 *  explanation?: string
 * }
 */

function ruleBased(schema, question) {
  const q = (question || '').toLowerCase();
  const cols = (schema?.columns || []).map(c => c.name);
  const colsLower = cols.map(c => c.toLowerCase());

  const plan = {
    intent: 'summarize',
    chart: 'none',
    explanation: 'Dataset summary'
  };

  if (q.includes('top') && q.includes('product')) {
    plan.intent = 'topk';
    plan.groupBy = cols.find(c => /product/i.test(c)) || cols[0];
    plan.metric = cols.find(c => /revenue|price|units/i.test(c)) || cols.find(c => /revenue/i.test(c)) || cols[0];
    plan.agg = 'sum';
    plan.k = parseInt((q.match(/top\s+(\d+)/) || [])[1] || '5', 10);
    plan.chart = 'bar';
    plan.explanation = `Top ${plan.k} by ${plan.metric}`;
    return plan;
  }

  if (q.includes('average') || q.includes('avg') || q.includes('mean')) {
    plan.intent = 'aggregate';
    plan.metric = cols.find(c => /revenue|price|units|salary/i.test(c)) || cols[0];
    plan.agg = 'avg';
    plan.chart = 'none';
    plan.explanation = `Average of ${plan.metric}`;
    return plan;
  }

  if (q.includes('count')) {
    plan.intent = 'aggregate';
    plan.agg = 'count';
    plan.chart = 'none';
    plan.explanation = 'Count rows';
    return plan;
  }

  if (q.includes('region')) {
    plan.intent = 'aggregate';
    plan.groupBy = cols.find(c => /region/i.test(c)) || cols[0];
    plan.metric = cols.find(c => /revenue|units|price/i.test(c)) || cols[0];
    plan.agg = 'sum';
    plan.chart = 'pie';
    plan.explanation = `Sum ${plan.metric} by ${plan.groupBy}`;
    return plan;
  }

  // If user asks "filter" pattern like "filter only APAC"
  if (q.includes('filter') || q.includes('only')) {
    const regionCol = cols.find(c => /region/i.test(c));
    const match = q.match(/\b(apac|emea|amer|americas|america|north|south|asia|europe)\b/);
    if (regionCol && match) {
      plan.intent = 'filter';
      plan.filters = [{ column: regionCol, op: 'contains', value: match[1] }];
      plan.select = cols.slice(0, 6);
      plan.chart = 'none';
      plan.explanation = `Filter where ${regionCol} contains '${match[1]}'`;
      return plan;
    }
  }

  return plan;
}

export async function buildPlan(schema, question) {
  if (!hasKey) return ruleBased(schema, question);

  // System prompt: instruct LLM to output JSON only
  const sys = `
You are to generate a single JSON object (no surrounding text) that is a Plan the frontend can execute.
Do not analyze or access the CSV data.
Fields:
intent: "aggregate"|"topk"|"filter"|"summarize"
groupBy?: string
metric?: string
agg?: "sum"|"avg"|"count"|"max"|"min"
k?: number
filters?: [{column:string,op:"="|">"|">="|"<"|"<="|"contains",value:any}]
select?: string[]
chart?: "bar"|"line"|"pie"|"none"
explanation?: string

Output valid JSON only.
`;

  const user = `Schema columns: ${schema?.columns?.map(c => `${c.name}(${c.type})`).join(', ')}
Question: "${question}"`;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ],
      temperature: 0.2
    });

    const json = resp.choices?.[0]?.message?.content?.trim();
    try {
      const parsed = JSON.parse(json);
      return parsed;
    } catch (e) {
      console.warn('LLM returned invalid JSON, falling back to rule-based plan', e);
      return ruleBased(schema, question);
    }
  } catch (err) {
    console.error('OpenAI request failed, falling back to rule-based', err);
    return ruleBased(schema, question);
  }
}
