import { api } from './api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface RawNotification {
  id: string;
  title: string;
  message: string;
  body?: string;
  created_at: string;
  is_read: boolean;
}

export const notificationService = {
  list: async (): Promise<NotificationItem[]> => {
    const res = await api.get<{ success?: boolean; data?: RawNotification[] } | RawNotification[]>('/notifications', true);
    const rows = Array.isArray(res) ? res : res.data ?? [];
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.body ?? n.message,
      createdAt: n.created_at,
      isRead: n.is_read,
    }));
  },
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`, {}, true),
  remove: (id: string) => api.delete(`/notifications/${id}`, true),
  registerDeviceToken: async (token: string, platform: string = 'web'): Promise<{ success: boolean }> => {
    const res = await api.post<{ success: boolean } | { data: { success: boolean } }>('/notifications/device-token', { token, platform }, true);
    return 'data' in res ? res.data : res;
  },
};
