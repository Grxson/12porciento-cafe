import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';
import { urlBase64ToUint8Array } from '../utils/base64';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

interface PushState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>(() => ({
    supported: false,
    permission: 'default',
    subscribed: false,
    loading: true,
  }));
  const { add: addToast } = useToast();
  const user = useUser((s) => s.user);
  const prevUserRef = useRef(user);

  // Check support + existing subscription on mount
  useEffect(() => {
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      !!VAPID_PUBLIC_KEY;

    if (!supported) {
      setState({ supported: false, permission: 'default', subscribed: false, loading: false });
      return;
    }

    const permission = Notification.permission;

    setState((s) => ({ ...s, supported: true, permission, loading: true }));

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState((s) => ({
          ...s,
          subscribed: !!sub,
          permission,
          loading: false,
        }));
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  }, []);

  // Auto-subscribe on login if permission already granted
  // Auto-unsubscribe on logout
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (!state.supported) return;

    // Login detected: null → non-null
    if (!prevUser && user && state.permission === 'granted' && !state.subscribed) {
      subscribe();
      return;
    }

    // Logout detected: non-null → null
    if (prevUser && !user && state.subscribed) {
      unsubscribe();
    }
  }, [user]);

  const requestPermission = useCallback(async () => {
    try {
      const result = await Notification.requestPermission();
      setState((s) => ({ ...s, permission: result }));

      if (result === 'granted') {
        await subscribe();
      }
    } catch (err) {
      console.error('[PUSH] requestPermission error:', err);
    }
  }, []);

  const subscribe = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true }));

      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      // Unsubscribe existing if endpoint changed
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Send subscription to server
      const subJSON = newSub.toJSON();
      await api.post('/push/subscribe', {
        endpoint: subJSON.endpoint,
        keys: subJSON.keys,
      });

      setState((s) => ({ ...s, subscribed: true, loading: false }));
      addToast('🔔 Notificaciones activadas', 'success');
    } catch (err: unknown) {
      console.error('[PUSH] subscribe error:', err);
      setState((s) => ({ ...s, loading: false }));

      if ((err as Error).name === 'NotAllowedError') {
        addToast('Permiso de notificaciones denegado', 'error');
      } else {
        addToast('Error al activar notificaciones', 'error');
      }
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true }));

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await api.delete('/push/subscribe', { data: { endpoint } });
      }

      setState((s) => ({ ...s, subscribed: false, loading: false }));
      addToast('Notificaciones desactivadas', 'info');
    } catch (err) {
      console.error('[PUSH] unsubscribe error:', err);
      setState((s) => ({ ...s, loading: false }));
      addToast('Error al desactivar notificaciones', 'error');
    }
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
