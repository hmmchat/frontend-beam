import "./globals.css";
import localFont from 'next/font/local';
import { Outfit } from 'next/font/google';

const otomanopeeOne = localFont({
  src: '../public/fonnts.com-OtomanopeeOne-Regular.ttf',
  variable: '--font-otomanopee',
  weight: '400',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: "Hmm..",
  description: "Meet Someone Here , Not Sure Who , But Someone",
  icons: {
    icon: "/assets/Logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${otomanopeeOne.variable} ${outfit.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
