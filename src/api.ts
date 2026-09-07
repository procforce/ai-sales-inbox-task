import type { CreateLeadPayload, Extraction, Lead, Message } from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const api = {
  listMessages: () => requestJson<Message[]>("/api/messages"),
  getMessage: (messageId: string) => requestJson<Message>(`/api/messages/${encodeURIComponent(messageId)}`),
  listLeads: () => requestJson<Lead[]>("/api/leads"),
  extractLead: (messageId: string) => requestJson<Extraction>("/api/ai/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messageId }),
  }),
  createLead: (payload: CreateLeadPayload) => requestJson<Lead>("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }),
  markLeadAsContacted: (leadId: string) => requestJson<Lead>(`/api/leads/${encodeURIComponent(leadId)}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "CONTACTED" }),
  }),
};
