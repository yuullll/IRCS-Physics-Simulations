import type {Metadata} from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AP Physics C 3D Simulation Platform',
  description: 'Calculus-based interactive 3D physics simulation platform for AP Physics C Electricity & Magnetism and Mechanics, featuring 3D Electric Field & Potential sandboxes, Lorentz force trajectory integration, and an interactive Circuit Workbench with an MNA solver.',
  openGraph: {
    title: 'AP Physics C 3D Simulation Platform',
    description: 'Calculus-based interactive 3D physics simulation platform for AP Physics C Electricity & Magnetism and Mechanics, featuring 3D Electric Field & Potential sandboxes, Lorentz force trajectory integration, and an interactive Circuit Workbench with an MNA solver.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AP Physics C 3D Simulation Platform',
    description: 'Calculus-based interactive 3D physics simulation platform for AP Physics C Electricity & Magnetism and Mechanics, featuring 3D Electric Field & Potential sandboxes, Lorentz force trajectory integration, and an interactive Circuit Workbench with an MNA solver.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
