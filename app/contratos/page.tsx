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

  const startFormatted = new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
  const endFormatted = contract.end_date
    ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
    : 'indeterminado'
  const valueFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const indice = contract.indice_reajuste ?? 'IPCA/IBGE'
  const multa = contract.multa_rescisao ?? '3'
  const multaExt = multa === '1' ? 'um' : multa === '2' ? 'dois' : 'três'

  // Helpers
  const addTitle = (text: string, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(text, pageWidth / 2, y, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    return y + 8
  }

  const addSection = (title: string, y: number): number => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(title, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    return y + 7
  }

  const addText = (text: string, y: number, indent = 0): number => {
    if (y > 265) { doc.addPage(); y = 20 }
    const lines = doc.splitTextToSize(text, contentWidth - indent)
    doc.text(lines, margin + indent, y)
    return y + lines.length * 5.5
  }

  const addItem = (text: string, y: number): number => {
    if (y > 265) { doc.addPage(); y = 20 }
    const lines = doc.splitTextToSize(text, contentWidth - 6)
    doc.text(lines, margin + 6, y)
    return y + lines.length * 5.5 + 1
  }

  let y = 20

  // ── TÍTULO ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO', pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.text('PARA FINS RESIDENCIAIS', pageWidth / 2, y, { align: 'center' })
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  // ── PREÂMBULO ──
  y = addText('Pelo presente instrumento particular de contrato de locação de imóvel para fins residenciais e na melhor forma de Direito, as partes abaixo qualificadas:', y)
  y += 4

  // ── LOCADOR ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('LOCADOR', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  if (owner?.name) {
    y = addItem(`${owner.name}${owner.cpf ? `, CPF nº ${owner.cpf}` : ''}${owner.rg ? `, RG nº ${owner.rg}` : ''}${owner.address ? `, residente na ${owner.address}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}${owner.phone ? `, telefone: ${owner.phone}` : ''}.`, y)
  } else {
    y = addItem('(Proprietário não vinculado — acesse Imóveis e vincule um proprietário)', y)
  }
  y += 3

  // ── LOCATÁRIO ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('e, de outro lado,', margin, y); y += 5
  doc.text('LOCATÁRIO', margin, y); y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  y = addItem(`${tenant.name}${tenant.cpf ? `, CPF nº ${tenant.cpf}` : ''}${tenant.email ? `, e-mail: ${tenant.email}` : ''}${tenant.phone ? `, telefone: ${tenant.phone}` : ''}.`, y)
  y += 3

  // ── FIADOR ──
  if (contract.fiador_nome) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('E ainda, na qualidade de Fiador,', margin, y); y += 5
    doc.text('FIADOR', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`${contract.fiador_nome}${contract.fiador_cpf ? `, CPF nº ${contract.fiador_cpf}` : ''}${contract.fiador_rg ? `, RG nº ${contract.fiador_rg}` : ''}${contract.fiador_endereco ? `, residente na ${contract.fiador_endereco}` : ''}.`, y)
    y += 3
  }

  y = addText('Doravante designados, individualmente, como "Parte" e, em conjunto, "Partes", tendo entre si justo e contratado o seguinte:', y)
  y += 6

  // ── 1. OBJETO ──
  y = addSection('1. OBJETO', y)
  y = addItem(`1.1 O objeto do presente instrumento consiste na locação pelo Locatário do imóvel de propriedade do Locador, situado na ${property.address} (o "Imóvel").`, y)
  y += 3

  // ── 2. DESTINAÇÃO ──
  y = addSection('2. DA DESTINAÇÃO DO IMÓVEL', y)
  y = addItem('2.1 O LOCATÁRIO declara que o imóvel, ora locado, destina-se única e exclusivamente para o seu uso RESIDENCIAL.', y)
  y = addItem('2.2 O uso indevido e/ou diverso do Imóvel e a inobservância das normas decorrentes dos bons costumes serão motivos para a rescisão contratual e consequente despejo por infração contratual.', y)
  y += 3

  // ── 3. PRAZO ──
  y = addSection('3. DO PRAZO DA LOCAÇÃO', y)
  y = addItem(`3.1 O Locador dá em locação ao Locatário o Imóvel a partir de ${startFormatted}, para terminar em ${endFormatted}.`, y)
  y = addItem('3.2 O Locatário declara haver vistoriado o Imóvel e que o está recebendo em perfeito estado de limpeza, conservação e funcionalidade.', y)
  y += 3

  // ── 4. VALOR ──
  y = addSection('4. DO VALOR DO ALUGUEL', y)
  y = addItem(`4.1 O aluguel mensal livremente ajustado entre as partes é de ${valueFormatted}, a contar de ${startFormatted}.`, y)
  y = addItem(`4.2 O aluguel mensal será reajustado anualmente de acordo com a variação acumulada do ${indice}.`, y)
  y = addItem('4.3 A falta de pagamento nas épocas determinadas constituirá o Locatário em mora, independentemente de qualquer aviso ou interpelação judicial ou extrajudicial.', y)
  y += 3

  // ── 5. VENCIMENTO ──
  y = addSection('5. DO VENCIMENTO', y)
  y = addItem('5.1 O Locatário obriga-se a pagar o valor do aluguel mensal até o dia 10 (dez) de cada mês, em moeda corrente nacional.', y)
  y = addItem('5.2 Após a data do vencimento, o valor devido será acrescido de multa de 10% (dez por cento), juros de mora de 1% (um por cento) ao mês e correção pelo índice contratual.', y)
  y += 3

  // ── 6. BENFEITORIAS ──
  y = addSection('6. DAS BENFEITORIAS', y)
  y = addItem('6.1 O Locatário obriga-se a manter o imóvel em perfeitas condições de higiene e limpeza, restituindo-o nas mesmas condições em que o recebeu.', y)
  y = addItem('6.2 É vedado ao Locatário efetuar qualquer tipo de reforma ou benfeitoria voluptuária sem prévia autorização escrita do Locador.', y)
  y += 3

  // ── 7. ENCARGOS ──
  y = addSection('7. DOS ENCARGOS', y)
  y = addItem('7.1 Correrão por conta do Locatário todas as despesas de energia elétrica, água, esgoto, gás, condomínio e tributos incidentes sobre o imóvel.', y)
  y += 3

  // ── 8. VISTORIA ──
  y = addSection('8. DA VISTORIA DO IMÓVEL', y)
  y = addItem('8.1 O Locador fica desde já autorizado a vistoriar o imóvel sempre que julgar conveniente, nos dias úteis entre 8h e 18h, mediante aviso prévio de 24 horas.', y)
  y += 3

  // ── 9. MULTA ──
  y = addSection('9. DA MULTA', y)
  y = addItem(`9.1 A infração de qualquer cláusula deste Instrumento sujeitará o infrator a multa equivalente a ${multa} (${multaExt}) aluguéis mensais vigentes na data da infração.`, y)
  y += 3

  // ── 10. RESCISÃO ──
  if (y > 250) { doc.addPage(); y = 20 }
  y = addSection('10. DA RESCISÃO DO CONTRATO', y)
  y = addItem(`10.1 A rescisão antecipada pelo Locatário, ressalvadas as hipóteses legais, implicará multa equivalente a ${multa} (${multaExt}) aluguéis mensais.`, y)
  y = addItem('10.2 Após o 15º mês de aluguel, fica facultado ao Locatário, mediante notificação por escrito, rescindir o presente Instrumento sem aplicação de penalidade.', y)
  y += 3

  // ── 11. SUBLOCAÇÃO ──
  y = addSection('11. DA SUBLOCAÇÃO', y)
  y = addItem('11.1 É vedado ao LOCATÁRIO sublocar, transferir ou ceder o imóvel sem o consentimento prévio e por escrito do LOCADOR.', y)
  y += 3

  // ── 12. GARANTIA ──
  if (contract.fiador_nome) {
    y = addSection('12. DA GARANTIA LOCATÍCIA — FIADOR', y)
    y = addItem(`12.1 O FIADOR ${contract.fiador_nome}${contract.fiador_cpf ? `, CPF ${contract.fiador_cpf}` : ''}, como principal pagador, responde solidariamente por todos os pagamentos até a efetiva entrega das chaves ao LOCADOR.`, y)
    y += 3
  }

  // ── 13. LGPD ──
  y = addSection('13. DA OBSERVÂNCIA À LGPD', y)
  y = addItem('13.1 O LOCATÁRIO declara expresso consentimento que o LOCADOR irá coletar, tratar e compartilhar os dados necessários ao cumprimento do contrato, nos termos da Lei nº 13.709/2018 (LGPD).', y)
  y += 3

  // ── 14. FORO ──
  y = addSection('14. DO FORO', y)
  y = addItem('14.1 Para eventuais demandas que emanarem deste instrumento, elegem as partes o foro da situação do Imóvel, com expressa renúncia a qualquer outro.', y)
  y = addItem('14.2 Aplicar-se-ão as disposições relativas à Lei 8.245/1991 e demais normas vigentes.', y)
  y += 6

  // ── ASSINATURA ──
  if (y > 230) { doc.addPage(); y = 20 }

  y = addText(`Estando justas e contratadas, as partes assinam em 02 (duas) vias de igual teor e forma, juntamente com as testemunhas abaixo.`, y)
  y += 4
  y = addText(`[cidade/estado], ${new Date().toLocaleDateString('pt-BR')}.`, y)
  y += 10

  // Assinaturas
  doc.line(margin, y, margin + 70, y)
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
  y += 5
  doc.setFontSize(9)
  doc.text(owner?.name ?? 'LOCADOR', margin + 35, y, { align: 'center' })
  doc.text(tenant.name, pageWidth / 2 + 45, y, { align: 'center' })
  y += 4
  doc.setTextColor(120)
  doc.text('LOCADOR', margin + 35, y, { align: 'center' })
  doc.text('LOCATÁRIO', pageWidth / 2 + 45, y, { align: 'center' })
  doc.setTextColor(0)
  y += 10

  if (contract.fiador_nome) {
    doc.line(pageWidth / 2 - 35, y, pageWidth / 2 + 35, y)
    y += 5
    doc.text(contract.fiador_nome, pageWidth / 2, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('FIADOR', pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0)
    y += 10
  }

  // Testemunhas
  if (y > 250) { doc.addPage(); y = 20 }
  doc.setTextColor(0)
  doc.text('Testemunhas:', margin, y); y += 8
  doc.line(margin, y, margin + 70, y)
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
  y += 5
  doc.setTextColor(120)
  doc.text('1. Nome: _______________  CPF: _______________', margin, y)
  doc.text('2. Nome: _______________  CPF: _______________', pageWidth / 2 + 10, y)
  doc.setTextColor(0)

  // Rodapé
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Gerado por ImobApp · imobapp.com.br · Lei 8.245/1991', pageWidth / 2, 290, { align: 'center' })

  doc.save(`contrato-locacao-${tenant.name.toLowerCase().replace(/ /g, '-')}.pdf`)
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