'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Property = {
  id: string
  name: string
  address: string
  type: string
  rent_value: number
}

type Owner = { id: string; name: string }


export default function ImoveisPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [owners, setOwners] = useState<Owner[]>([])
  const [form, setForm] = useState({
    name: '',
    address: '',
    type: 'residential',
    rent_value: '',
    owner_id: '' as string,
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    setProperties(data ?? [])
    const { data: o } = await supabase
      .from('owners')
      .select('id, name')
    setOwners(o ?? [])

    setLoading(false)
  }

    async function handleSave() {
        if (!form.name || !form.address || !form.rent_value) { alert('Preencha todos os campos'); return }
        setSaving(true)
        if (editingId) {
            await supabase.from('properties').update({
                name: form.name, address: form.address,
                type: form.type, rent_value: parseFloat(form.rent_value),
            }).eq('id', editingId)
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('properties').insert({
                user_id: user!.id, name: form.name, address: form.address,
                type: form.type, rent_value: parseFloat(form.rent_value),
            })
        }
        setForm({ name: '', address: '', type: 'residential', rent_value: '', owner_id: '' })
        setEditingId(null)
        setShowForm(false)
        loadProperties()
        setSaving(false)
    }

  async function handleDelete(id: string) {
    if (!confirm('Remover este imóvel?')) return
    await supabase.from('properties').delete().eq('id', id)
    loadProperties()
  }

function startEdit(p: Property) {
  setEditingId(p.id)
  setForm({ name: p.name, address: p.address, type: p.type, rent_value: p.rent_value.toString() })
  setShowForm(true)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
        <Sidebar />

      {/* Main */}
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Imóveis</h2>
            <p className="text-gray-500 mt-1">Gerencie seus imóveis cadastrados</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Novo imóvel
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar imóvel' : 'Novo imóvel'}
                </h3>
<div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome / Identificação</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Apto 101 - Centro"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="residential">Residencial</option>
                  <option value="commercial">Comercial</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Endereço completo</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Ex: Rua das Flores, 123, Apto 101 - Campinas/SP"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Valor do aluguel (R$)</label>
                <input
                  type="number"
                  value={form.rent_value}
                  onChange={e => setForm({ ...form, rent_value: e.target.value })}
                  placeholder="Ex: 1500"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">Proprietário</label>
                <select
                    value={form.owner_id ?? ''}
                    onChange={e => setForm({ ...form, owner_id: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sem proprietário</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar imóvel'}
              </button>
<div className="flex gap-2 border-t border-gray-100 pt-3 mt-3">
  <button onClick={() => startEdit(p)}
    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
    ✏️ Editar
  </button>
  <button onClick={() => handleDelete(p.id)}
    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
    🗑️ Remover
  </button>
</div>
              <button
                onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : properties.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-gray-500">Nenhum imóvel cadastrado ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo imóvel" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {properties.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{p.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{p.address}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {p.type === 'residential' ? 'Residencial' : 'Comercial'}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        R$ {p.rent_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500 text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}