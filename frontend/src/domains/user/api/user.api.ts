import apiClient from "@shared/lib/axios";
import type { UserProfile, UserSettings, UpdateUserSettingsRequest } from "../types/user.types";

export async function getMe(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>("/api/me");
  return res.data;
}

export async function getSettings(): Promise<UserSettings> {
  const res = await apiClient.get<UserSettings>("/api/me/settings");
  return res.data;
}

export async function updateSettings(data: UpdateUserSettingsRequest): Promise<UserSettings> {
  const res = await apiClient.patch<UserSettings>("/api/me/settings", data);
  return res.data;
}
