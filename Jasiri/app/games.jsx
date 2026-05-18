/**
 * Games Route
 * Playable serious games with progress tracking
 */

import { SeriousGamesHub, ThemeProvider } from "@/src";

export default function GamesPage() {
  return (
    <ThemeProvider>
      <SeriousGamesHub />
    </ThemeProvider>
  );
}
