import React, { createContext, useContext, useState, ReactNode } from "react";

interface AdContextType {
  adHeight: number;
  adVisible: boolean;
  setAdHeight: (height: number) => void;
  setAdVisible: (visible: boolean) => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

interface AdProviderProps {
  children: ReactNode;
}

export const AdProvider: React.FC<AdProviderProps> = ({ children }) => {
  const [adHeight, setAdHeight] = useState(0);
  const [adVisible, setAdVisible] = useState(false);

  const value: AdContextType = {
    adHeight,
    adVisible,
    setAdHeight,
    setAdVisible,
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

export const useAdContext = (): AdContextType => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error("useAdContext must be used within an AdProvider");
  }
  return context;
};

// Hook to get safe area insets accounting for ads
export const useAdSafeArea = () => {
  const { adHeight, adVisible } = useAdContext();

  return {
    bottom: adVisible ? adHeight : 0,
    adHeight: adVisible ? adHeight : 0,
  };
};
