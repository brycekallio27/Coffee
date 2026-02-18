declare global {
  interface Window {
    electronAPI?: {
      getSettings: () => Promise<{ autoLaunch: boolean; workerEnabled: boolean }>;
      setSetting: (key: string, value: unknown) => Promise<void>;
      getUpcomingCount: () => Promise<number>;
      triggerCheck: () => Promise<boolean>;
      setAuthSession: (accessToken: string) => Promise<void>;
      platform: string;
      isElectron: boolean;
    };
  }
}

export {};
