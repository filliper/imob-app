'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUserEmail(data.user.email ?? '')
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const modules = [
    {
      icon: '📄',
      title: 'Gerador de Contratos',
      description: 'Crie contratos de aluguel, prestação de serviço e compra e venda em minutos.',
      status: 'Em breve',
      color: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-700',
    },
    {
      icon: '📊',
      title: 'Calculadora de Reajuste',
      description: 'Calcule o novo valor do aluguel pelo IGPM, IPCA ou outro índice automaticamente.',
      status: 'Em breve',
      color: 'bg-green-50 border-green-200',
      badge: 'bg-green-100 text-green-700',
    },
    {
      icon: '🗓️',
      title: 'Agendador de Vistorias',
      description: 'Agende vistorias de entrada e saída com checklist digital e relatório com fotos.',
      status: 'Em breve',
      color: 'bg-purple-50 border-purple-200',
      badge: 'bg-purple-100 text-purple-700',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      {/* Main */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo! 👋</h2>
          <p className="text-gray-500 mt-1">Escolha um módulo para começar</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Imóveis cadastrados', value: '0' },
            { label: 'Contratos gerados', value: '0' },
            { label: 'Vistorias agendadas', value: '0' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Modules */}
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Módulos</h3>
        <div className="grid grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className={`rounded-xl border p-6 cursor-pointer hover:shadow-md transition-shadow ${mod.color}`}
            >
              <div className="text-3xl mb-3">{mod.icon}</div>
              <h4 className="font-semibold text-gray-900 mb-2">{mod.title}</h4>
              <p className="text-sm text-gray-600 mb-4">{mod.description}</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${mod.badge}`}>
                {mod.status}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}