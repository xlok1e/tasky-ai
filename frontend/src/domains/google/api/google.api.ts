import apiClient from "@shared/lib/axios";
import type { GoogleStatus, GoogleSyncResult } from "../types/google.types";

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const res = await apiClient.get<GoogleStatus>("/api/google/status");
  return res.data;
}

export async function getGoogleAuthUrl(redirectUri: string): Promise<string> {
  const res = await apiClient.get<{ authUrl: string }>("/api/google/auth", {
    params: { redirectUri },
  });
  return res.data.authUrl;
}

export async function syncGoogle(): Promise<GoogleSyncResult> {
  const res = await apiClient.post<GoogleSyncResult>("/api/google/sync");
  return res.data;
}

export async function disconnectGoogle(): Promise<void> {
  await apiClient.delete("/api/google/disconnect");
}
