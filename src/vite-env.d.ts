/// <reference types="vite/client" />

/** Document Picture-in-Picture (Chrome / Edge 116+) : fenêtre flottante toujours au premier plan. */
interface DocumentPictureInPicture extends EventTarget {
  readonly window: Window | null;
  requestWindow(options?: { width?: number; height?: number; disallowReturnToOpener?: boolean }): Promise<Window>;
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
