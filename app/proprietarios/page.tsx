'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Owner = {
  id: string
  name: string
  cpf: string
  rg: string
  email: string
  phone: string
  address: string
  notes: string
  properties?: { id: string; name: string; rent_value: number }[]
}

export default function ProprietariosPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Owner | null>(null)
  const [form, setForm] = useState({
    name: '', cpf: '', rg: '', email: '', phone: '', address: '', notes: ''
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadOwners() }, [])

  async function loadOwners() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('owners')
      .select('*, properties(id, name, rent_value)')
      .order('created_at', { ascending: false })

    setOwners(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name || !form.phone) { alert('Nome e telefone são obrigatórios'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('owners').insert({ user_id: user!.id, ...form })
    if (error) { alert('Erro: ' + error.message) }
    else {
      setForm({ name: '', cpf: '', rg: '', email: '', phone: '', address: '', notes: '' })
      setShowForm(false)
      loadOwners()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este proprietário?')) return
    await supabase.from('owners').delete().eq('id', id)
    setSelected(null)
    loadOwners()
  }

  const totalPortfolio = owners.reduce((acc, o) =>
    acc + (o.properties?.reduce((s, p) => s + p.rent_value, 0) ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Proprietários</h2>
            <p className="text-gray-500 mt-1">Donos dos imóveis que você administra</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Novo proprietário
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Proprietários</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{owners.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Imóveis sob gestão</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {owners.reduce((acc, o) => acc + (o.properties?.length ?? 0), 0)}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Receita total/mês</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {totalPortfolio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Novo proprietário</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Nome completo *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Roberto Alves"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">CPF</label>
                <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
                  placeholder="Ex: 123.456.789-00"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">RG</label>
                <input type="text" value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })}
                  placeholder="Ex: 12.345.678-9"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Telefone *</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (19) 99999-9999"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Ex: roberto@email.com"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Endereço</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Ex: Rua das Palmeiras, 456 - Campinas/SP"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Preferências, instruções especiais..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar proprietário'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : owners.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🏘️</p>
            <p className="text-gray-500">Nenhum proprietário cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {owners.map(owner => (
              <div key={owner.id}
                onClick={() => setSelected(selected?.id === owner.id ? null : owner)}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{owner.name}</h4>
                    <p className="text-sm text-gray-500">{owner.phone}</p>
                    {owner.email && <p className="text-sm text-gray-400">{owner.email}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{owner.properties?.length ?? 0} imóvel(is)</p>
                    {(owner.properties?.length ?? 0) > 0 && (
                      <p className="text-sm font-semibold text-green-600">
                        {owner.properties!.reduce((s, p) => s + p.rent_value, 0)
                          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                      </p>
                    )}
                  </div>
                </div>

                {/* Imóveis do proprietário */}
                {owner.properties && owner.properties.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-1">
                    {owner.properties.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span className="text-gray-600">{p.name}</span>
                        <span className="text-green-600 font-medium">
                          {p.rent_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expandido */}
                {selected?.id === owner.id && (
                  <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
                    {owner.cpf && <p className="text-xs text-gray-500">CPF: {owner.cpf}</p>}
                    {owner.rg && <p className="text-xs text-gray-500">RG: {owner.rg}</p>}
                    {owner.address && <p className="text-xs text-gray-500">Endereço: {owner.address}</p>}
                    {owner.notes && <p className="text-xs text-gray-400 italic">{owner.notes}</p>}
                    <button onClick={e => { e.stopPropagation(); handleDelete(owner.id) }}
                      className="mt-2 text-xs text-red-500 hover:text-red-700">
                      Remover proprietário
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}