const API_BASE = "http://localhost:8000";

export async function generateData(count: number = 200, adversarial: boolean = true) {
  const resp = await fetch(`${API_BASE}/api/generate-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "synthetic", record_count: count, include_adversarial: adversarial }),
  });
  return resp.json();
}

export async function reconcile(): Promise<any> {
  const resp = await fetch(`${API_BASE}/api/reconcile`, { method: "POST" });
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
  const resp = await fetch(`${API_BASE}/api/reconciliation-report`);
  return resp.json();
}

export async function getMatches() {
  const resp = await fetch(`${API_BASE}/api/matches`);
  return resp.json();
}

export async function getExceptions() {
  const resp = await fetch(`${API_BASE}/api/exceptions`);
  return resp.json();
}

export async function getDebates() {
  const resp = await fetch(`${API_BASE}/api/debates`);
  return resp.json();
}

export async function qaQuery(question: string) {
  const resp = await fetch(`${API_BASE}/api/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return resp.json();
}

export async function getForecast(days: number = 7) {
  const resp = await fetch(`${API_BASE}/api/forecast?days=${days}`);
  return resp.json();
}

export async function getMetrics() {
  const resp = await fetch(`${API_BASE}/api/metrics`);
  return resp.json();
}

export async function getTrace(recordId: string) {
  const resp = await fetch(`${API_BASE}/api/trace/${recordId}`);
  return resp.json();
}

export async function getTraces() {
  const resp = await fetch(`${API_BASE}/api/observability/traces`);
  return resp.json();
}

export async function resolveException(id: string, action: string, text: string) {
  const resp = await fetch(`${API_BASE}/api/exceptions/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exception_id: id, action, resolution_text: text }),
  });
  return resp.json();
}

export async function getAdversarialResults() {
  const resp = await fetch(`${API_BASE}/api/adversarial/results`);
  return resp.json();
}

export async function getSqlAudit() {
  const resp = await fetch(`${API_BASE}/api/sql-audit`);
  return resp.json();
}

export async function getHealth() {
  const resp = await fetch(`${API_BASE}/api/health`);
  return resp.json();
}

export function connectMcpTerminal(onMessage: (data: any) => void) {
  const ws = new WebSocket("ws://localhost:8000/ws/mcp-terminal");
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
