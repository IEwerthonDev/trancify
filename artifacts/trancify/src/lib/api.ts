const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("trancify_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiSend<T>(method: "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: any): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err: any = new Error(errBody.message || `${method} ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = errBody;
    throw err;
  }
  return res.json();
}

export interface ClientHistoryEntry {
  clientKey: string;
  clientName: string;
  clientPhone: string | null;
  totalAppointments: number;
  totalSpent: number;
  totalProfit: number;
  lastVisit: string | null;
  firstVisit: string | null;
  appointments: Array<{
    id: string;
    serviceName: string;
    date: string;
    time: string;
    status: string;
    servicePrice: number;
    materialCost: number | null;
    profit: number | null;
    braidSize: string;
    referencePhotos: string[];
  }>;
}

export interface TenantReview {
  id: string;
  tenantId: string;
  appointmentId: string | null;
  clientName: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  isPublic: boolean;
  createdAt: string;
}
