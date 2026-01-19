import { createContext, useContext, useState, ReactNode } from 'react';

interface StatusCounts {
  green: number;
  red: number;
}

interface StatusContextType {
  statusCounts: StatusCounts;
  setStatusCounts: (counts: StatusCounts) => void;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: ReactNode }) {
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ green: 0, red: 0 });

  return (
    <StatusContext.Provider value={{ statusCounts, setStatusCounts }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatusCounts() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatusCounts must be used within a StatusProvider');
  }
  return context;
}
