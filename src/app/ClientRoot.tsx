"use client";
import { DriverProvider } from "../features/drivers/DriverContext";
import { LoadProvider } from "../features/loads/LoadContext";
import { PayStatementProvider } from "../features/paystatements/PayStatementContext";
import { UIProvider } from "../contexts/UIContext";
import ErrorBoundary from "../components/ErrorBoundary";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <UIProvider>
        <LoadProvider>
          <DriverProvider>
            <PayStatementProvider>
              {children}
            </PayStatementProvider>
          </DriverProvider>
        </LoadProvider>
      </UIProvider>
    </ErrorBoundary>
  );
} 