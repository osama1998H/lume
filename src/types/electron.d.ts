import type { IElectronAPINamespaced } from './index';

declare global {
  interface Window {
    electronAPI: IElectronAPINamespaced;
  }
}

export {};