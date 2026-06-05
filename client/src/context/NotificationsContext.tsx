import { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';

export interface Notification {
  id: string;
  event: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

interface State {
  notifications: Notification[];
  unreadCount: number;
}

type Action =
  | { type: 'ADD'; notification: Notification }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR' };

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
] as const;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [], unreadCount: 0 });
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return;

    // Don't connect if no auth token (unauthenticated visitors)
    const isAdmin = window.location.pathname.startsWith('/admin');
    const token = isAdmin
      ? localStorage.getItem('admin_token')
      : localStorage.getItem('user_token');
    if (!token) return;

    connectedRef.current = true;

    const socket = getSocket();

    const handleEvent = (payload: { event: string; title: string; message: string; data?: Record<string, unknown> }) => {
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
