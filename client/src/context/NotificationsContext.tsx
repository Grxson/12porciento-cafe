import { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useToast } from './ToastContext';

export interface Notification {
  id: string;
  event: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

const STORAGE_KEY = 'cafe12_notifications';

function loadPersistedState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { notifications: [], unreadCount: 0 };
    const parsed = JSON.parse(raw);
    // Rehydrate timestamp strings into Date objects
    const notifications: Notification[] = (parsed.notifications ?? []).map(
      (n: Record<string, unknown>) => ({
        id: String(n.id),
        event: String(n.event),
        title: String(n.title),
        message: String(n.message),
        data: n.data as Record<string, unknown> | undefined,
        timestamp: new Date(n.timestamp as string | number | Date),
        read: Boolean(n.read),
      }),
    );
    const unread = notifications.filter((n) => !n.read).length;
    return { notifications, unreadCount: unread };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

function persistState(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
}

interface State {
  notifications: Notification[];
  unreadCount: number;
}

type Action =
  { type: 'ADD'; notification: Notification } | { type: 'MARK_ALL_READ' } | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD':
      return {
        notifications: [action.notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    case 'MARK_ALL_READ':
      return {
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    case 'CLEAR':
      return { notifications: [], unreadCount: 0 };
    default:
      return state;
  }
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  clear: () => {},
});

const SOCKET_EVENTS = [
  'new_order',
  'order_status_changed',
  'new_review',
  'review_approved',
  'new_reply',
  'subscription_created',
  'subscription_cancelled',
  'low_stock',
  'FOLLOW',
  'LIKE_BREW',
  'ACHIEVEMENT_UNLOCK',
] as const;

const EVENT_TOAST_TYPE: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
  low_stock: 'warning',
  new_order: 'warning',
  order_status_changed: 'info',
  new_review: 'success',
  review_approved: 'success',
  new_reply: 'info',
  subscription_created: 'success',
  subscription_cancelled: 'warning',
  FOLLOW: 'info',
  LIKE_BREW: 'success',
  ACHIEVEMENT_UNLOCK: 'success',
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);
  const connectedRef = useRef(false);
  const { add: addToast } = useToast();

  // Persist to localStorage on every state change
  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (connectedRef.current) return;

    const isAdmin = window.location.pathname.startsWith('/admin');
    const token = isAdmin
      ? localStorage.getItem('admin_token')
      : localStorage.getItem('user_token');
    if (!token) return;

    connectedRef.current = true;

    const socket = getSocket();

    const handleEvent = (payload: {
      event: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    }) => {
      const toastType = EVENT_TOAST_TYPE[payload.event] ?? 'info';
      addToast(payload.title, toastType);
      dispatch({
        type: 'ADD',
        notification: {
          id: `${Date.now()}-${Math.random()}`,
          event: payload.event,
          title: payload.title,
          message: payload.message,
          data: payload.data,
          timestamp: new Date(),
          read: false,
        },
      });
    };

    SOCKET_EVENTS.forEach((ev) => socket.on(ev, handleEvent));

    return () => {
      SOCKET_EVENTS.forEach((ev) => socket.off(ev, handleEvent));
      disconnectSocket();
      connectedRef.current = false;
    };
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        markAllRead: () => dispatch({ type: 'MARK_ALL_READ' }),
        clear: () => dispatch({ type: 'CLEAR' }),
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
