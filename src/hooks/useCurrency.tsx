import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { detectViewerCurrency, getRates, Rates } from "@/lib/currency.ts";

interface CurrencyContextValue {
  currency: string;
  rates: Rates;
  ready: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  rates: { USD: 1 },
  ready: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState<Rates>({ USD: 1 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, r] = await Promise.all([detectViewerCurrency(), getRates()]);
      if (cancelled) return;
      setCurrency(c);
      setRates(r);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, rates, ready }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
