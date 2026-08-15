/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL of the JFMS backend API, e.g. https://jfms-api.onrender.com.
   * When unset the frontend calls `/api` (Vite dev proxy).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
