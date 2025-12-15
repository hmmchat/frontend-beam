import "./globals.css";

export const metadata = {
  title: "Hmm..",
  description: "Meet Someone Here , Not Sure Who , But Someone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
