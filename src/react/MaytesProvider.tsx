import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Maytes } from '@maytes/checkout-button';
import type {
  CreateCheckoutFn,
  MaytesEnvironment,
  MaytesSDK,
  OpenCheckoutOptions,
  OpenCheckoutResult,
} from '@maytes/checkout-button';

export interface MaytesProviderProps {
  environment: MaytesEnvironment;
  createCheckout: CreateCheckoutFn;
  children?: ReactNode;
}

export interface MaytesContextValue {
  maytes: MaytesSDK | null;
  busy: boolean;
}

export const MaytesContext = createContext<MaytesContextValue | null>(null);

export function MaytesProvider({ environment, createCheckout, children }: MaytesProviderProps) {
  const createCheckoutRef = useRef(createCheckout);
  const [maytes, setMaytes] = useState<MaytesSDK | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createCheckoutRef.current = createCheckout;
  });

  useEffect(() => {
    const instance = Maytes({ environment, createCheckout: () => createCheckoutRef.current() });
    const stopWatchingBusy = instance.onBusyChange(setBusy);
    setMaytes(instance);
    setBusy(false);
    return () => {
      stopWatchingBusy();
      instance.destroy();
    };
  }, [environment]);

  const value = useMemo(() => ({ maytes, busy }), [maytes, busy]);
  return <MaytesContext.Provider value={value}>{children}</MaytesContext.Provider>;
}

export interface UseMaytesResult {
  openCheckout: (options?: OpenCheckoutOptions) => Promise<OpenCheckoutResult>;
  busy: boolean;
}

const NOT_READY: OpenCheckoutResult = { outcome: 'ignored' };

export function useMaytes(): UseMaytesResult {
  const context = useContext(MaytesContext);
  if (context === null) throw new Error('useMaytes() must be used inside <MaytesProvider>.');
  const { maytes, busy } = context;
  const openCheckout = useCallback(
    (options?: OpenCheckoutOptions) => (maytes === null ? Promise.resolve(NOT_READY) : maytes.openCheckout(options)),
    [maytes],
  );
  return { openCheckout, busy };
}
