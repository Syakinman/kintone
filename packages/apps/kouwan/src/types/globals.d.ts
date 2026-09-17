declare function showSpinner(): void;
declare function hideSpinner(): void;

declare module 'vuetify/styles';

interface ImportMetaEnv {
  readonly VITE_CHATWORK_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
