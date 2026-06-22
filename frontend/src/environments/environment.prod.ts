declare global {
  interface Window {
    __env__?: {
      apiUrl?: string;
    };
  }
}

const runtimeEnv = window.__env__ || {};

export const environment = {
  production: true,
  apiUrl: runtimeEnv.apiUrl || `${window.location.origin}/api`,
};