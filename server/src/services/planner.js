// server/src/services/planner.js
import OpenAI from "openai";

const hasKey = !!process.env.OPENAI_API_KEY;
const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/* Helpers */
function normalize(s = "") {
  return String(s || "")
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function tokens(q = "") {
  const stop = new Set([
    "the", "a", "an", "by", "of", "to", "for", "in", "on", "at", "with", "show",
    "list", "records", "rows", "give", "me", "how", "many", "and", "or"
  ]);
  return normalize(q)
    .split(/\s+/)
    .filter(t => t && !stop.has(t));
}

function findColumnByKeywords(cols = [], regex) {
  return cols.find(c => regex.test(normalize(c)));
}

function pickFilterColumn(nonNumericCols = []) {
  if (!nonNumericCols || nonNumericCols.length === 0) return null;
  const priority = [
    /dept|department|major|role|position|team|category|type|class|subject|course|branch|group|title|title_name/,
    /name|full_name|student|employee|person/,
    /city|state|country|region/
  ];
  for (const p of priority) {
    const found = nonNumericCols.find(c => p.test(normalize(c)));
    if (found) return found;
  }
  return nonNumericCols[0];
}

/* Main rule-based planner (more robust) */
function ruleBased(schema, question = "", numericColumns = []) {
  const q = normalize(question);
  const cols = (schema?.columns || []).map(c => c.name);
  const colsNorm = cols.map(c => normalize(c));
  const nonNumericCols = cols.filter(c => !numericColumns.includes(c));

  const plan = {
    intent: "summarize",
    chart: "none",
    explanation: "Dataset summary"
  };

  // tokens and simple checks
  const tks = tokens(question);

  // COUNT
  if (/\b(count|how many|number of)\b/.test(q)) {
    plan.intent = "aggregate";
    plan.agg = "count";
    plan.chart = "none";
    plan.explanation = "Count rows";
    return plan;
  }

  // AGGREGATES: AVERAGE, SUM
  if (/\b(avg|average|mean)\b/.test(q)) {
    plan.intent = "aggregate";
    plan.agg = "avg";
    plan.metric = numericColumns.find(c => tks.some(token => normalize(c).includes(token))) || numericColumns[0] || cols[0];
    plan.explanation = `Average of ${plan.metric}`;
    return plan;
  }
  if (/\b(sum|total|aggregate)\b/.test(q)) {
    plan.intent = "aggregate";
    plan.agg = "sum";
    plan.metric = numericColumns.find(c => tks.some(token => normalize(c).includes(token))) || numericColumns[0] || cols[0];
    plan.explanation = `Sum of ${plan.metric}`;
    return plan;
  }

  // TOP / BOTTOM / HIGHEST / LOWEST
  if (/\b(top|highest|largest|most|max|min|lowest|least|smallest|bottom)\b/.test(q)) {
    plan.intent = "topk";
    // find k
    const kMatch = question.match(/top\s*(\d+)|(\d+)\s*(top|highest|bottom|lowest)/i);
    if (kMatch) {
      const k = kMatch[1] || kMatch[2];
      plan.k = parseInt(k, 10);
    } else {
      // default k: 1 for "lowest" or "highest" when singular words like "lowest salary" likely want 1
      plan.k = /\b(lowest|least|smallest|bottom)\b/.test(q) ? 1 : 5;
    }

    // metric mapping: prefer numericColumns that match tokens, else common keywords
    plan.metric = numericColumns.find(c => tks.some(token => normalize(c).includes(token)))
      || findColumnByKeywords(numericColumns, /revenue|sales|price|amount|value|units|score|marks|salary|income|age|count|total/i)
      || numericColumns[0]
      || cols[0];

    // groupBy: prefer a non-numeric column that matches tokens, else a heuristic
    plan.groupBy = nonNumericCols.find(c => tks.some(token => normalize(c).includes(token)))
      || pickFilterColumn(nonNumericCols)
      || cols[0];

    // ascending or descending
    if (/\b(lowest|least|smallest|min|bottom)\b/.test(q)) plan.agg = "min";
    else plan.agg = "max";

    plan.chart = "bar";
    plan.explanation = `${/\b(lowest|least|smallest|min|bottom)\b/.test(q) ? "Bottom" : "Top"} ${plan.k} by ${plan.metric}`;
    return plan;
  }

  // FILTER (value-based)
  if (/\b(filter|where|only|in|for|with)\b/.test(q)) {
    // try to extract value after keywords like "filter", "where", "in", "for", "only"
    let value = null;
    const extract = question.match(/\b(?:filter|where|only|in|for|with)\b\s+(?:the\s+)?([\w\s\-&]+)/i);
    if (extract) {
      value = extract[1].trim().split(/\s+by\b|\s+where\b|\s+for\b/)[0].trim();
    }
    // fallback: pick the longest token that isn't a column name
    if (!value) {
      const candidate = tks.slice().reverse().find(tok => !colsNorm.some(cn => cn.includes(tok)));
      if (candidate) value = candidate;
    }

    if (value) {
      const filterColumn = pickFilterColumn(nonNumericCols) || cols[0];
      plan.intent = "filter";
      plan.filters = [{ column: filterColumn, op: "contains", value }];
      plan.select = cols.slice(0, 6);
      plan.chart = "none";
      plan.explanation = `Filter where ${filterColumn} contains '${value}'`;
      return plan;
    }
  }

  // fallback: if schemas include a clear numeric column and user question contains its name, give an aggregate
  if (numericColumns.length > 0 && tks.some(tok => numericColumns.some(c => normalize(c).includes(tok)))) {
    plan.intent = "aggregate";
    plan.metric = numericColumns.find(c => tks.some(token => normalize(c).includes(token))) || numericColumns[0];
    plan.agg = "avg";
    plan.explanation = `Average of ${plan.metric}`;
    return plan;
  }

  return plan;
}

/* buildPlan: prefer rule-based first, fallback to LLM only if rule-based returns 'summarize' */
export async function buildPlan(schema, question, numericColumns = []) {
  // Run deterministic rule-based planner first
  try {
    const rulePlan = ruleBased(schema, question, numericColumns || []);
    // If rulePlan found an intent other than summarize, return immediately
    if (rulePlan && rulePlan.intent && rulePlan.intent !== "summarize") {
      console.debug("[planner] rule-based plan used:", JSON.stringify(rulePlan));
      return rulePlan;
    }
  } catch (e) {
    console.warn("[planner] rule-based planner failed, continuing to LLM fallback", e);
  }

  // If no API key or LLM not available, return rulePlan (summary) above
  if (!hasKey) {
    console.debug("[planner] no OPENAI key, returning rule-based summary");
    return ruleBased(schema, question, numericColumns || []);
  }

  // LLM fallback for complex queries (only runs when rule-based produced summary)
  const sys = `
You are a data assistant. Output exactly one JSON object (no surrounding text) that is a plan the frontend can execute.
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

Map user terms to schema column names. Use the provided "Numeric columns" to pick metrics.
`;
  const user = `Schema columns: ${schema?.columns?.map(c => `${c.name}(${c.type})`).join(", ")}
Numeric columns: ${numericColumns.join(", ")}
Question: "${question}"`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ],
      temperature: 0.25
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    // extract JSON object substring
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : raw;
    try {
      const parsed = JSON.parse(jsonText);
      console.debug("[planner] llm plan used:", JSON.stringify(parsed));
      return parsed;
    } catch (e) {
      console.warn("[planner] LLM returned invalid JSON, falling back to rule-based", e);
      return ruleBased(schema, question, numericColumns || []);
    }
  } catch (err) {
    console.error("[planner] OpenAI request failed, falling back to rule-based", err);
    return ruleBased(schema, question, numericColumns || []);
  }
}
