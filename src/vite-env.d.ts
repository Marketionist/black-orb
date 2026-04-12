/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly STOCKS: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
