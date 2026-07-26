import type { CourseProgress } from "@/lib/types";

const SESSION_KEY = "german-a2-cloud-session-v1";

export interface CloudSession {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; email?: string };
}

interface CloudRow {
  data: CourseProgress;
  updated_at: string;
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

function headers(token?: string) {
  const settings = config();
  if (!settings) throw new Error("Cloud sync has not been configured yet.");
  return {
    apikey: settings.anonKey,
    Authorization: `Bearer ${token ?? settings.anonKey}`,
    "Content-Type": "application/json",
  };
}

function toSession(payload: {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
}): CloudSession {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    user: payload.user,
  };
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const message = await response.json().catch(() => null);
    throw new Error(message?.msg || message?.message || "Cloud sync request failed.");
  }
  const body = await response.text();
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

export function isCloudSyncConfigured() {
  return Boolean(config());
}

export function readCloudSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CloudSession) : null;
  } catch {
    return null;
  }
}

export function storeCloudSession(session: CloudSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCloudSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function signInToCloud(email: string, password: string) {
  const settings = config();
  if (!settings) throw new Error("Add the Supabase environment variables first.");
  const payload = await request<{
    access_token: string;
    refresh_token?: string;
    user: { id: string; email?: string };
  }>(`${settings.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const session = toSession(payload);
  storeCloudSession(session);
  return session;
}

export async function signUpForCloud(email: string, password: string) {
  const settings = config();
  if (!settings) throw new Error("Add the Supabase environment variables first.");
  const payload = await request<{
    access_token?: string;
    refresh_token?: string;
    user: { id: string; email?: string };
  }>(`${settings.url}/auth/v1/signup`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  if (!payload.access_token) {
    throw new Error("Check the confirmation email, then sign in to enable cloud sync.");
  }
  const session = toSession({ ...payload, access_token: payload.access_token });
  storeCloudSession(session);
  return session;
}

export async function refreshCloudSession(session: CloudSession) {
  const settings = config();
  if (!settings || !session.refreshToken) return session;
  const payload = await request<{
    access_token: string;
    refresh_token?: string;
    user: { id: string; email?: string };
  }>(`${settings.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const refreshed = toSession(payload);
  storeCloudSession(refreshed);
  return refreshed;
}

export async function loadCloudProgress(session: CloudSession) {
  const settings = config();
  if (!settings) return null;
  const query = new URLSearchParams({
    select: "data,updated_at",
    user_id: `eq.${session.user.id}`,
  });
  const rows = await request<CloudRow[]>(`${settings.url}/rest/v1/course_progress?${query}`, {
    headers: headers(session.accessToken),
  });
  return rows[0] ?? null;
}

export async function saveCloudProgress(session: CloudSession, data: CourseProgress) {
  const settings = config();
  if (!settings) throw new Error("Cloud sync has not been configured yet.");
  const savedAt = new Date().toISOString();
  await request(`${settings.url}/rest/v1/course_progress?on_conflict=user_id`, {
    method: "POST",
    headers: {
      ...headers(session.accessToken),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ user_id: session.user.id, data, updated_at: savedAt }),
  });
  return savedAt;
}

export async function signOutOfCloud(session: CloudSession) {
  const settings = config();
  clearCloudSession();
  if (!settings) return;
  await fetch(`${settings.url}/auth/v1/logout`, {
    method: "POST",
    headers: headers(session.accessToken),
  });
}
