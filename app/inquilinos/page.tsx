'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Tenant = {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
}

export default function InquilinosPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', cpf: '', email: '', phone: '' })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadTenants() }, [])

  async function loadTenants() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    setTenants(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name || !form.cpf) { alert('Nome e CPF são obrigatórios'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tenants').insert({
      user_id: user!.id,
      name: form.name,
      cpf: form.cpf,
      email: form.email,
      phone: form.phone,
    })
    if (error) { alert('Erro: ' + error.message) }
    else {
      setForm({ name: '', cpf: '', email: '', phone: '' })
      setShowForm(false)
      loadTenants()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este inquilino?')) return
    await supabase.from('tenants').delete().eq('id', id)
    loadTenants()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inquilinos</h2>
            <p className="text-gray-500 mt-1">Gerencie seus inquilinos cadastrados</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Novo inquilino
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Novo inquilino</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome completo</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: João da Silva" 
                  className="mt-1 w-full placeholder-gray-400 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">CPF</label>
                <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
                  placeholder="Ex: 123.456.789-00"
                  className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Ex: joao@email.com"
                  className="mt-1 w-full placeholder-gray-400 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Telefone</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (19) 99999-9999"
                  className="mt-1 w-full placeholder-gray-400 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar inquilino'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : tenants.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-gray-500">Nenhum inquilino cadastrado ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo inquilino" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {tenants.map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{t.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">CPF: {t.cpf}</p>
                    {t.email && <p className="text-sm text-gray-500">{t.email}</p>}
                    {t.phone && <p className="text-sm text-gray-500">{t.phone}</p>}
                  </div>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 text-lg">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}