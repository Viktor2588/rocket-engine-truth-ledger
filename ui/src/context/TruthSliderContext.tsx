import { createContext, useContext, useState, type ReactNode } from 'react';

interface TruthSliderContextType {
  truthMin: number;
  setTruthMin: (value: number) => void;
}

const TruthSliderContext = createContext<TruthSliderContextType | undefined>(undefined);

interface TruthSliderProviderProps {
  children: ReactNode;
}

export function TruthSliderProvider({ children }: TruthSliderProviderProps) {
  const [truthMin, setTruthMin] = useState(0.0); // Start at 0 to show all facts

  return (
    <TruthSliderContext.Provider value={{ truthMin, setTruthMin }}>
      {children}
    </TruthSliderContext.Provider>
  );
}

export function useTruthSlider(): TruthSliderContextType {
  const context = useContext(TruthSliderContext);
  if (context === undefined) {
    throw new Error('useTruthSlider must be used within a TruthSliderProvider');
  }
  return context;
}
