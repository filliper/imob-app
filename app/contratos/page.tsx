'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import Sidebar from '@/app/components/Sidebar'


type Owner = {
  id: string
  name: string
  cpf: string
  rg: string
  address: string
  phone: string
  email: string
}

type Property = {
  id: string
  name: string
  address: string
  rent_value: number
  owner_id: string
  owners: Owner | null
}

type Tenant = {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
}

type Contract = {
  id: string
  type: string
  start_date: string
  end_date: string
  value: number
  indice_reajuste: string
  multa_rescisao: string
  fiador_nome: string
  fiador_cpf: string
  fiador_rg: string
  fiador_endereco: string
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
        indice_reajuste: 'IPCA',
        multa_rescisao: '3',
        tem_fiador: false,
        fiador_nome: '',
        fiador_cpf: '',
        fiador_rg: '',
        fiador_endereco: '',
    }) 

  const supabase = createClient()
  const router = useRouter()


  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('contracts').select(`*,
            properties(*, owners(*)),
            tenants(*)`).order('created_at', { ascending: false }),
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
        indice_reajuste: form.indice_reajuste,
        multa_rescisao: form.multa_rescisao,
        fiador_nome: form.tem_fiador ? form.fiador_nome : null,
        fiador_cpf: form.tem_fiador ? form.fiador_cpf : null,
        fiador_rg: form.tem_fiador ? form.fiador_rg : null,
        fiador_endereco: form.tem_fiador ? form.fiador_endereco : null,
    })
    if (error) { alert('Erro: ' + error.message) }
    else {
      setForm({
        property_id: '',
        tenant_id: '',
        type: 'rental',
        start_date: '',
        end_date: '',
        value: '',
        indice_reajuste: 'IPCA',
        multa_rescisao: '3',
        tem_fiador: false,
        fiador_nome: '',
        fiador_cpf: '',
        fiador_rg: '',
        fiador_endereco: '',
      })
      setShowForm(false)
      loadAll()
    }
    setSaving(false)
  }

async function generatePDF(contract: Contract) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  const property = contract.properties
  const tenant = contract.tenants
  const owner = property?.owners

  // ── CABEÇALHO ──
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageWidth, 38, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')

  const titles: Record<string, string> = {
    rental: 'CONTRATO DE LOCAÇÃO RESIDENCIAL',
    service: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
    sale: 'CONTRATO DE COMPRA E VENDA',
  }
  doc.text(titles[contract.type] ?? 'CONTRATO', pageWidth / 2, 16, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · ImobApp`, pageWidth / 2, 26, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  let y = 48

  // ── QUALIFICAÇÃO DAS PARTES ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('1. QUALIFICAÇÃO DAS PARTES', margin + 3, y + 5)
  y += 12

  // LOCADOR — dados do proprietário do imóvel
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('LOCADOR(A):', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 6

  if (owner?.name) {
    doc.text(`Nome: ${owner.name}`, margin + 4, y); y += 6
    if (owner.cpf) { doc.text(`CPF: ${owner.cpf}`, margin + 4, y); y += 6 }
    if (owner.rg) { doc.text(`RG: ${owner.rg}`, margin + 4, y); y += 6 }
    if (owner.address) { doc.text(`Endereço: ${owner.address}`, margin + 4, y); y += 6 }
    if (owner.phone) { doc.text(`Telefone: ${owner.phone}`, margin + 4, y); y += 6 }
    if (owner.email) { doc.text(`E-mail: ${owner.email}`, margin + 4, y); y += 6 }
  } else {
    doc.setTextColor(150)
    doc.text('(Proprietário não vinculado ao imóvel — vincule em Imóveis)', margin + 4, y)
    doc.setTextColor(0)
    y += 6
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text('LOCATÁRIO(A):', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 6
  doc.text(`Nome: ${tenant.name}`, margin + 4, y); y += 6
  doc.text(`CPF: ${tenant.cpf}`, margin + 4, y); y += 6
  if (tenant.email) { doc.text(`E-mail: ${tenant.email}`, margin + 4, y); y += 6 }
  if (tenant.phone) { doc.text(`Telefone: ${tenant.phone}`, margin + 4, y); y += 6 }

  if (contract.fiador_nome) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.text('FIADOR(A):', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(`Nome: ${contract.fiador_nome}`, margin + 4, y); y += 6
    if (contract.fiador_cpf) { doc.text(`CPF: ${contract.fiador_cpf}`, margin + 4, y); y += 6 }
    if (contract.fiador_rg) { doc.text(`RG: ${contract.fiador_rg}`, margin + 4, y); y += 6 }
    if (contract.fiador_endereco) { doc.text(`Endereço: ${contract.fiador_endereco}`, margin + 4, y); y += 6 }
  }

  y += 6

  // ── DO IMÓVEL ──
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('2. DO IMÓVEL', margin + 3, y + 5)
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`O imóvel objeto deste contrato está localizado à: ${property.address}`, margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 12

  // ── DO PRAZO ──
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('3. DO PRAZO', margin + 3, y + 5)
  y += 12
  doc.setFont('helvetica', 'normal')
  const startFormatted = new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
  const endFormatted = contract.end_date
    ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
    : 'indeterminado'
  doc.text(`O presente contrato terá início em ${startFormatted} e término em ${endFormatted}.`, margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 12

  // ── DO VALOR ──
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('4. DO VALOR E REAJUSTE', margin + 3, y + 5)
  y += 12
  doc.setFont('helvetica', 'normal')
  const valueFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  doc.text(`O aluguel mensal fica estabelecido em ${valueFormatted}, a ser pago até o dia 10 de cada mês.`, margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 8
  const indice = contract.indice_reajuste ?? 'IPCA'
  doc.text(`O valor será reajustado anualmente com base no índice ${indice}, conforme legislação vigente.`, margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 12

  // ── DAS OBRIGAÇÕES ──
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('5. DAS OBRIGAÇÕES DO LOCATÁRIO', margin + 3, y + 5)
  y += 12
  doc.setFont('helvetica', 'normal')
  const obrigacoes = [
    '5.1 Pagar pontualmente o aluguel na data convencionada.',
    '5.2 Conservar o imóvel e realizar pequenos reparos de manutenção.',
    '5.3 Não sublocar, ceder ou emprestar o imóvel sem autorização escrita do locador.',
    '5.4 Restituir o imóvel ao término do contrato nas mesmas condições recebidas.',
    '5.5 Não realizar modificações estruturais sem prévia autorização por escrito.',
    '5.6 Permitir vistorias periódicas com aviso prévio de 24 horas.',
  ]
  obrigacoes.forEach(o => {
    doc.text(o, margin + 4, y, { maxWidth: contentWidth - 4 }); y += 7
  })
  y += 4

  // ── DA RESCISÃO ──
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('6. DA RESCISÃO E MULTA', margin + 3, y + 5)
  y += 12
  doc.setFont('helvetica', 'normal')
  const meses = contract.multa_rescisao ?? '3'
  const mesesLabel = meses === '1' ? 'um' : meses === '2' ? 'dois' : 'três'
  doc.text(`Em caso de rescisão antecipada pelo locatário, será devida multa equivalente a ${meses} (${mesesLabel}) mês(es) de aluguel.`, margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 8
  doc.text('A rescisão pelo locador sem justa causa implica devolução proporcional dos valores pagos.', margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 12

  // ── DISPOSIÇÕES GERAIS ──
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 245, 255)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.text('7. DISPOSIÇÕES GERAIS', margin + 3, y + 5)
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.text('O presente contrato é regido pela Lei do Inquilinato (Lei nº 8.245/91) e pelo Código Civil Brasileiro.', margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 8
  doc.text('Fica eleito o foro da comarca local para dirimir quaisquer dúvidas oriundas deste contrato.', margin + 4, y, { maxWidth: contentWidth - 4 })
  y += 16

  // ── ASSINATURAS ──
  if (y > 230) { doc.addPage(); y = 20 }

  doc.setDrawColor(180)
  doc.line(margin, y, pageWidth / 2 - 10, y)
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
  y += 5
  doc.setFontSize(9)
  doc.text(owner?.name ?? 'Locador(a)', pageWidth / 4, y, { align: 'center' })
  doc.text(tenant.name, (pageWidth / 4) * 3, y, { align: 'center' })
  y += 4
  doc.setTextColor(120)
  doc.text('LOCADOR(A)', pageWidth / 4, y, { align: 'center' })
  doc.text('LOCATÁRIO(A)', (pageWidth / 4) * 3, y, { align: 'center' })
  doc.setTextColor(0)

  if (contract.fiador_nome) {
    y += 14
    doc.line(pageWidth / 2 - 55, y, pageWidth / 2 + 55, y)
    y += 5
    doc.text(contract.fiador_nome, pageWidth / 2, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('FIADOR(A)', pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0)
  }

  // ── RODAPÉ ──
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 290, { align: 'center' })

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
              <div>
              <label className="text-sm font-medium text-gray-700">Índice de reajuste</label>
                <select value={form.indice_reajuste} onChange={e => setForm({ ...form, indice_reajuste: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="IPCA">IPCA</option>
                    <option value="IGP-M">IGP-M</option>
                    <option value="INPC">INPC</option>
                </select>
                </div>
            <div>
            <label className="text-sm font-medium text-gray-700">Multa por rescisão (meses)</label>
            <select value={form.multa_rescisao} onChange={e => setForm({ ...form, multa_rescisao: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="1">1 mês</option>
                <option value="2">2 meses</option>
                <option value="3">3 meses</option>
            </select>
            </div>
            <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.tem_fiador}
                onChange={e => setForm({ ...form, tem_fiador: e.target.checked })}
                className="rounded border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Incluir fiador no contrato</span>
            </label>
            </div>

            {form.tem_fiador && (
            <>
                <div>
                <label className="text-sm font-medium text-gray-700">Nome do fiador</label>
                <input type="text" value={form.fiador_nome} onChange={e => setForm({ ...form, fiador_nome: e.target.value })}
                    placeholder="Ex: Carlos Souza"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                <label className="text-sm font-medium text-gray-700">CPF do fiador</label>
                <input type="text" value={form.fiador_cpf} onChange={e => setForm({ ...form, fiador_cpf: e.target.value })}
                    placeholder="Ex: 987.654.321-00"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                <label className="text-sm font-medium text-gray-700">RG do fiador</label>
                <input type="text" value={form.fiador_rg} onChange={e => setForm({ ...form, fiador_rg: e.target.value })}
                    placeholder="Ex: 12.345.678-9"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                <label className="text-sm font-medium text-gray-700">Endereço do fiador</label>
                <input type="text" value={form.fiador_endereco} onChange={e => setForm({ ...form, fiador_endereco: e.target.value })}
                    placeholder="Ex: Av. Brasil, 100 - Campinas/SP"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </>
            )}
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