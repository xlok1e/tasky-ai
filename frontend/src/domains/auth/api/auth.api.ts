import apiClient from "@shared/lib/axios";

interface BotLinkResponse {
  botLink: string;
}

interface TokenStatusResponse {
  isUsed: boolean;
  username: string | null;
}

export async function getTelegramBotLink(): Promise<string> {
  const response = await apiClient.post<BotLinkResponse>(
    "/api/auth/telegram-bot-link"
  );
  return response.data.botLink;
}

export async function checkTokenStatus(
  token: string
): Promise<TokenStatusResponse> {
  const response = await apiClient.get<TokenStatusResponse>(
    `/api/auth/telegram-token/${token}`
  );
  return response.data;
}

export async function exchangeToken(token: string): Promise<string> {
  const response = await apiClient.post<string>("/api/auth/login-with-token", {
    token,
  });
  return response.data;
}
