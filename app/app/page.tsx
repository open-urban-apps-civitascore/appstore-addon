import { auth, signIn, signOut } from "@/auth"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Civitas Marketplace</h1>
        <p>Du bist nicht eingeloggt.</p>
        <form action={async () => { "use server"; await signIn("keycloak") }}>
          <button type="submit">Mit Civitas Login anmelden</button>
        </form>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Civitas Marketplace</h1>
      <p>Willkommen zurück, {session.user.name || session.user.email}!</p>
      <form action={async () => { "use server"; await signOut() }}>
        <button type="submit">Abmelden</button>
      </form>
    </main>
  )
}
