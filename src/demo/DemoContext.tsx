import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface DemoContextValue {
  isDemo: boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false });

export function useDemo(): DemoContextValue {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return { isDemo: params.get('demo') === 'true' };
  }, []);

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}
