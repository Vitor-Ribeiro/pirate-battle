/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE?: string;
  readonly VITE_ENABLE_MSW?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_E2E?: string;
}
