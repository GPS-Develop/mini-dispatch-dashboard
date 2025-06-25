"use client";
import { DriverProvider } from "./drivers/DriverContext";
import { LoadProvider } from "./loads/LoadContext";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <LoadProvider>
      <DriverProvider>{children}</DriverProvider>
    </LoadProvider>
  );
} 