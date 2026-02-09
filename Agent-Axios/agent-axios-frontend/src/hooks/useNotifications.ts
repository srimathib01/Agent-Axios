import { useState, useCallback, useEffect } from 'react';
import { 
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from '@/services/api';
import { toast } from 'sonner';

interface UseNotificationsOptions {
  autoLoad?: boolean;
  pollInterval?: number; // in milliseconds
  unreadOnly?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const loadNotifications = useCallback(async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) => {
    setIsLoading(true);
    try {
      const response = await getNotifications({
        page: params?.page || 1,
        limit: params?.limit || 20,
        unreadOnly: params?.unreadOnly ?? options.unreadOnly,
      });

      if (response.success && response.data) {
        const mapped = (response.data.notifications || []).map((notif: any): Notification => {
          const metadata = (() => {
            if (!notif.metadata) return undefined;
            if (typeof notif.metadata === 'string') {
              try {
                return JSON.parse(notif.metadata);
              } catch (error) {
                console.warn('Failed to parse notification metadata', error);
                return undefined;
              }
            }
            return notif.metadata;
          })();

          return {
            id: String(notif.notification_id ?? notif.id ?? Date.now()),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            read: Boolean(notif.is_read),
            data: metadata,
            createdAt: notif.created_at ?? new Date().toISOString(),
          };
        });

        setNotifications(mapped);
        setUnreadCount(response.data.unread_count ?? 0);
        setPagination({
          currentPage: response.data.page ?? 1,
          totalPages: response.data.pages ?? 1,
          totalItems: response.data.total ?? mapped.length,
        });
      }
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [options.unreadOnly]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await markNotificationAsRead(id);
      if (response.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === id ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read', {
        description: error.message,
      });
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await markAllNotificationsAsRead();
      if (response.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all as read', {
        description: error.message,
      });
      throw error;
    }
  }, []);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notif => !notif.read);
  }, [notifications]);

  const refreshNotifications = useCallback(() => {
    return loadNotifications();
  }, [loadNotifications]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadNotifications();
    }
  }, []);

  // Polling for new notifications
  useEffect(() => {
    if (options.pollInterval && options.pollInterval > 0) {
      const interval = setInterval(() => {
        loadNotifications({ unreadOnly: true });
      }, options.pollInterval);

      return () => clearInterval(interval);
    }
  }, [options.pollInterval, loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    pagination,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadNotifications,
    refreshNotifications,
  };
}
