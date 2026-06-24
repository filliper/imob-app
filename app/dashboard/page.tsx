'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Stats = {
  properties: number
  contracts: number
  inspections: number
  leads: number
  owners: number
  tenants: number
  payments_pendente: number
  payments_atrasado: number
  payments_pago: number
  receita_mes: number
  receita_pendente: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUserName(user.email?.split('@')[0] ?? 'usuário')

    const hoje = new Date()
    const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

    const [
      { count: properties },
      { count: contracts },
      { count: inspections },
      { count: leads },
      { count: pgt_pendente },
      { count: pgt_atrasado },
      { data: pgt_pago_data },
      { data: receita_pendente_data },
      { count: ownersResult },
      { count: tenantsResult }
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }),
      supabase.from('contracts').select('*', { count: 'exact', head: true }),
      supabase.from('inspections').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'atrasado'),
      supabase.from('payments').select('amount').eq('status', 'pago').gte('paid_date', primeiroDiaMes),
      supabase.from('payments').select('amount').eq('status', 'pendente'),
      supabase.from('properties').select('people_owner_id', { count: 'exact', head: true }).not('people_owner_id', 'is', null),
      supabase.from('contracts').select('people_tenant_id', { count: 'exact', head: true }).not('people_tenant_id', 'is', null),
    ])

    // Get distinct counts for owners and tenants
    const { data: ownersData } = await supabase
      .from('properties')
      .select('people_owner_id')
      .not('people_owner_id', 'is', null)

    const { data: tenantsData } = await supabase
      .from('contracts')
      .select('people_tenant_id')
      .not('people_tenant_id', 'is', null)

    // Count distinct owners and tenants
    const distinctOwners = [...new Set((ownersData ?? []).map(o => o.people_owner_id))].length
    const distinctTenants = [...new Set((tenantsData ?? []).map(t => t.people_tenant_id))].length

    const receita_mes = (pgt_pago_data ?? []).reduce((s: number, p: any) => s + p.amount, 0)
    const receita_pendente = (receita_pendente_data ?? []).reduce((s: number, p: any) => s + p.amount, 0)

    setStats({
      properties: properties ?? 0,
      contracts: contracts ?? 0,
      inspections: inspections ?? 0,
      leads: leads ?? 0,
      owners: distinctOwners,
      tenants: distinctTenants,
      payments_pendente: pgt_pendente ?? 0,
      payments_atrasado: pgt_atrasado ?? 0,
      payments_pago: (pgt_pago_data ?? []).length,
      receita_mes,
      receita_pendente,
    })
    setLoading(false)
  }

  const modules = [
    { icon: '🎯', title: 'CRM / Leads', description: 'Gerencie seus leads e funil de vendas.', href: '/crm', color: 'bg-orange-50 border-orange-200' },
    { icon: '📄', title: 'Contratos', description: 'Gere contratos em PDF com um clique.', href: '/contratos', color: 'bg-blue-50 border-blue-200' },
    { icon: '💰', title: 'Pagamentos', description: 'Monitore aluguéis e cobranças.', href: '/pagamentos', color: 'bg-green-50 border-green-200' },
    { icon: '🏢', title: 'Imóveis', description: 'Cadastre e gerencie seus imóveis.', href: '/imoveis', color: 'bg-purple-50 border-purple-200' },
    { icon: '📊', title: 'Reajuste', description: 'Calcule reajustes pelo IPCA ou IGP-M.', href: '/reajuste', color: 'bg-teal-50 border-teal-200' },
    { icon: '🗓️', title: 'Vistorias', description: 'Agende vistorias com checklist digital.', href: '/vistorias', color: 'bg-pink-50 border-pink-200' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* Boas-vindas */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Olá, {userName}! 👋
          </h2>
          <p className="text-gray-500 mt-1">Aqui está o resumo do seu negócio</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Alertas */}
            {(stats?.payments_atrasado ?? 0) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
                <span className="text-xl">🔴</span>
                <p className="text-sm font-medium text-red-700">
                  {stats?.payments_atrasado} pagamento(s) em atraso —{' '}
                  <a href="/pagamentos" className="underline">ver agora</a>
                </p>
              </div>
            )}

            {/* Financeiro */}
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financeiro</h3>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-green-200 rounded-xl p-5">
                <p className="text-sm text-gray-500">Recebido este mês</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats?.receita_mes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="bg-white border border-yellow-200 rounded-xl p-5">
                <p className="text-sm text-gray-500">A receber</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats?.receita_pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                {(stats?.payments_pendente ?? 0) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{stats?.payments_pendente} cobrança(s) pendente(s)</p>
                )}
              </div>
              <div className="bg-white border border-red-200 rounded-xl p-5">
                <p className="text-sm text-gray-500">Em atraso</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{stats?.payments_atrasado}</p>
                <p className="text-xs text-gray-400 mt-1">pagamento(s)</p>
              </div>
            </div>

            {/* Portfólio */}
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Portfólio</h3>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Imóveis', value: stats?.properties, icon: '🏢', href: '/imoveis' },
                { label: 'Proprietários', value: stats?.owners, icon: '👔', href: '/proprietarios' },
                { label: 'Inquilinos', value: stats?.tenants, icon: '👤', href: '/inquilinos' },
                { label: 'Contratos', value: stats?.contracts, icon: '📄', href: '/contratos' },
              ].map(s => (
                <a key={s.label} href={s.href}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <span className="text-lg">{s.icon}</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                </a>
              ))}
            </div>

            {/* Operacional */}
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Operacional</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <a href="/crm" className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Leads no CRM</p>
                  <span className="text-lg">🎯</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.leads}</p>
              </a>
              <a href="/vistorias" className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Vistorias</p>
                  <span className="text-lg">🗓️</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.inspections}</p>
              </a>
            </div>
          </>
        )}

        {/* Módulos */}
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Acesso rápido</h3>
        <div className="grid grid-cols-3 gap-4">
          {modules.map(mod => (
            <a key={mod.title} href={mod.href}
              className={`rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer ${mod.color}`}>
              <div className="text-2xl mb-2">{mod.icon}</div>
              <h4 className="font-semibold text-gray-900 mb-1">{mod.title}</h4>
              <p className="text-sm text-gray-500">{mod.description}</p>
            </a>
          ))}
        </div>

      </main>
    </div>
  )
}