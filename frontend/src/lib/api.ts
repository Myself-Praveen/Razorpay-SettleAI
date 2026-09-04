const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(extraHeaders: any = {}) {
  const apiKey = process.env.NEXT_PUBLIC_SETTLEAI_API_KEY || "settleai_hackathon_secret";
  return {
    "X-API-Key": apiKey,
    ...extraHeaders
  };
}

export async function generateData(count: number = 200, adversarial: boolean = true) {
  const resp = await fetch(`${API_BASE}/api/generate-data`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mode: "synthetic", record_count: count, include_adversarial: adversarial }),
  });
  return resp.json();
}

export async function reconcile(): Promise<any> {
  const resp = await fetch(`${API_BASE}/api/reconcile`, { method: "POST", headers: getAuthHeaders() });
  const reader = resp.body?.getReader();
  const decoder = new TextDecoder();
  const events: any[] = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split("\n").filter(Boolean)) {
        try { events.push(JSON.parse(line)); } catch {}
      }
    }
  }
  return events;
}

export async function getReport() {
  const resp = await fetch(`${API_BASE}/api/reconciliation-report`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getMatches() {
  const resp = await fetch(`${API_BASE}/api/matches`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getExceptions() {
  const resp = await fetch(`${API_BASE}/api/exceptions`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getDebates() {
  const resp = await fetch(`${API_BASE}/api/debates`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function qaQuery(question: string) {
  const resp = await fetch(`${API_BASE}/api/qa`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ question }),
  });
  return resp.json();
}

export async function getForecast(days: number = 7) {
  const resp = await fetch(`${API_BASE}/api/forecast?days=${days}`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getMetrics() {
  const resp = await fetch(`${API_BASE}/api/metrics`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getTrace(recordId: string) {
  const resp = await fetch(`${API_BASE}/api/trace/${recordId}`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getTraces() {
  const resp = await fetch(`${API_BASE}/api/observability/traces`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function resolveException(id: string, action: string, text: string) {
  const resp = await fetch(`${API_BASE}/api/exceptions/${id}/resolve`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ exception_id: id, action, resolution_text: text }),
  });
  return resp.json();
}

export async function getAdversarialResults() {
  const resp = await fetch(`${API_BASE}/api/adversarial/results`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getSqlAudit() {
  const resp = await fetch(`${API_BASE}/api/sql-audit`, { headers: getAuthHeaders() });
  return resp.json();
}

export async function getHealth() {
  const resp = await fetch(`${API_BASE}/api/health`, { headers: getAuthHeaders() });
  return resp.json();
}

export function connectMcpTerminal(onMessage: (data: any) => void) {
  const wsUrl = API_BASE.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsUrl}/ws/mcp-terminal`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
