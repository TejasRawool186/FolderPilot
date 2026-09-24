import "./globals.css";
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata = {
  title: "FolderPilot — Command Room",
  description: "Local-first intelligent folder reorganization and visual control room.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#0a0a0a] text-[#ffffff] min-h-screen font-sans antialiased selection:bg-[#6798ff] selection:text-[#0a0a0a]">
        {children}
      </body>
    </html>
  );
}
