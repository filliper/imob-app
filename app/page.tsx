import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ImobApp
        </h1>
        <p className="text-gray-500 text-lg mb-8">
          Plataforma de gestão imobiliária
        </p>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Acessar plataforma →
        </Link>
      </div>
    </main>
  )
}