/**
 * Notifications système (API Notification), sans serveur push :
 * elles sont émises par l'app tant qu'un onglet ou le mini-minuteur est ouvert,
 * même réduit ou en arrière-plan.
 */
export type PermissionState = NotificationPermission | 'unsupported';

export function notificationPermission(): PermissionState {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export interface SystemNotification {
  title: string;
  body: string;
  /** Une notification de même tag remplace la précédente au lieu de s'empiler. */
  tag: string;
  /** Reste affichée jusqu'à interaction (fin de bloc, minuteur écoulé). */
  sticky?: boolean;
}

export async function showSystemNotification(n: SystemNotification): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const options: NotificationOptions = {
    body: n.body,
    tag: n.tag,
    icon: '/favicon.png',
    requireInteraction: n.sticky ?? false,
  };
  try {
    // En production, le service worker gère le clic (refocus de l'app).
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg?.active) {
      await reg.showNotification(n.title, options);
      return true;
    }
    const notification = new Notification(n.title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn('[notify] notification impossible', err);
    return false;
  }
}
