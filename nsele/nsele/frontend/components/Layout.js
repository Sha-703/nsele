import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Nsele</p>
          <h2>Serre connectée</h2>
        </div>
        <nav>
          <Link href="/">Dashboard</Link>
          <Link href="/settings">Paramètres</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
