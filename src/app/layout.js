import './globals.css';

export const metadata = {
  title: 'Chimi Prode - Mundial 2026',
  description: 'Pronósticos deportivos del Mundial de Fútbol FIFA 2026 auspiciado por ChimiPesca.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
