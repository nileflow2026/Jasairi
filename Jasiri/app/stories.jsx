/**
 * Stories Route
 * Read-aloud stories for children
 */

import { StoryHub, ThemeProvider } from "@/src";

export default function StoriesPage() {
  return (
    <ThemeProvider>
      <StoryHub />
    </ThemeProvider>
  );
}
