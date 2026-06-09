'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import Sidebar from '@/app/components/Sidebar'


type Property = { id: string; name: string; address: string; rent_value: number }
type Tenant = { id: string; name: string; cpf: string; email: string; phone: string }
type Contract = {
  id: string
  type: string
  start_date: string
  end_date: string
  value: number
  properties: Property
  tenants: Tenant
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    property_id: '',
    tenant_id: '',
    type: 'rental',
    start_date: '',
    end_date: '',
    value: '',
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('contracts').select('*, properties(*), tenants(*)').order('created_at', { ascending: false }),
      supabase.from('properties').select('*'),
      supabase.from('tenants').select('*'),
    ])

    setContracts(c ?? [])
    setProperties(p ?? [])
    setTenants(t ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.property_id || !form.tenant_id || !form.start_date || !form.value) {
      alert('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('contracts').insert({
      user_id: user!.id,
      property_id: form.property_id,
      tenant_id: form.tenant_id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      value: parseFloat(form.value),
    })
    if (error) { alert('Erro: ' + error.message) }
    else {
      setForm({ property_id: '', tenant_id: '', type: 'rental', start_date: '', end_date: '', value: '' })
      setShowForm(false)
      loadAll()
    }
    setSaving(false)
  }

  function generatePDF(contract: Contract) {
    const doc = new jsPDF()
    const property = contract.properties
    const tenant = contract.tenants
    const pageWidth = doc.internal.pageSize.getWidth()

    // Cabeçalho
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE LOCAÇÃO RESIDENCIAL', pageWidth / 2, 30, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} pelo ImobApp`, pageWidth / 2, 40, { align: 'center' })

    // Linha separadora
    doc.setDrawColor(200)
    doc.line(20, 46, 190, 46)
    doc.setTextColor(0)

    // Seção 1 - Imóvel
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('1. DO IMÓVEL', 20, 58)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`O imóvel objeto deste contrato está localizado à:`, 20, 68)
    doc.setFont('helvetica', 'bold')
    doc.text(property.address, 20, 76)
    doc.setFont('helvetica', 'normal')
    doc.text(`Identificação: ${property.name}`, 20, 84)

    // Seção 2 - Locatário
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('2. DO LOCATÁRIO', 20, 100)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nome completo: ${tenant.name}`, 20, 110)
    doc.text(`CPF: ${tenant.cpf}`, 20, 118)
    if (tenant.email) doc.text(`E-mail: ${tenant.email}`, 20, 126)
    if (tenant.phone) doc.text(`Telefone: ${tenant.phone}`, 20, 134)

    // Seção 3 - Prazo
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('3. DO PRAZO', 20, 150)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const startFormatted = new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
    const endFormatted = contract.end_date
      ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'Indeterminado'
    doc.text(`Início: ${startFormatted}`, 20, 160)
    doc.text(`Término: ${endFormatted}`, 20, 168)
    doc.text(`Duração: 30 (trinta) meses`, 20, 176)

    // Seção 4 - Valor
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('4. DO VALOR DO ALUGUEL', 20, 192)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const valueFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    doc.text(`O aluguel mensal fica estabelecido em ${valueFormatted}`, 20, 202)
    doc.text(`a ser pago até o dia 10 (dez) de cada mês.`, 20, 210)

    // Seção 5 - Cláusulas
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('5. DAS OBRIGAÇÕES DO LOCATÁRIO', 20, 226)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const clausulas = [
      '5.1 Pagar pontualmente o aluguel na data convencionada.',
      '5.2 Conservar o imóvel como se fosse seu, realizando pequenos reparos.',
      '5.3 Não sublocar, ceder ou emprestar o imóvel sem autorização do locador.',
      '5.4 Restituir o imóvel ao final do contrato nas mesmas condições em que o recebeu.',
      '5.5 Não realizar modificações no imóvel sem prévia autorização por escrito.',
    ]
    clausulas.forEach((c, i) => {
      doc.text(c, 20, 236 + i * 8)
    })

    // Assinaturas
    doc.setFontSize(11)
    doc.line(20, 286, 190, 286)
    doc.text('Campinas/SP, ' + new Date().toLocaleDateString('pt-BR'), pageWidth / 2, 294, { align: 'center' })

    doc.line(30, 315, 95, 315)
    doc.text('Locador', 62, 322, { align: 'center' })

    doc.line(115, 315, 180, 315)
    doc.text(tenant.name, 147, 322, { align: 'center' })
    doc.text('Locatário', 147, 329, { align: 'center' })

    // Rodapé
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 285, { align: 'center' })

    doc.save(`contrato-${tenant.name.toLowerCase().replace(/ /g, '-')}.pdf`)
  }

  const typeLabel: Record<string, string> = {
    rental: 'Aluguel',
    service: 'Prestação de Serviço',
    sale: 'Compra e Venda',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contratos</h2>
            <p className="text-gray-500 mt-1">Gere contratos em PDF com um clique</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Novo contrato
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Novo contrato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Imóvel</label>
                <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o imóvel</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Inquilino</label>
                <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o inquilino</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo de contrato</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="rental">Aluguel</option>
                  <option value="service">Prestação de Serviço</option>
                  <option value="sale">Compra e Venda</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Valor mensal (R$)</label>
                <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                  placeholder="Ex: 1500"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data de início</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data de término (opcional)</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar contrato'}
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
        ) : contracts.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-gray-500">Nenhum contrato gerado ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo contrato" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {typeLabel[c.type]}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{c.tenants?.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">{c.properties?.name} · {c.properties?.address}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Início: {new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} ·{' '}
                    <span className="text-green-600 font-medium">
                      R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => generatePDF(c)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  ⬇ Baixar PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}