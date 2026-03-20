export interface GoogleStatus {
  isConnected: boolean;
  calendarId: string | null;
  lastSyncAt: string | null;
}

export interface GoogleSyncResult {
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  message: string;
}
