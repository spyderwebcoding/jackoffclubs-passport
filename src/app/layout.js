export const metadata = {
  title: "Jack Off Clubs — Digital Passport",
  description: "Collect stamps from Jack Off Clubs worldwide. Track visits, earn achievements, and climb the leaderboard.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#0A0A0F",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JOC Passport",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0A0A0F", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
