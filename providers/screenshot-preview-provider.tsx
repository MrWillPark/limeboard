import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ScreenshotPreviewMode = 'live' | 'no-key' | 'no-pro';

type ScreenshotPreviewState = {
  mode: ScreenshotPreviewMode;
  setMode: (mode: ScreenshotPreviewMode) => void;
  isPreviewActive: boolean;
};

const ScreenshotPreviewContext = createContext<ScreenshotPreviewState | null>(null);

export function ScreenshotPreviewProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ScreenshotPreviewMode>('live');

  const setMode = useCallback((next: ScreenshotPreviewMode) => {
    setModeState(next);
  }, []);

  // Hot reload can preserve preview state — reset when this provider mounts.
  useEffect(() => {
    setModeState('live');
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isPreviewActive: mode !== 'live',
    }),
    [mode, setMode]
  );

  return (
    <ScreenshotPreviewContext.Provider value={value}>
      {children}
    </ScreenshotPreviewContext.Provider>
  );
}

export function useScreenshotPreview() {
  const ctx = useContext(ScreenshotPreviewContext);
  if (!ctx) throw new Error('useScreenshotPreview must be used within ScreenshotPreviewProvider');
  return ctx;
}

export function useScreenshotPreviewOptional() {
  return useContext(ScreenshotPreviewContext);
}
