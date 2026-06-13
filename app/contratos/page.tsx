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
  comissao_valor: number | null
  comissao_percentual: number | null
  banco_nome: string | null
  banco_agencia: string | null
  banco_conta: string | null
  banco_titular: string | null
  sinal_valor: any
  parcelas_valor: any
  parcelas_quantidade: any
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
    comissao_valor: '',
    comissao_percentual: '',
    banco_nome: '',
    banco_agencia: '',
    banco_conta: '',
    banco_titular: '',
    sinal_valor: '',
    parcelas_quantidade: '',
    parcelas_valor: '',
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
    // Validação por tipo
    if (!form.property_id) {
      alert('Selecione um imóvel')
      return
    }

    if (['rental', 'commercial'].includes(form.type)) {
      if (!form.tenant_id || !form.start_date || !form.value) {
        alert('Preencha todos os campos obrigatórios')
        return
      }
    }

    if (form.type === 'intermediacao') {
      if (!form.comissao_valor && !form.comissao_percentual) {
        alert('Informe o valor ou percentual da comissão')
        return
      }
    }

    if (['compra_venda', 'promessa_compra_venda'].includes(form.type)) {
      if (!form.tenant_id || !form.value || !form.start_date) {
        alert('Preencha todos os campos obrigatórios')
        return
      }
    }

    if (form.type === 'administracao') {
      if (!form.start_date) {
        alert('Informe a data de início')
        return
      }
    }

    if (form.type === 'exclusividade') {
      if (!form.start_date) {
        alert('Informe a data de início')
        return
      }
    }

    if (form.type === 'servicos') {
      if (!form.tenant_id || !form.value || !form.start_date) {
        alert('Preencha todos os campos obrigatórios')
        return
      }
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('contracts').insert({
      user_id: user!.id,
      property_id: form.property_id,
      tenant_id: form.tenant_id || null,
      type: form.type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      value: form.value ? parseFloat(form.value) : 0,
      indice_reajuste: form.indice_reajuste,
      multa_rescisao: form.multa_rescisao,
      fiador_nome: form.tem_fiador ? form.fiador_nome : null,
      fiador_cpf: form.tem_fiador ? form.fiador_cpf : null,
      fiador_rg: form.tem_fiador ? form.fiador_rg : null,
      fiador_endereco: form.tem_fiador ? form.fiador_endereco : null,
      comissao_valor: form.comissao_valor ? parseFloat(form.comissao_valor) : null,
      comissao_percentual: form.comissao_percentual ? parseFloat(form.comissao_percentual) : null,
      banco_nome: form.banco_nome || null,
      banco_agencia: form.banco_agencia || null,
      banco_conta: form.banco_conta || null,
      banco_titular: form.banco_titular || null,
      sinal_valor: form.sinal_valor ? parseFloat(form.sinal_valor) : null,
      parcelas_quantidade: form.parcelas_quantidade ? parseInt(form.parcelas_quantidade) : null,
      parcelas_valor: form.parcelas_valor ? parseFloat(form.parcelas_valor) : null,
    })

    if (error) { alert('Erro: ' + error.message); setSaving(false); return }

    setForm({
      property_id: '', tenant_id: '', type: 'rental', start_date: '', end_date: '',
      value: '', indice_reajuste: 'IPCA', multa_rescisao: '3', tem_fiador: false,
      fiador_nome: '', fiador_cpf: '', fiador_rg: '', fiador_endereco: '',
      comissao_valor: '', comissao_percentual: '', banco_nome: '', banco_agencia: '',
      banco_conta: '', banco_titular: '', sinal_valor: '', parcelas_quantidade: '',
      parcelas_valor: '',
    })
    setShowForm(false)
    loadAll()
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

  async function generateIntermediacaoPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single()

    const property = contract.properties
    const owner = property?.owners
    const contratada = perfil

    const comissaoTexto = contract.comissao_valor
      ? contract.comissao_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : contract.comissao_percentual
        ? `${contract.comissao_percentual}% sobre o valor do negócio`
        : 'a definir'

    const addText = (text: string, y: number, indent = 0): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - indent)
      doc.text(lines, margin + indent, y)
      return y + lines.length * 5.5
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

    const addItem = (text: string, y: number): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - 6)
      doc.text(lines, margin + 6, y)
      return y + lines.length * 5.5 + 1
    }

    let y = 20

    // ── TÍTULO ──
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('CONTRATO DE INTERMEDIAÇÃO IMOBILIÁRIA', pageWidth / 2, y, { align: 'center' })
    y += 10

    // ── IDENTIFICAÇÃO DAS PARTES ──
    doc.setFontSize(10)
    doc.text('IDENTIFICAÇÃO DAS PARTES CONTRATANTES', margin, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)

    // CONTRATANTE
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATANTE:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    if (owner?.name) {
      y = addItem(`${owner.name}${owner.cpf ? `, CPF nº ${owner.cpf}` : ''}${owner.rg ? `, RG nº ${owner.rg}` : ''}${owner.address ? `, residente na ${owner.address}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}${owner.phone ? `, telefone: ${owner.phone}` : ''}.`, y)
    } else {
      y = addItem('(Proprietário não vinculado ao imóvel — vincule em Imóveis)', y)
    }
    y += 3

    // CONTRATADA
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATADA:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    if (contratada?.full_name) {
      y = addItem(`${contratada.full_name}${contratada.cpf ? `, CPF nº ${contratada.cpf}` : ''}${contratada.rg ? `, RG nº ${contratada.rg}` : ''}${contratada.address ? `, residente na ${contratada.address}` : ''}${contratada.phone ? `, telefone: ${contratada.phone}` : ''}.`, y)
    } else {
      y = addItem('(Preencha seus dados em "Meu Perfil" para aparecerem aqui)', y)
    }
    y += 4

    y = addText('As partes acima identificadas têm, entre si, justo e acertado, o presente Contrato de Intermediação Imobiliária, que se regerá pelas cláusulas seguintes:', y)
    y += 6

    // ── CLÁUSULAS ──
    y = addSection('CLÁUSULA 1ª — OBJETO DO CONTRATO', y)
    y = addItem(`Objetiva o presente instrumento a contratação dos serviços profissionais da CONTRATADA para intermediação de venda/locação do imóvel situado na ${property.address} (o "Imóvel").`, y)
    y += 3

    y = addSection('CLÁUSULA 2ª — DA CONTRATAÇÃO DOS SERVIÇOS', y)
    y = addItem(`A CONTRATANTE reconhece a prestação de serviço de corretagem pela CONTRATADA e assume o compromisso de pagar pela intermediação o valor de ${comissaoTexto}${contract.banco_nome ? `, mediante transferência bancária para ${contract.banco_nome}` : ''
      }${contract.banco_agencia ? `, Agência: ${contract.banco_agencia}` : ''}${contract.banco_conta ? `, Conta: ${contract.banco_conta}` : ''
      }${contract.banco_titular ? `, Titular: ${contract.banco_titular}` : ''}.`, y)
    y = addItem('Parágrafo primeiro: O pagamento será feito imediatamente após o recebimento do sinal de negócio ou princípio de pagamento.', y)
    y += 3

    y = addSection('CLÁUSULA 3ª — DO INADIMPLEMENTO', y)
    y = addItem('O inadimplemento no pagamento da comissão implicará em correção monetária pelo IGPM-FGV, juros de 1% ao mês e multa moratória de 2% sobre o valor do débito corrigido.', y)
    y += 3

    y = addSection('CLÁUSULA 4ª — TÍTULO EXECUTIVO', y)
    y = addItem('Os valores pertinentes às comissões são considerados dívida líquida, certa e exigível. Este contrato é título executivo extrajudicial nos termos do artigo 585 do CPC.', y)
    y += 3

    y = addSection('CLÁUSULA 5ª — DO RESULTADO ÚTIL', y)
    y = addItem('Após a assinatura do contrato imobiliário principal, fica configurado o resultado útil da intermediação imobiliária. Em caso de desistência da venda pelo CONTRATANTE, a comissão continuará devida à CONTRATADA, nos termos do artigo 725 do Código Civil.', y)
    y += 3

    y = addSection('CLÁUSULA 6ª — DA DOCUMENTAÇÃO', y)
    y = addItem('É de exclusiva obrigação da CONTRATANTE a entrega de toda documentação pessoal solicitada pela CONTRATADA no prazo máximo de 72 (setenta e duas) horas.', y)
    y += 3

    y = addSection('CLÁUSULA 7ª — DA LGPD', y)
    y = addItem('As Partes se comprometem a manter sigilo sobre todas as informações trocadas e a tratar os dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD).', y)
    y += 3

    y = addSection('CLÁUSULA 8ª — DO FORO', y)
    y = addItem('As partes elegem o foro da comarca da situação do Imóvel para dirimir quaisquer questões relacionadas com o presente contrato, renunciando a qualquer outro.', y)
    y += 8

    // ── ASSINATURAS ──
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFontSize(9.5)
    y = addText(`E assim, por estarem justas e contratadas, assinam as partes o presente contrato em 02 (duas) vias de igual teor, na presença de 02 (duas) testemunhas.`, y)
    y += 4
    y = addText(`[cidade/estado], ${new Date().toLocaleDateString('pt-BR')}.`, y)
    y += 10

    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(owner?.name ?? 'CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text(contratada?.full_name ?? 'CONTRATADA', pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text('CONTRATADA', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 12

    if (y > 250) { doc.addPage(); y = 20 }
    doc.text('Testemunhas:', margin, y); y += 8
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('1. Nome: _______________  RG: _______________  CPF: _______________', margin, y)
    doc.text('2. Nome: _______________  RG: _______________  CPF: _______________', pageWidth / 2 + 10, y)
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 290, { align: 'center' })

    doc.save(`contrato-intermediacao-${(owner?.name ?? 'contratante').toLowerCase().replace(/ /g, '-')}.pdf`)
  }

  const typeLabel: Record<string, string> = {
    rental: 'Aluguel',
    service: 'Prestação de Serviço',
    sale: 'Compra e Venda',
  }

  async function generatePromessaPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const property = contract.properties
    const owner = property?.owners
    const buyer = contract.tenants

    const totalFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const sinalFormatted = contract.sinal_valor
      ? contract.sinal_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'a definir'
    const parcelaFormatted = contract.parcelas_valor
      ? contract.parcelas_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'a definir'
    const dataAssinatura = contract.start_date
      ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const dataEscritura = contract.end_date
      ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'

    const addText = (text: string, y: number, indent = 0): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - indent)
      doc.text(lines, margin + indent, y)
      return y + lines.length * 5.5
    }

    const addSection = (title: string, y: number): number => {
      if (y > 258) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(title, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      return y + 7
    }

    const addItem = (text: string, y: number): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - 6)
      doc.text(lines, margin + 6, y)
      return y + lines.length * 5.5 + 1
    }

    let y = 20

    // TÍTULO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('INSTRUMENTO PARTICULAR DE PROMESSA DE VENDA E COMPRA DE IMÓVEL', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addText('Pelo presente instrumento particular e na melhor forma de Direito, as partes abaixo qualificadas:', y)
    y += 4

    // VENDEDORA
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('PROMITENTE VENDEDORA:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (owner?.name) {
      y = addItem(`${owner.name}${owner.cpf ? `, CPF nº ${owner.cpf}` : ''}${owner.rg ? `, RG nº ${owner.rg}` : ''}${owner.address ? `, residente na ${owner.address}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}${owner.phone ? `, telefone: ${owner.phone}` : ''}, doravante denominada simplesmente como VENDEDORA.`, y)
    } else {
      y = addItem('(Proprietário não vinculado — vincule em Imóveis)', y)
    }
    y += 3

    // COMPRADORA
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('PROMITENTE COMPRADORA:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`${buyer.name}${buyer.cpf ? `, CPF nº ${buyer.cpf}` : ''}${buyer.email ? `, e-mail: ${buyer.email}` : ''}${buyer.phone ? `, telefone: ${buyer.phone}` : ''}, doravante denominada simplesmente como COMPRADORA.`, y)
    y += 4

    y = addText('As partes acima identificadas, tendo entre si justo e contratado o seguinte:', y)
    y += 6

    // OBJETO
    y = addSection('1. OBJETO', y)
    y = addItem(`O objeto do presente instrumento consiste no compromisso para venda e compra do imóvel situado na ${property.address} (o "Imóvel"), no qual a VENDEDORA, sendo legítima proprietária, promete vender à COMPRADORA, que promete comprar, pagando o preço aqui convencionado.`, y)
    y += 3

    // DO IMÓVEL
    y = addSection('2. DO IMÓVEL', y)
    y = addItem(`O Imóvel identificado como "${property.name}", localizado na ${property.address}, objeto do presente instrumento.`, y)
    y += 3

    // PREÇO
    y = addSection('3. DO PREÇO', y)
    y = addItem(`O preço total, certo e ajustado é de ${totalFormatted}, da seguinte forma:`, y)
    y = addItem(`a) Sinal: ${sinalFormatted}, neste ato, como sinal e princípio de pagamento, em moeda corrente, dando a VENDEDORA plena, geral e irrevogável quitação.`, y)
    if (contract.parcelas_quantidade && contract.parcelas_valor) {
      y = addItem(`b) Parcelamento: ${parcelaFormatted} em ${contract.parcelas_quantidade} parcelas mensais e consecutivas.`, y)
    }
    if (contract.banco_nome) {
      y = addItem(`Os pagamentos deverão ser realizados mediante transferência bancária para ${contract.banco_nome}${contract.banco_agencia ? `, Agência: ${contract.banco_agencia}` : ''}${contract.banco_conta ? `, Conta: ${contract.banco_conta}` : ''}${contract.banco_titular ? `, Titular: ${contract.banco_titular}` : ''}.`, y)
    }
    y += 3

    // POSSE
    y = addSection('4. DA TRANSFERÊNCIA DA POSSE', y)
    y = addItem(`A posse direta do imóvel será transmitida à COMPRADORA na data prevista para lavratura da Escritura Pública de Venda e Compra, prevista para ${dataEscritura}.`, y)
    y = addItem('Os COMPRADORES, a partir da transmissão da posse, obrigam-se a providenciar, no prazo de 30 (trinta) dias, a mudança da titularidade junto às autoridades competentes, referente a tributos, tarifas e encargos que incidam sobre o imóvel.', y)
    y += 3

    // TRIBUTOS
    y = addSection('5. DOS TRIBUTOS E DESPESAS', y)
    y = addItem('Todos os impostos, taxas e contribuições que incidam sobre o imóvel são de inteira responsabilidade da VENDEDORA até a imissão da COMPRADORA na posse. As despesas de ITBI e emolumentos cartorários serão de responsabilidade da COMPRADORA.', y)
    y += 3

    // IRREVOGABILIDADE
    y = addSection('6. DA IRREVOGABILIDADE E IRRETRATIBILIDADE', y)
    y = addItem('O presente instrumento é celebrado em caráter IRREVOGÁVEL e IRRETRATÁVEL, renunciando as partes à faculdade de arrependimento concedida pelo artigo 420 do Código Civil Brasileiro, sendo extensivo e obrigatório aos seus herdeiros e sucessores.', y)
    y += 3

    // DOCUMENTAÇÃO
    y = addSection('7. DA DOCUMENTAÇÃO', y)
    y = addItem('A VENDEDORA se obriga, às suas expensas, a entregar à COMPRADORA os documentos relativos à situação do imóvel e à sua pessoa em até 15 (quinze) dias úteis a contar da assinatura deste instrumento, incluindo certidões de propriedade, negativas de tributos e declaração de inexistência de débitos condominiais.', y)
    y += 3

    // INADIMPLÊNCIA
    y = addSection('8. DA INADIMPLÊNCIA', y)
    y = addItem('O não pagamento de qualquer parcela sujeitará a COMPRADORA a multa de 10% (dez por cento) sobre o valor inadimplido, acrescida de juros de 1% ao mês, pro rata die. O atraso superior a 30 dias configurará hipótese de rescisão contratual.', y)
    y += 3

    // RESCISÃO
    y = addSection('9. DA RESCISÃO', y)
    y = addItem('Verificada a rescisão por inadimplência da COMPRADORA, caberá multa de 10% sobre o valor do contrato atualizado pelo IPCA/IBGE, a título de perdas e danos pré-fixados.', y)
    y = addItem('Verificada a rescisão por negativa da VENDEDORA, esta devolverá os valores pagos com juros de 1% ao mês, correção pelo IPCA/IBGE e multa de 10% sobre o valor do contrato.', y)
    y += 3

    // LGPD
    y = addSection('10. DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)', y)
    y = addItem('As Partes se comprometem a manter sigilo absoluto sobre todas as informações trocadas e a tratar os dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD), limitando o uso das informações estritamente às finalidades deste contrato.', y)
    y += 3

    // FORO
    y = addSection('11. DO FORO', y)
    y = addItem('Fica eleito o foro da situação do Imóvel para dirimir quaisquer dúvidas decorrentes deste compromisso, com expressa renúncia de qualquer outro por mais privilegiado que seja.', y)
    y += 8

    // ASSINATURAS
    if (y > 230) { doc.addPage(); y = 20 }
    y = addText(`E, assim, por estarem justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual teor, na presença de 02 (duas) testemunhas.`, y)
    y += 4
    y = addText(`[cidade/estado], ${dataAssinatura}.`, y)
    y += 12

    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(buyer.name, margin + 35, y, { align: 'center' })
    doc.text(owner?.name ?? 'VENDEDORA', pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('COMPRADORA', margin + 35, y, { align: 'center' })
    doc.text('VENDEDORA', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 12

    if (y > 250) { doc.addPage(); y = 20 }
    doc.text('Testemunhas:', margin, y); y += 8
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('1. Nome: _______________  RG: _______________  CPF: _______________', margin, y)
    doc.text('2. Nome: _______________  RG: _______________  CPF: _______________', pageWidth / 2 + 10, y)
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 290, { align: 'center' })

    doc.save(`promessa-compra-venda-${buyer.name.toLowerCase().replace(/ /g, '-')}.pdf`)
  }

  async function generateLocacaoComercialPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const property = contract.properties
    const tenant = contract.tenants
    const owner = property?.owners

    const startFormatted = contract.start_date
      ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const endFormatted = contract.end_date
      ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const valueFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const indice = contract.indice_reajuste ?? 'IPCA/IBGE'
    const multa = contract.multa_rescisao ?? '3'
    const multaExt = multa === '1' ? 'um' : multa === '2' ? 'dois' : 'três'

    const addText = (text: string, y: number, indent = 0): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - indent)
      doc.text(lines, margin + indent, y)
      return y + lines.length * 5.5
    }

    const addSection = (title: string, y: number): number => {
      if (y > 258) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(title, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      return y + 7
    }

    const addItem = (text: string, y: number): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - 6)
      doc.text(lines, margin + 6, y)
      return y + lines.length * 5.5 + 1
    }

    let y = 20

    // TÍTULO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.text('PARA FINS COMERCIAIS', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addText('Pelo presente instrumento particular de contrato de locação de imóvel para fins comerciais e na melhor forma de Direito, as partes abaixo qualificadas:', y)
    y += 4

    // LOCADOR
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('LOCADOR:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (owner?.name) {
      y = addItem(`${owner.name}${owner.cpf ? `, CPF nº ${owner.cpf}` : ''}${owner.rg ? `, RG nº ${owner.rg}` : ''}${owner.address ? `, residente na ${owner.address}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}${owner.phone ? `, telefone: ${owner.phone}` : ''}.`, y)
    } else {
      y = addItem('(Proprietário não vinculado — acesse Imóveis e vincule um proprietário)', y)
    }
    y += 3

    // LOCATÁRIO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('e, de outro lado,', margin, y); y += 5
    doc.text('LOCATÁRIO:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`${tenant.name}${tenant.cpf ? `, CPF nº ${tenant.cpf}` : ''}${tenant.email ? `, e-mail: ${tenant.email}` : ''}${tenant.phone ? `, telefone: ${tenant.phone}` : ''}.`, y)
    y += 3

    // FIADOR
    if (contract.fiador_nome) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('E ainda, na qualidade de FIADOR:', margin, y); y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      y = addItem(`${contract.fiador_nome}${contract.fiador_cpf ? `, CPF nº ${contract.fiador_cpf}` : ''}${contract.fiador_rg ? `, RG nº ${contract.fiador_rg}` : ''}${contract.fiador_endereco ? `, residente na ${contract.fiador_endereco}` : ''}.`, y)
      y += 3
    }

    y = addText('Doravante designados, individualmente, como "Parte" e, em conjunto, "Partes", tendo entre si justo e contratado o seguinte:', y)
    y += 6

    // 1. OBJETO
    y = addSection('1. DO OBJETO', y)
    y = addItem(`O objeto do presente instrumento consiste na locação pelo Locatário do imóvel de propriedade do Locador, situado na ${property.address}, identificado como "${property.name}" (o "Imóvel").`, y)
    y += 3

    // 2. DESTINAÇÃO
    y = addSection('2. DA DESTINAÇÃO DO IMÓVEL', y)
    y = addItem('O LOCATÁRIO declara que o imóvel, ora locado, destina-se única e exclusivamente para o seu uso COMERCIAL.', y)
    y = addItem('O uso indevido e/ou diverso do Imóvel e a inobservância das normas decorrentes dos bons costumes serão motivos para a resolução e o consequente despejo por infração contratual, independentemente da multa aqui pactuada.', y)
    y += 3

    // 3. PRAZO
    y = addSection('3. DO PRAZO DA LOCAÇÃO', y)
    y = addItem(`O Locador dá em locação ao Locatário o Imóvel a partir de ${startFormatted}, para terminar em ${endFormatted}.`, y)
    y = addItem('Após o 15º (décimo quinto) mês de aluguel, fica facultado ao Locatário, mediante simples notificação por escrito, o exercício unilateral de rescindir o presente instrumento sem a aplicação de penalidade.', y)
    y = addItem('O Locatário declara haver vistoriado o Imóvel e que o está recebendo em perfeito estado de limpeza, conservação e funcionalidade.', y)
    y += 3

    // 4. VALOR
    y = addSection('4. DO VALOR DO ALUGUEL', y)
    y = addItem(`O aluguel mensal livremente ajustado entre as partes, a partir de ${startFormatted}, é de ${valueFormatted}.`, y)
    y = addItem(`O aluguel mensal será reajustado anualmente de acordo com a variação acumulada do ${indice}.`, y)
    y = addItem('A falta de pagamento, nas épocas determinadas, por si só constituirá o Locatário em mora, independentemente de qualquer aviso ou interpelação judicial ou extrajudicial.', y)
    y += 3

    // 5. VENCIMENTO
    y = addSection('5. DO VENCIMENTO', y)
    y = addItem('O Locatário obriga-se a pagar o valor do aluguel mensal até o dia 10 (dez) de cada mês, em moeda corrente nacional.', y)
    y = addItem('Após a data do vencimento, o valor será acrescido de correção pelo índice contratual, juros de mora de 1% ao mês e multa compensatória irredutível de 10%, além de honorários de advogado de 20% na hipótese de cobrança judicial.', y)
    y += 3

    // 6. BENFEITORIAS
    y = addSection('6. DAS BENFEITORIAS', y)
    y = addItem('O Locatário obriga-se a manter o imóvel em perfeitas condições de higiene e limpeza, restituindo-o nas mesmas condições em que o recebeu, sem direito a retenção ou indenização por benfeitorias voluptuárias.', y)
    y = addItem('É defeso ao Locatário efetuar qualquer tipo de reforma ou benfeitoria sem que antes tenha colhido expressamente, por escrito, a anuência do Locador, sob pena de infração contratual.', y)
    y += 3

    // 7. ENCARGOS
    y = addSection('7. DOS ENCARGOS', y)
    y = addItem('Correrão por conta do Locatário todas as despesas de energia elétrica, água, esgoto, gás, taxa de condomínio e tributos incidentes sobre o imóvel, que deverão ser pagos nas épocas próprias diretamente às concessionárias.', y)
    y += 3

    // 8. VISTORIA
    y = addSection('8. DA VISTORIA DO IMÓVEL', y)
    y = addItem('O Locador fica desde já autorizado a vistoriar o imóvel sempre que julgar conveniente, nos dias úteis entre 8:00h e 18:00h, mediante aviso prévio de 24 horas.', y)
    y += 3

    // 9. MULTA
    y = addSection('9. DA MULTA', y)
    y = addItem(`A infração de qualquer cláusula do presente instrumento sujeitará o infrator a multa equivalente a ${multa} (${multaExt}) aluguéis mensais vigentes na data da infração.`, y)
    y += 3

    // 10. RESCISÃO
    y = addSection('10. DA RESCISÃO DO CONTRATO', y)
    y = addItem(`A rescisão antecipada pelo Locatário, ressalvadas as hipóteses legais, implicará multa equivalente a ${multa} (${multaExt}) aluguéis mensais.`, y)
    y = addItem('Após o 15º mês de aluguel, fica facultado ao Locatário rescindir sem penalidade mediante notificação escrita ao Locador.', y)
    y += 3

    // 11. SUBLOCAÇÃO
    y = addSection('11. DA SUBLOCAÇÃO', y)
    y = addItem('É vedado ao LOCATÁRIO sublocar, transferir ou ceder o imóvel sem o consentimento prévio e por escrito do LOCADOR, sendo nulo de pleno direito qualquer ato praticado com este fim.', y)
    y += 3

    // 12. SINISTROS
    y = addSection('12. DOS SINISTROS', y)
    y = addItem('No caso de sinistro do prédio, parcial ou total, que impossibilite o uso do imóvel, o presente contrato estará rescindido, independentemente de aviso ou interpelação judicial ou extrajudicial.', y)
    y += 3

    // 13. GARANTIA
    if (contract.fiador_nome) {
      y = addSection('13. DA GARANTIA LOCATÍCIA — FIADOR', y)
      y = addItem(`O FIADOR ${contract.fiador_nome}${contract.fiador_cpf ? `, CPF ${contract.fiador_cpf}` : ''}, como principal pagador, responde solidariamente por todos os pagamentos até a efetiva entrega das chaves e termo de vistoria do imóvel.`, y)
      y += 3
    }

    // 14. DIREITO DE PREFERÊNCIA
    y = addSection('14. DO DIREITO DE PREFERÊNCIA', y)
    y = addItem('O Locatário faz jus ao direito de preferência para aquisição do Imóvel, nos moldes dos artigos 27 e seguintes da Lei nº 8.245/91, devendo o Locador notificá-lo com antecedência mínima de 30 (trinta) dias.', y)
    y += 3

    // 15. LGPD
    y = addSection('15. DA OBSERVÂNCIA À LGPD', y)
    y = addItem('O LOCATÁRIO declara expresso consentimento que o LOCADOR irá coletar, tratar e compartilhar os dados necessários ao cumprimento do contrato, nos termos da Lei nº 13.709/2018 (LGPD).', y)
    y += 3

    // 16. FORO
    y = addSection('16. DO FORO', y)
    y = addItem('Para eventuais demandas que emanarem deste instrumento, elegem as partes o foro da situação do Imóvel, com expressa renúncia a qualquer outro por mais privilegiado que seja.', y)
    y += 8

    // ASSINATURAS
    if (y > 220) { doc.addPage(); y = 20 }
    y = addText(`Estando justas e contratadas, as partes assinam em 02 (duas) vias de igual teor e forma, juntamente com as testemunhas abaixo.`, y)
    y += 4
    y = addText(`[cidade/estado], ${new Date().toLocaleDateString('pt-BR')}.`, y)
    y += 12

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

    if (contract.fiador_nome) {
      y += 14
      if (y > 260) { doc.addPage(); y = 20 }
      doc.line(pageWidth / 2 - 35, y, pageWidth / 2 + 35, y)
      y += 5
      doc.text(contract.fiador_nome, pageWidth / 2, y, { align: 'center' })
      y += 4
      doc.setTextColor(120)
      doc.text('FIADOR', pageWidth / 2, y, { align: 'center' })
      doc.setTextColor(0)
    }

    y += 14
    if (y > 255) { doc.addPage(); y = 20 }
    doc.text('Testemunhas:', margin, y); y += 8
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('1. Nome: _______________  RG: _______________  CPF: _______________', margin, y)
    doc.text('2. Nome: _______________  RG: _______________  CPF: _______________', pageWidth / 2 + 10, y)
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br · Lei 8.245/1991', pageWidth / 2, 290, { align: 'center' })

    doc.save(`contrato-locacao-comercial-${tenant.name.toLowerCase().replace(/ /g, '-')}.pdf`)
  }

  async function generateAdministracaoPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single()

    const property = contract.properties
    const owner = property?.owners
    const contratada = perfil

    const startFormatted = contract.start_date
      ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const endFormatted = contract.end_date
      ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const taxaAdmin = contract.value
      ? contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'a definir'
    const percentual = contract.comissao_percentual ? `${contract.comissao_percentual}%` : 'a definir'
    const comissaoVenda = contract.comissao_valor ? `${contract.comissao_valor}%` : 'a definir'
    const multa = contract.multa_rescisao ?? '3'
    const multaExt = multa === '1' ? 'um' : multa === '2' ? 'dois' : 'três'

    const addText = (text: string, y: number, indent = 0): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - indent)
      doc.text(lines, margin + indent, y)
      return y + lines.length * 5.5
    }

    const addSection = (title: string, y: number): number => {
      if (y > 258) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(title, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      return y + 7
    }

    const addItem = (text: string, y: number): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - 6)
      doc.text(lines, margin + 6, y)
      return y + lines.length * 5.5 + 1
    }

    let y = 20

    // TÍTULO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('INSTRUMENTO PARTICULAR DE CONTRATO DE', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.text('ADMINISTRAÇÃO DE IMÓVEIS', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addText('Pelo presente instrumento particular de contrato de administração de imóveis e na melhor forma de Direito, as partes abaixo qualificadas:', y)
    y += 4

    // CONTRATANTE (proprietário)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('CONTRATANTE:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (owner?.name) {
      y = addItem(`${owner.name}${owner.cpf ? `, CPF nº ${owner.cpf}` : ''}${owner.rg ? `, RG nº ${owner.rg}` : ''}${owner.address ? `, residente na ${owner.address}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}${owner.phone ? `, telefone: ${owner.phone}` : ''}.`, y)
    } else {
      y = addItem('(Proprietário não vinculado ao imóvel — acesse Imóveis e vincule um proprietário)', y)
    }
    y += 3

    // CONTRATADA (corretor/administradora)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('e, de outro lado,', margin, y); y += 5
    doc.text('CONTRATADA (ADMINISTRADORA):', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (contratada?.full_name) {
      y = addItem(`${contratada.full_name}${contratada.cpf ? `, CPF nº ${contratada.cpf}` : ''}${contratada.rg ? `, RG nº ${contratada.rg}` : ''}${contratada.address ? `, residente na ${contratada.address}` : ''}${contratada.phone ? `, telefone: ${contratada.phone}` : ''}.`, y)
    } else {
      y = addItem('(Preencha seus dados em "Meu Perfil" para aparecerem aqui)', y)
    }
    y += 4

    y = addText('Doravante designados, individualmente, como "Parte" e, em conjunto, "Partes", tendo entre si justo e contratado o seguinte:', y)
    y += 6

    // 1. OBJETO
    y = addSection('1. DO OBJETO', y)
    y = addItem(`O presente contrato tem como objeto a prestação, pela CONTRATADA, dos serviços de administração do imóvel denominado "${property.name}", situado na ${property.address}.`, y)
    y += 3

    // 2. PRAZO
    y = addSection('2. DO PRAZO', y)
    y = addItem(`O contrato terá duração de ${startFormatted} a ${endFormatted}, contados a partir da assinatura deste instrumento, podendo ser renovado mediante acordo entre as partes.`, y)
    y += 3

    // 3. PROCURAÇÃO
    y = addSection('3. DA PROCURAÇÃO', y)
    y = addItem('Por meio deste contrato, o CONTRATANTE autoriza a CONTRATADA a promover a administração do aluguel do imóvel supramencionado, outorgando-lhe todos os poderes necessários para o desenvolvimento desta atividade, incluindo o poder para promover a divulgação do imóvel, receber, negociar e dar quitação dos aluguéis pagos pelo Locatário e seus Fiadores.', y)
    y += 3

    // 4. OBRIGAÇÕES DA CONTRATADA
    y = addSection('4. DAS OBRIGAÇÕES GERAIS DA CONTRATADA', y)
    y = addItem('4.1 Compete à CONTRATADA a análise e aprovação cadastral dos Locatários e Fiadores, seleção das garantias oferecidas e a condução dos assuntos relacionados com a locação.', y)
    y = addItem('4.2 A CONTRATADA poderá afixar cartazes e placas no imóvel, promover anúncios nos jornais, na internet e em outros meios de divulgação.', y)
    y = addItem('4.3 A CONTRATADA, recebendo o pagamento realizado pelo Locatário, repassará ao CONTRATANTE o valor do aluguel e demais encargos através de depósito bancário em conta por ele indicada.', y)
    y = addItem('4.4 No caso de inadimplência, a CONTRATADA promoverá em nome do CONTRATANTE todas as medidas judiciais ou extrajudiciais cabíveis.', y)
    y = addItem('4.5 A CONTRATADA realizará vistorias periódicas no imóvel e informará o CONTRATANTE sobre sua situação.', y)
    y = addItem('4.6 A CONTRATADA fará prestação de contas mensal de toda movimentação referente à administração do imóvel.', y)
    y += 3

    // 5. OBRIGAÇÕES DO CONTRATANTE
    y = addSection('5. DAS OBRIGAÇÕES GERAIS DO CONTRATANTE', y)
    y = addItem('5.1 É obrigação do CONTRATANTE apresentar todos os impostos, taxas e quaisquer encargos devidamente quitados do período anterior a esta administração.', y)
    y = addItem('5.2 É obrigação do CONTRATANTE entregar ao Locatário o imóvel em perfeito estado de funcionamento da parte elétrica, hidráulica e demais itens que façam parte do imóvel.', y)
    y = addItem('5.3 No período em que o imóvel estiver desocupado, o CONTRATANTE se responsabilizará pelo pagamento dos encargos, tais como: Condomínio, Água, Gás, Luz e IPTU.', y)
    y += 3

    // 6. REMUNERAÇÃO
    y = addSection('6. DA REMUNERAÇÃO', y)
    y = addItem(`6.1 Em virtude da prestação de seus serviços de administração, a CONTRATADA receberá a quantia de ${taxaAdmin} por mês.`, y)
    y = addItem(`6.2 Por cada imóvel alugado, a CONTRATADA receberá também uma porcentagem de ${percentual} do valor do aluguel.`, y)
    y = addItem(`6.3 Em caso de venda do imóvel intermediada pela CONTRATADA, será devida comissão de ${comissaoVenda} sobre o valor total da transação.`, y)
    y += 3

    // 7. ASSISTÊNCIA JURÍDICA
    y = addSection('7. DA ASSISTÊNCIA JURÍDICA', y)
    y = addItem('A CONTRATADA obriga-se a patrocinar, sem qualquer ônus para o CONTRATANTE, as seguintes ações: cobrança judicial de aluguéis, ações de despejo por infração legal ou contratual, ações revisionais do valor do aluguel e ações indenizatórias por avarias causadas pelo Locatário.', y)
    y += 3

    // 8. RESCISÃO
    y = addSection('8. DA RESCISÃO CONTRATUAL', y)
    y = addItem('O presente contrato poderá ser rescindido unilateralmente por qualquer das partes, mediante notificação escrita com antecedência mínima de 30 (trinta) dias, sujeitando-se a parte rescidente ao pagamento da multa contratual prevista na cláusula seguinte.', y)
    y = addItem('Em caso de venda do imóvel a terceiros que não tenham interesse em dar continuidade ao presente contrato, o CONTRATANTE pagará à CONTRATADA multa correspondente a 3 (três) meses do valor da taxa de administração vigente.', y)
    y += 3

    // 9. MULTA
    y = addSection('9. DA MULTA', y)
    y = addItem(`A infração de qualquer cláusula do presente instrumento sujeitará o infrator ao pagamento de multa contratual equivalente a ${multa} (${multaExt}) mês(es) da taxa de administração vigente na data da infração.`, y)
    y += 3

    // 10. LGPD
    y = addSection('10. DA OBSERVÂNCIA À LGPD', y)
    y = addItem('O CONTRATANTE declara expresso consentimento que a CONTRATADA irá coletar, tratar e compartilhar os dados necessários ao cumprimento do contrato, nos termos da Lei nº 13.709/2018 (LGPD). As Partes comprometem-se a manter sigilo absoluto sobre todas as informações trocadas e a utilizá-las exclusivamente para as finalidades deste contrato.', y)
    y += 3

    // 11. FORO
    y = addSection('11. DO FORO', y)
    y = addItem('Para eventuais demandas que emanarem deste instrumento, elegem as partes o foro da comarca da situação do imóvel, com expressa renúncia a qualquer outro por mais privilegiado que seja.', y)
    y += 8

    // ASSINATURAS
    if (y > 220) { doc.addPage(); y = 20 }
    y = addText('Estando justas e contratadas, as partes assinam em 02 (duas) vias de igual teor e forma, juntamente com as testemunhas abaixo.', y)
    y += 4
    y = addText(`[cidade/estado], ${new Date().toLocaleDateString('pt-BR')}.`, y)
    y += 12

    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(owner?.name ?? 'CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text(contratada?.full_name ?? 'CONTRATADA', pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('CONTRATANTE (PROPRIETÁRIO)', margin + 35, y, { align: 'center' })
    doc.text('CONTRATADA (ADMINISTRADORA)', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 14

    if (y > 255) { doc.addPage(); y = 20 }
    doc.text('Testemunhas:', margin, y); y += 8
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('1. Nome: _______________  RG: _______________  CPF: _______________', margin, y)
    doc.text('2. Nome: _______________  RG: _______________  CPF: _______________', pageWidth / 2 + 10, y)
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br · Lei 8.245/1991', pageWidth / 2, 290, { align: 'center' })

    doc.save(`contrato-administracao-${(owner?.name ?? 'imovel').toLowerCase().replace(/ /g, '-')}.pdf`)
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

              {/* Tipo — sempre visível */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Tipo de contrato</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="rental">Locação Residencial</option>
                  <option value="commercial">Locação Comercial</option>
                  <option value="intermediacao">Intermediação Imobiliária</option>
                  <option value="compra_venda">Compra e Venda</option>
                  <option value="promessa_compra_venda">Promessa de Compra e Venda</option>
                  <option value="administracao">Administração de Imóveis</option>
                  <option value="exclusividade">Exclusividade</option>
                  <option value="servicos">Prestação de Serviços</option>
                </select>
              </div>

              {/* Imóvel — sempre visível */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Imóvel</label>
                <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o imóvel</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* ── CAMPOS PARA LOCAÇÃO RESIDENCIAL E COMERCIAL ── */}
              {['rental', 'commercial'].includes(form.type) && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Inquilino</label>
                    <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione o inquilino</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                          placeholder="Ex: Av. Brasil, 100 - Maceió/AL"
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── CAMPOS PARA INTERMEDIAÇÃO IMOBILIÁRIA ── */}
              {form.type === 'intermediacao' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comissão — Valor fixo (R$)</label>
                    <input type="number" value={form.comissao_valor}
                      onChange={e => setForm({ ...form, comissao_valor: e.target.value })}
                      placeholder="Ex: 5000"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comissão — Percentual (%)</label>
                    <input type="number" value={form.comissao_percentual}
                      onChange={e => setForm({ ...form, comissao_percentual: e.target.value })}
                      placeholder="Ex: 6"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Banco</label>
                    <input type="text" value={form.banco_nome}
                      onChange={e => setForm({ ...form, banco_nome: e.target.value })}
                      placeholder="Ex: Nubank"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Agência</label>
                    <input type="text" value={form.banco_agencia}
                      onChange={e => setForm({ ...form, banco_agencia: e.target.value })}
                      placeholder="Ex: 0001"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Conta corrente</label>
                    <input type="text" value={form.banco_conta}
                      onChange={e => setForm({ ...form, banco_conta: e.target.value })}
                      placeholder="Ex: 12345-6"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Titular da conta</label>
                    <input type="text" value={form.banco_titular}
                      onChange={e => setForm({ ...form, banco_titular: e.target.value })}
                      placeholder="Ex: Fillipe Rodrigues"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              {/* ── CAMPOS PARA COMPRA E VENDA / PROMESSA ── */}
              {['compra_venda', 'promessa_compra_venda'].includes(form.type) && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comprador</label>
                    <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione o comprador</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor total de venda (R$)</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      placeholder="Ex: 350000"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor do sinal (R$)</label>
                    <input type="number" value={form.sinal_valor} onChange={e => setForm({ ...form, sinal_valor: e.target.value })}
                      placeholder="Ex: 35000"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantidade de parcelas</label>
                    <input type="number" value={form.parcelas_quantidade} onChange={e => setForm({ ...form, parcelas_quantidade: e.target.value })}
                      placeholder="Ex: 12"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor de cada parcela (R$)</label>
                    <input type="number" value={form.parcelas_valor} onChange={e => setForm({ ...form, parcelas_valor: e.target.value })}
                      placeholder="Ex: 26250"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data da assinatura</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {form.type === 'promessa_compra_venda' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Data prevista de escritura</label>
                      <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Banco para pagamento</label>
                    <input type="text" value={form.banco_nome} onChange={e => setForm({ ...form, banco_nome: e.target.value })}
                      placeholder="Ex: Bradesco"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Agência</label>
                    <input type="text" value={form.banco_agencia} onChange={e => setForm({ ...form, banco_agencia: e.target.value })}
                      placeholder="Ex: 0001"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Conta corrente</label>
                    <input type="text" value={form.banco_conta} onChange={e => setForm({ ...form, banco_conta: e.target.value })}
                      placeholder="Ex: 12345-6"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Titular da conta</label>
                    <input type="text" value={form.banco_titular} onChange={e => setForm({ ...form, banco_titular: e.target.value })}
                      placeholder="Ex: Roberto Alves"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              {/* ── CAMPOS PARA ADMINISTRAÇÃO / EXCLUSIVIDADE ── */}
              {form.type === 'administracao' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data de início</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data de término</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Taxa de administração (R$)</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      placeholder="Ex: 150"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Percentual sobre aluguel (%)</label>
                    <input type="number" value={form.comissao_percentual} onChange={e => setForm({ ...form, comissao_percentual: e.target.value })}
                      placeholder="Ex: 10"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comissão por venda (%)</label>
                    <input type="number" value={form.comissao_valor} onChange={e => setForm({ ...form, comissao_valor: e.target.value })}
                      placeholder="Ex: 6"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                </>
              )}

              {/* ── CAMPOS PARA PRESTAÇÃO DE SERVIÇOS ── */}
              {form.type === 'servicos' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prestador de serviço (inquilino)</label>
                    <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione o prestador</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor do serviço (R$)</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      placeholder="Ex: 800"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data de início</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data de término</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
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
                  onClick={() => {
                    if (c.type === 'intermediacao') generateIntermediacaoPDF(c)
                    else if (c.type === 'promessa_compra_venda') generatePromessaPDF(c)
                    else if (c.type === 'commercial') generateLocacaoComercialPDF(c)
                    else if (c.type === 'administracao') generateAdministracaoPDF(c)
                    else generatePDF(c)
                  }}
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