import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppNotification = {
  id: string;
  title: string;
  detail?: string;
  createdAt: number;
};

type NotificationsState = {
  items: AppNotification[];
  unread: number;
  push: (title: string, detail?: string) => void;
  markRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const push = useCallback((title: string, detail?: string) => {
    setItems((current) => [
      {
        id: crypto.randomUUID(),
        title,
        detail,
        createdAt: Date.now(),
      },
      ...current,
    ].slice(0, 50));
    setUnread((n) => n + 1);
  }, []);

  const markRead = useCallback(() => setUnread(0), []);
  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const clear = useCallback(() => {
    setItems([]);
    setUnread(0);
  }, []);

  const value = useMemo(
    () => ({ items, unread, push, markRead, dismiss, clear }),
    [items, unread, push, markRead, dismiss, clear],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
