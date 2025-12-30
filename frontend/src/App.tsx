import { Navbar } from "@/components/layout/Navbar"
import { Hero } from "@/components/marketing/Hero"
import { Features } from "@/components/marketing/Features"

function App() {
  return (
    <main className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/30">
      <Navbar />
      <Hero />
      <Features />
    </main>
  )
}

export default App
