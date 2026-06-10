/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // Optional override for the UGent Biblio API base path/URL.
  // Defaults to '/biblio-api' (proxied by nginx / Vite dev server).
  readonly VITE_BIBLIO_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
