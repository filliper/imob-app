'use client'

import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const links = [
  { href: '/dashboard',  icon: '🏠', label: 'Dashboard' },
  { href: '/contratos',  icon: '📄', label: 'Contratos' },
  { href: '/imoveis',    icon: '🏢', label: 'Imóveis' },
  { href: '/inquilinos', icon: '👤', label: 'Inquilinos' },
  { href: '/reajuste',   icon: '📊', label: 'Reajuste' },
  { href: '/vistorias',  icon: '🗓️', label: 'Vistorias' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">ImobApp</h1>
        <p className="text-xs text-gray-500 mt-1">Gestão imobiliária</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === link.href
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 truncate mb-2">{email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}