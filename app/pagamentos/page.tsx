'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Contract = {
  id: string
  value: number
  tenants: { name: string; phone: string }[]
  properties: { name: string }[]
}

type Payment = {
  id: string
  contract_id: string
  due_date: string
  paid_date: string | null
  amount: number
  status: string
  notes: string
  contracts: Contract
}

const statusStyle: Record<string, string> = {
  pago:     'bg-green-100 text-green-700 border-green-200',
  pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  atrasado: 'bg-red-100 text-red-700 border-red-200',
}

const statusIcon: Record<string, string> = {
  pago: '✅', pendente: '⏳', atrasado: '🔴'
}

export default function PagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'atrasado' | 'pago'>('todos')
  const [form, setForm] = useState({
    contract_id: '', due_date: '', amount: '', notes: ''
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadAll() }, [])

  // Auto-marcar atrasados
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    payments
      .filter(p => p.status === 'pendente' && p.due_date < today)
      .forEach(async p => {
        await supabase.from('payments').update({ status: 'atrasado' }).eq('id', p.id)
      })
  }, [payments])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('payments')
        .select('*, contracts(id, value, tenants(name, phone), properties(name))')
        .order('due_date', { ascending: false }),
      supabase.from('contracts')
        .select('id, value, tenants(name, phone), properties(name)'),
    ])

    setPayments(p ?? [])
    setContracts(c ?? []);
    setLoading(false)
  }

  async function handleSave() {
    if (!form.contract_id || !form.due_date || !form.amount) {
      alert('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payments').insert({
      user_id: user!.id,
      contract_id: form.contract_id,
      due_date: form.due_date,
      amount: parseFloat(form.amount),
      notes: form.notes,
      status: 'pendente',
    })
    setForm({ contract_id: '', due_date: '', amount: '', notes: '' })
    setShowForm(false)
    loadAll()
    setSaving(false)
  }

  async function markAsPaid(payment: Payment) {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('payments').update({
      status: 'pago',
      paid_date: today,
    }).eq('id', payment.id)
    loadAll()
  }

  async function markAsPending(payment: Payment) {
    await supabase.from('payments').update({
      status: 'pendente',
      paid_date: null,
    }).eq('id', payment.id)
    loadAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este pagamento?')) return
    await supabase.from('payments').delete().eq('id', id)
    loadAll()
  }

  function gerarCobrancasMes() {
    const hoje = new Date()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const ano = hoje.getFullYear()
    setForm(f => ({
      ...f,
      due_date: `${ano}-${mes}-10`,
    }))
    setShowForm(true)
  }

  const filtered = payments.filter(p => filter === 'todos' || p.status === filter)

  const totalPago = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const totalPendente = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const totalAtrasado = payments.filter(p => p.status === 'atrasado').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pagamentos</h2>
            <p className="text-gray-500 mt-1">Monitoramento de aluguéis e cobranças</p>
          </div>
          <div className="flex gap-3">
            <button onClick={gerarCobrancasMes}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              📅 Gerar cobrança do mês
            </button>
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + Nova cobrança
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Total cobranças</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
          </div>
          <div className="bg-white border border-green-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Recebido</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-white border border-yellow-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">A receber</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-white border border-red-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Em atraso</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {totalAtrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Alerta de atrasos */}
        {totalAtrasado > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🔴</span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {payments.filter(p => p.status === 'atrasado').length} pagamento(s) em atraso
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {payments
                  .filter(p => p.status === 'atrasado')
                  .map(p => p.contracts?.tenants?.map((t: any) => t.name).join(', ') ?? '')
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-2xl">
            <h3 className="font-semibold text-gray-900 mb-4">Nova cobrança</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Contrato (inquilino / imóvel)</label>
                <select value={form.contract_id} onChange={e => {
                  const c = contracts.find(c => c.id === e.target.value)
                  setForm({ ...form, contract_id: e.target.value, amount: c?.value.toString() ?? '' })
                }}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o contrato</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.tenants?.map((t: any) => t.name).join(', ') ?? ''} — {c.properties?.map((p: any) => p.name).join(', ') ?? ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data de vencimento</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Valor (R$)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="Preenchido automaticamente"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observações</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Inclui taxa de condomínio"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar cobrança'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {(['todos', 'pendente', 'atrasado', 'pago'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'todos' && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({payments.filter(p => p.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-500">Nenhuma cobrança encontrada.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Nova cobrança" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p.id} className={`bg-white border rounded-xl p-5 flex items-center justify-between ${
                p.status === 'atrasado' ? 'border-red-200' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{statusIcon[p.status]}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">{p.contracts?.tenants?.[0]?.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{Array.isArray(p.contracts?.properties) ? (p.contracts?.properties as any).map((pr: any) => pr.name).join(', ') : (p.contracts?.properties as any)?.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">
                        Vence: {new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      {p.paid_date && (
                        <p className="text-xs text-green-600">
                          Pago em: {new Date(p.paid_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {p.notes && <p className="text-xs text-gray-400 italic">{p.notes}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold text-gray-900">
                    {p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <div className="flex gap-2">
                    {p.status !== 'pago' ? (
                      <button onClick={() => markAsPaid(p)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                        ✓ Marcar como pago
                      </button>
                    ) : (
                      <button onClick={() => markAsPending(p)}
                        className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                        ↩ Desfazer
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)}
                      className="text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg text-xs hover:bg-red-50">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}