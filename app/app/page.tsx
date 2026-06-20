import { auth, signIn, signOut } from "@/app/auth"
import { getCatalog } from "@/lib/getCatalog"

export default async function Home() {
  const session = await auth()
  const catalog = getCatalog()

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Civitas Marketplace</h1>
          <p className="text-slate-600 mb-8">Bitte melde dich an, um den AppStore zu nutzen.</p>
          <form action={async () => { "use server"; await signIn("keycloak") }}>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Mit Civitas Login anmelden
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Civitas Marketplace</h1>
            <p className="text-sm text-slate-500">Angemeldet als {session.user.name || session.user.email}</p>
          </div>
          <form action={async () => { "use server"; await signOut() }}>
            <button type="submit" className="text-sm text-slate-600 hover:text-slate-900 font-medium">Abmelden</button>
          </form>
        </div>
      </header>

      {/* Catalog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Entdecken</h2>
          <p className="text-lg text-slate-600">Finde validierte Use Cases und Add-ons für deinen CivitasCore Cluster.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {catalog.addons.map((addon) => (
            <div key={addon.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-2">{addon.name}</h3>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap ml-4">
                    v{addon.version}
                  </span>
                </div>
                
                <p className="text-sm text-slate-500 mb-4">Von: {addon.author}</p>
                <p className="text-slate-700 mb-6 line-clamp-3">{addon.description}</p>
                
                {/* Capabilities */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Benötigte Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {addon.requiredCapabilities?.map(cap => (
                      <span key={cap} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {cap}
                      </span>
                    )) || <span className="text-sm text-slate-400">Keine</span>}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">CivitasCore {addon.civitasCoreVersion}</span>
                <a href={`/addon/${addon.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Details ansehen &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
