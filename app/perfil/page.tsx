'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'

export default function PerfilPage() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    full_name: '', cpf: '', rg: '', address: '', phone: ''
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      if (data) setForm({
        full_name: data.full_name ?? '',
        cpf: data.cpf ?? '',
        rg: data.rg ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
      })
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_profiles').upsert({ id: user!.id, ...form })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Meu perfil</h2>
          <p className="text-gray-500 mt-1">Seus dados aparecem automaticamente nos contratos</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Dados do locador</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Nome completo</label>
              <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="Ex: Maria da Silva"
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
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Endereço completo</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Ex: Rua das Palmeiras, 456 - Campinas/SP"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Telefone</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Ex: (19) 99999-9999"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={handleSave} disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">✓ Salvo com sucesso!</span>}
          </div>
        </div>
      </main>
    </div>
  )
}