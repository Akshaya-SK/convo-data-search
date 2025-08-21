// client/src/lib/execPlan.js
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function applyFilters(rows, filters = []) {
  return rows.filter(r => {
    return filters.every(f => {
      const val = r[f.column];
      const target = f.value;
      switch (f.op) {
        case '=': return String(val) === String(target);
        case '>': return toNum(val) > toNum(target);
        case '>=': return toNum(val) >= toNum(target);
        case '<': return toNum(val) < toNum(target);
        case '<=': return toNum(val) <= toNum(target);
        case 'contains': return String(val).toLowerCase().includes(String(target).toLowerCase());
        default: return true;
      }
    });
  });
}

export function groupByAgg(rows, groupBy, metric, agg='sum') {
  const map = new Map();
  for (const r of rows) {
    const key = r[groupBy] ?? 'UNKNOWN';
    const val = metric ? toNum(r[metric]) : 1;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(val);
  }
  const out = [];
  for (const [k, arr] of map) {
    let v = 0;
    if (agg === 'sum') v = arr.reduce((a,b)=>a+b,0);
    else if (agg === 'avg') v = arr.reduce((a,b)=>a+b,0)/arr.length;
    else if (agg === 'count') v = arr.length;
    else if (agg === 'max') v = Math.max(...arr);
    else if (agg === 'min') v = Math.min(...arr);
    out.push({ [groupBy]: k, [metric || 'value']: v });
  }
  return out;
}

export function topK(rows, k=5, byKey) {
  const copy = [...rows];
  copy.sort((a,b)=> (Number(b[byKey])||0) - (Number(a[byKey])||0));
  return copy.slice(0,k);
}

export function executePlan(plan, rows) {
  const intent = plan?.intent || 'summarize';
  const filtered = applyFilters(rows, plan?.filters || []);

  if (intent === 'summarize') {
    return { kind: 'text', text: `Rows: ${rows.length}. Columns: ${Object.keys(rows[0]||{}).join(', ')}` };
  }

  if (intent === 'aggregate' && plan.groupBy && plan.metric) {
    const data = groupByAgg(filtered, plan.groupBy, plan.metric, plan.agg || 'sum');
    return { kind: plan.chart !== 'none' ? 'chart' : 'table', data, x: plan.groupBy, y: plan.metric };
  }

  if (intent === 'aggregate' && plan.agg === 'count') {
    return { kind: 'text', text: `Row count: ${filtered.length}` };
  }

  if (intent === 'topk' && plan.groupBy && plan.metric) {
    const agg = groupByAgg(filtered, plan.groupBy, plan.metric, plan.agg || 'sum');
    const data = topK(agg, plan.k || 5, plan.metric);
    return { kind: plan.chart !== 'none' ? 'chart' : 'table', data, x: plan.groupBy, y: plan.metric };
  }

  if (intent === 'filter') {
    const show = plan.select?.length ? plan.select : Object.keys(filtered[0]||{});
    const data = filtered.map(r => Object.fromEntries(show.map(k => [k, r[k]])));
    return { kind: 'table', data };
  }

  return { kind: 'text', text: 'No result.' };
}
