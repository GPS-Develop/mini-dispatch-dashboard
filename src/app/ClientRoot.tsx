"use client";
import { DriverProvider } from "../features/drivers/DriverContext";
import { LoadProvider } from "../features/loads/LoadContext";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <LoadProvider>
      <DriverProvider>{children}</DriverProvider>
    </LoadProvider>
  );
} 