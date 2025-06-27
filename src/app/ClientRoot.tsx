"use client";
import { DriverProvider } from "../features/drivers/DriverContext";
import { LoadProvider } from "../features/loads/LoadContext";
import ErrorBoundary from "../components/ErrorBoundary";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <LoadProvider>
        <DriverProvider>{children}</DriverProvider>
      </LoadProvider>
    </ErrorBoundary>
  );
} 