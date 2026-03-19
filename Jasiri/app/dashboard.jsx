/**
 * Dashboard Route
 * Route for the main dashboard shell
 * Accessible via /dashboard path
 */

import { DashboardShell, ThemeProvider } from "@/src";

export default function DashboardPage() {
  return (
    <ThemeProvider>
      <DashboardShell />
    </ThemeProvider>
  );
}
