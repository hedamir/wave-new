export const metadata = {
  title: 'wave. — music for your mood',
  description: 'AI-powered music discovery shaped by how you feel today',
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
