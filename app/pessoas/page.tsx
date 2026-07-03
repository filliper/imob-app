'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Person = {
  id: string
  name: string
  cpf: string
  rg: string
  email: string
  phone: string
  address: string
  notes: string
  properties_owned?: { id: string; name: string; rent_value: number }[]
  contracts_as_tenant?: { id: string; type: string; properties: { name: string } }[]
}

const EMPTY = { name: '', cpf: '', rg: '', email: '', phone: '', address: '', notes: '' }

const typeLabel: Record<string, string> = {
  rental: 'Locação Residencial', commercial: 'Locação Comercial',
  intermediacao: 'Intermediação', promessa_compra_venda: 'Promessa C/V',
  administracao: 'Administração', exclusividade: 'Exclusividade',
  compra_venda: 'Compra e Venda', servicos: 'Prestação de Serviços',
}

export default function PessoasPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'proprietarios' | 'inquilinos' | 'sem_papel'>('todos')
  const [form, setForm] = useState(EMPTY)
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => { loadPeople() }, [])

  // Read filter from URL query parameters on initial load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const paramFilter = searchParams.get('filter')
    if (paramFilter && ['todos', 'proprietarios', 'inquilinos', 'sem_papel'].includes(paramFilter as any)) {
      setFilter(paramFilter as 'todos' | 'proprietarios' | 'inquilinos' | 'sem_papel')
    }
  }, [])

  // Update URL when filter changes (without triggering page reload)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set('filter', filter)
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({ path: newUrl }, '', newUrl)
  }, [filter, router])

  async function loadPeople() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('people')
      .select(`
        *,
        properties_owned:properties!people_owner_id(id, name, rent_value),
        contracts_as_tenant:contracts!people_tenant_id(id, type, properties(name))
      `)
      .order('created_at', { ascending: false })

    setPeople(data ?? [])
    setLoading(false)
  }

  function startEdit(p: Person) {
    setEditingId(p.id)
    setForm({
      name: p.name, cpf: p.cpf ?? '', rg: p.rg ?? '', email: p.email ?? '',
      phone: p.phone ?? '', address: p.address ?? '', notes: p.notes ?? '',
    })
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
    loadPeople()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta pessoa? Isso pode afetar imóveis e contratos vinculados.')) return
    await supabase.from('people').delete().eq('id', id)
    loadPeople()
  }

  const filtered = people.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf?.includes(search) ||
      p.phone?.includes(search)

    const isOwner = (p.properties_owned?.length ?? 0) > 0
    const isTenant = (p.contracts_as_tenant?.length ?? 0) > 0

    const matchFilter =
      filter === 'todos' ? true :
      filter === 'proprietarios' ? isOwner :
      filter === 'inquilinos' ? isTenant :
      filter === 'sem_papel' ? (!isOwner && !isTenant) : true

    return matchSearch && matchFilter
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pessoas</h2>
            <p className="text-gray-500 mt-1">Cadastro único — proprietários, inquilinos e prestadores</p>
          </div>
          <button onClick={() => { cancelForm(); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Nova pessoa
          </button>
        </div>

        {/* Busca e filtros */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {([
              { id: 'todos', label: 'Todos' },
              { id: 'proprietarios', label: '👔 Proprietários' },
              { id: 'inquilinos', label: '👤 Inquilinos' },
              { id: 'sem_papel', label: 'Sem papel' },
            ] as const).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingId ? 'Editar pessoa' : 'Nova pessoa'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nome completo *', key: 'name', span: 2, placeholder: 'Ex: Roberto Alves' },
                { label: 'CPF', key: 'cpf', placeholder: 'Ex: 123.456.789-00' },
                { label: 'RG', key: 'rg', placeholder: 'Ex: 12.345.678-9' },
                { label: 'Telefone *', key: 'phone', placeholder: 'Ex: (19) 99999-9999' },
                { label: 'E-mail', key: 'email', placeholder: 'Ex: roberto@email.com' },
                { label: 'Endereço', key: 'address', span: 2, placeholder: 'Ex: Rua das Palmeiras, 456 - Campinas/SP' },
                { label: 'Observações', key: 'notes', span: 2, placeholder: 'Anotações gerais...' },
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
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar pessoa'}
              </button>
              <button onClick={cancelForm} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-500">Nenhuma pessoa encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(p => {
              const isOwner = (p.properties_owned?.length ?? 0) > 0
              const isTenant = (p.contracts_as_tenant?.length ?? 0) > 0

              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{p.name}</h4>
                      <p className="text-sm text-gray-500">{p.phone}</p>
                      {p.email && <p className="text-sm text-gray-400">{p.email}</p>}
                      {p.cpf && <p className="text-xs text-gray-400 mt-1">CPF: {p.cpf}</p>}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {isOwner && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">👔 Proprietário</span>}
                      {isTenant && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">👤 Inquilino/Cliente</span>}
                      {!isOwner && !isTenant && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sem papel ainda</span>}
                    </div>
                  </div>

                  {isOwner && (
                    <div className="border-t border-gray-100 pt-2 mb-2">
                      <p className="text-xs font-medium text-gray-400 mb-1">Imóveis (proprietário)</p>
                      {p.properties_owned!.map(prop => (
                        <div key={prop.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{prop.name}</span>
                          <span className="text-green-600 font-medium">
                            {prop.rent_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isTenant && (
                    <div className="border-t border-gray-100 pt-2 mb-2">
                      <p className="text-xs font-medium text-gray-400 mb-1">Contratos (inquilino/cliente)</p>
                      {p.contracts_as_tenant!.map(c => (
                        <div key={c.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{c.properties?.name}</span>
                          <span className="text-blue-600">{typeLabel[c.type]}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => startEdit(p)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                      🗑️ Remover
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}