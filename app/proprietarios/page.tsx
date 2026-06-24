'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Owner = {
  id: string; name: string; cpf: string; rg: string
  email: string; phone: string; address: string; notes: string
  properties?: { id: string; name: string; rent_value: number }[]
}

const EMPTY = { name: '', cpf: '', rg: '', email: '', phone: '', address: '', notes: '' }

export default function ProprietariosPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadOwners() }, [])

  async function loadOwners() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('people')
      .select(`
        *,
        properties:properties!people_owner_id(id, name, rent_value)
      `)
      .not('properties', 'is', null)
      .order('created_at', { ascending: false })
    setOwners(data ?? [])
    setLoading(false)
  }

  function startEdit(owner: Owner) {
    setEditingId(owner.id)
    setForm({ name: owner.name, cpf: owner.cpf ?? '', rg: owner.rg ?? '', email: owner.email ?? '', phone: owner.phone ?? '', address: owner.address ?? '', notes: owner.notes ?? '' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY)
  }

  async function handleSave() {
    if (!form.name || !form.phone) { alert('Nome e telefone são obrigatórios'); return }
    setSaving(true)
    if (editingId) {
      await supabase.from('people').update(form).eq('id', editingId)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('people').insert({ user_id: user!.id, ...form })
    }
    cancelForm()
    loadOwners()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este proprietário?')) return
    await supabase.from('people').delete().eq('id', id)
    loadOwners()
  }

  const totalPortfolio = owners.reduce((acc, o) => acc + (o.properties?.reduce((s, p) => s + p.rent_value, 0) ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Proprietários</h2>
            <p className="text-gray-500 mt-1">Donos dos imóveis que você administra</p>
          </div>
          <button onClick={() => { cancelForm(); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Novo proprietário
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Proprietários', value: owners.length.toString() },
            { label: 'Imóveis sob gestão', value: owners.reduce((acc, o) => acc + (o.properties?.length ?? 0), 0).toString() },
            { label: 'Receita total/mês', value: totalPortfolio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), green: true },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.green ? 'text-green-600' : 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingId ? 'Editar proprietário' : 'Novo proprietário'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nome completo *', key: 'name', span: 2, placeholder: 'Ex: Roberto Alves' },
                { label: 'CPF', key: 'cpf', placeholder: 'Ex: 123.456.789-00' },
                { label: 'RG', key: 'rg', placeholder: 'Ex: 12.345.678-9' },
                { label: 'Telefone *', key: 'phone', placeholder: 'Ex: (19) 99999-9999' },
                { label: 'E-mail', key: 'email', placeholder: 'Ex: roberto@email.com' },
                { label: 'Endereço', key: 'address', span: 2, placeholder: 'Ex: Rua das Palmeiras, 456 - Campinas/SP' },
                { label: 'Observações', key: 'notes', span: 2, placeholder: 'Preferências, instruções especiais...' },
              ].map(field => (
                <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  <input type="text" value={(form as any)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar proprietário'}
              </button>
              <button onClick={cancelForm} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? <p className="text-gray-500 text-sm">Carregando...</p> : owners.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🏘️</p>
            <p className="text-gray-500">Nenhum proprietário cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {owners.map(owner => (
              <div key={owner.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{owner.name}</h4>
                    <p className="text-sm text-gray-500">{owner.phone}</p>
                    {owner.email && <p className="text-sm text-gray-400">{owner.email}</p>}
                    {owner.cpf && <p className="text-xs text-gray-400 mt-1">CPF: {owner.cpf}</p>}
                    {owner.address && <p className="text-xs text-gray-400">{owner.address}</p>}
                    {owner.notes && <p className="text-xs text-gray-400 italic mt-1">{owner.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{owner.properties?.length ?? 0} imóvel(is)</p>
                    {(owner.properties?.length ?? 0) > 0 && (
                      <p className="text-sm font-semibold text-green-600">
                        {owner.properties!.reduce((s, p) => s + p.rent_value, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                      </p>
                    )}
                  </div>
                </div>
                {owner.properties && owner.properties.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mb-3 space-y-1">
                    {owner.properties.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span className="text-gray-600">{p.name}</span>
                        <span className="text-green-600 font-medium">{p.rent_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button onClick={() => startEdit(owner)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleDelete(owner.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                    🗑️ Remover
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