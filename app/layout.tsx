import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './globals.css';

export const metadata: Metadata = { title: 'ClipMetrics — Every frame, a little clearer.', description: 'Your private workspace for short-form video performance. Track, compare, and understand what holds attention.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>{children}</ThemeProvider></body></html>;
}
