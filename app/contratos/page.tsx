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
  people_owner_id: string
  people: Owner | null  // antes era 'owners'
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
  people: Tenant
  comissao_valor: number | null
  comissao_percentual: number | null
  banco_nome: string | null
  banco_agencia: string | null
  banco_conta: string | null
  banco_titular: string | null
  sinal_valor: any
  parcelas_valor: any
  parcelas_quantidade: any
  servico_descricao?: string | null
  servico_prazo_inicio?: number | null
  multa_atraso_pgto?: number | null
  multa_descumprimento?: number | null
  prazo_rescisao_dias?: number | null
}

type Clausula = {
  id: string
  titulo: string
  texto: string
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
    servico_descricao: '',
    servico_prazo_inicio: '',
    multa_atraso_pgto: '',
    multa_descumprimento: '',
    prazo_rescisao_dias: '',    
  })

  const supabase = createClient()
  const router = useRouter()
  const typeLabel: Record<string, string> = {
    rental: 'Aluguel',
    service: 'Prestação de Serviço',
    sale: 'Compra e Venda',
  }
  const [showClausulasEditor, setShowClausulasEditor] = useState(false)
  const [clausulas, setClausulas] = useState<Clausula[]>([])
  const [contractParaGerar, setContractParaGerar] = useState<Contract | null>(null)
    useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: c }, { data: p }, { data: peopleList }] = await Promise.all([
      supabase.from('contracts').select(`
      *,
      properties(*, people:people_owner_id(*)),
      people:people_tenant_id(*)
    `).order('created_at', { ascending: false }),
      supabase.from('properties').select('*'),
      supabase.from('people').select('*'),
    ])

    setContracts((c ?? []) as any)
    setProperties(p ?? [])
    setTenants(peopleList ?? [])
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
      people_tenant_id: form.tenant_id || null,
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
      servico_descricao: form.servico_descricao || null,
      servico_prazo_inicio: form.servico_prazo_inicio ? parseInt(form.servico_prazo_inicio) : null,
      multa_atraso_pgto: form.multa_atraso_pgto ? parseFloat(form.multa_atraso_pgto) : null,
      multa_descumprimento: form.multa_descumprimento ? parseFloat(form.multa_descumprimento) : null,
      prazo_rescisao_dias: form.prazo_rescisao_dias ? parseInt(form.prazo_rescisao_dias) : null,      
    })

    if (error) { alert('Erro: ' + error.message); setSaving(false); return }

    setForm({
      property_id: '', tenant_id: '', type: 'rental', start_date: '', end_date: '',
      value: '', indice_reajuste: 'IPCA', multa_rescisao: '3', tem_fiador: false,
      fiador_nome: '', fiador_cpf: '', fiador_rg: '', fiador_endereco: '',
      comissao_valor: '', comissao_percentual: '', banco_nome: '', banco_agencia: '',
      banco_conta: '', banco_titular: '', sinal_valor: '', parcelas_quantidade: '',
      parcelas_valor: '',
      servico_descricao: '', servico_prazo_inicio: '', multa_atraso_pgto: '', multa_descumprimento: '', prazo_rescisao_dias: '',
    })
    setShowForm(false)
    loadAll()
    setSaving(false)
  }

  function montarClausulasPadrao(contract: Contract): Clausula[] {
    const property = contract.properties
    const tenant = contract.people
    const owner = property?.people
    const startFormatted = contract.start_date ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '___/___/______'
    const endFormatted = contract.end_date ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'indeterminado'
    const valueFormatted = contract.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'a definir'
    const indice = contract.indice_reajuste ?? 'IPCA'
    const multa = contract.multa_rescisao ?? '3'
    const multaExt = multa === '1' ? 'um' : multa === '2' ? 'dois' : 'três'

    if (contract.type === 'rental') {
      return [
        { id: 'c1', titulo: '1. OBJETO', texto: `O objeto do presente instrumento consiste na locação pelo Locatário do imóvel de propriedade do Locador, situado na ${property?.address} (o "Imóvel").` },
        { id: 'c2', titulo: '2. DA DESTINAÇÃO DO IMÓVEL', texto: 'O LOCATÁRIO declara que o imóvel, ora locado, destina-se única e exclusivamente para o seu uso RESIDENCIAL. O uso indevido e/ou diverso do Imóvel será motivo para a rescisão contratual e consequente despejo por infração contratual.' },
        { id: 'c3', titulo: '3. DO PRAZO DA LOCAÇÃO', texto: `O Locador dá em locação ao Locatário o Imóvel a partir de ${startFormatted}, para terminar em ${endFormatted}. O Locatário declara haver vistoriado o Imóvel e que o está recebendo em perfeito estado de limpeza, conservação e funcionalidade.` },
        { id: 'c4', titulo: '4. DO VALOR DO ALUGUEL', texto: `O aluguel mensal livremente ajustado entre as partes é de ${valueFormatted}, a contar de ${startFormatted}. O aluguel será reajustado anualmente de acordo com a variação acumulada do ${indice}.` },
        { id: 'c5', titulo: '5. DO VENCIMENTO', texto: 'O Locatário obriga-se a pagar o valor do aluguel mensal até o dia 10 (dez) de cada mês. Após o vencimento, o valor devido será acrescido de multa de 10%, juros de mora de 1% ao mês e correção pelo índice contratual.' },
        { id: 'c6', titulo: '6. DAS BENFEITORIAS', texto: 'O Locatário obriga-se a manter o imóvel em perfeitas condições de higiene e limpeza, restituindo-o nas mesmas condições em que o recebeu. É vedado efetuar reforma sem prévia autorização escrita do Locador.' },
        { id: 'c7', titulo: '7. DOS ENCARGOS', texto: 'Correrão por conta do Locatário todas as despesas de energia elétrica, água, esgoto, gás, condomínio e tributos incidentes sobre o imóvel.' },
        { id: 'c8', titulo: '8. DA VISTORIA DO IMÓVEL', texto: 'O Locador fica autorizado a vistoriar o imóvel sempre que julgar conveniente, nos dias úteis entre 8h e 18h, mediante aviso prévio de 24 horas.' },
        { id: 'c9', titulo: '9. DA MULTA', texto: `A infração de qualquer cláusula sujeitará o infrator a multa equivalente a ${multa} (${multaExt}) mês(es) de aluguel.` },
        { id: 'c10', titulo: '10. DA RESCISÃO', texto: `Em caso de rescisão antecipada pelo locatário, será devida multa equivalente a ${multa} (${multaExt}) mês(es) de aluguel.` },
        { id: 'c11', titulo: '11. DISPOSIÇÕES GERAIS', texto: 'O presente contrato é regido pela Lei do Inquilinato (Lei nº 8.245/91) e pelo Código Civil Brasileiro. Fica eleito o foro da comarca local para dirimir quaisquer dúvidas.' },
      ]
    }

    if (contract.type === 'commercial') {
      return [
        { id: 'c1', titulo: '1. DO OBJETO', texto: `Locação pelo Locatário do imóvel de propriedade do Locador, situado na ${property?.address}.` },
        { id: 'c2', titulo: '2. DA DESTINAÇÃO', texto: 'O imóvel destina-se única e exclusivamente para uso COMERCIAL.' },
        { id: 'c3', titulo: '3. DO PRAZO', texto: `Locação a partir de ${startFormatted} até ${endFormatted}. Após o 15º mês, fica facultado ao Locatário rescindir sem penalidade mediante notificação escrita.` },
        { id: 'c4', titulo: '4. DO VALOR', texto: `Aluguel mensal de ${valueFormatted}, reajustado anualmente pelo ${indice}.` },
        { id: 'c5', titulo: '5. DO VENCIMENTO', texto: 'Pagamento até o dia 10 de cada mês. Multa de 10%, juros de 1% ao mês e honorários de 20% em cobrança judicial.' },
        { id: 'c6', titulo: '6. DAS BENFEITORIAS', texto: 'Manutenção das condições do imóvel, vedada reforma sem autorização escrita.' },
        { id: 'c7', titulo: '7. DOS ENCARGOS', texto: 'Despesas de água, luz, gás, condomínio e tributos por conta do Locatário.' },
        { id: 'c8', titulo: '8. DA VISTORIA', texto: 'Vistorias mediante aviso prévio de 24 horas, em dias úteis das 8h às 18h.' },
        { id: 'c9', titulo: '9. DA MULTA', texto: `Multa equivalente a ${multa} (${multaExt}) aluguéis em caso de infração contratual.` },
        { id: 'c10', titulo: '10. DA SUBLOCAÇÃO', texto: 'Vedada sublocação sem consentimento prévio e por escrito do Locador.' },
        { id: 'c11', titulo: '11. DO DIREITO DE PREFERÊNCIA', texto: 'Direito de preferência para aquisição do imóvel, nos termos dos artigos 27 e seguintes da Lei 8.245/91.' },
        { id: 'c12', titulo: '12. DO FORO', texto: 'Foro da situação do imóvel para dirimir quaisquer dúvidas.' },
      ]
    }

    if (contract.type === 'intermediacao') {
      const comissaoTexto = contract.comissao_valor
        ? contract.comissao_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : contract.comissao_percentual ? `${contract.comissao_percentual}% sobre o valor do negócio` : 'a definir'
      return [
        { id: 'c1', titulo: 'CLÁUSULA 1ª — OBJETO', texto: `Contratação dos serviços da CONTRATADA para intermediação de venda/locação do imóvel situado na ${property?.address}.` },
        { id: 'c2', titulo: 'CLÁUSULA 2ª — DA CONTRATAÇÃO', texto: `A CONTRATANTE pagará pela intermediação o valor de ${comissaoTexto}.` },
        { id: 'c3', titulo: 'CLÁUSULA 3ª — DO INADIMPLEMENTO', texto: 'Correção pelo IGPM-FGV, juros de 1% ao mês e multa de 2% sobre débito corrigido.' },
        { id: 'c4', titulo: 'CLÁUSULA 4ª — TÍTULO EXECUTIVO', texto: 'Comissões são dívida líquida, certa e exigível, título executivo extrajudicial (art. 585 CPC).' },
        { id: 'c5', titulo: 'CLÁUSULA 5ª — DO RESULTADO ÚTIL', texto: 'Comissão devida mesmo em caso de desistência pelo CONTRATANTE, nos termos do art. 725 do Código Civil.' },
        { id: 'c6', titulo: 'CLÁUSULA 6ª — DA DOCUMENTAÇÃO', texto: 'Entrega de documentação pessoal em até 72 horas.' },
        { id: 'c7', titulo: 'CLÁUSULA 7ª — DA LGPD', texto: 'Sigilo e tratamento de dados conforme Lei 13.709/2018.' },
        { id: 'c8', titulo: 'CLÁUSULA 8ª — DO FORO', texto: 'Foro da comarca da situação do imóvel.' },
      ]
    }

    if (contract.type === 'promessa_compra_venda') {
      const sinalFormatted = contract.sinal_valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'a definir'
      return [
        { id: 'c1', titulo: '1. OBJETO', texto: `Compromisso de venda e compra do imóvel situado na ${property?.address}.` },
        { id: 'c2', titulo: '2. DO IMÓVEL', texto: `Imóvel identificado como "${property?.name}".` },
        { id: 'c3', titulo: '3. DO PREÇO', texto: `Preço total de ${valueFormatted}, com sinal de ${sinalFormatted}.` },
        { id: 'c4', titulo: '4. DA TRANSFERÊNCIA DA POSSE', texto: `Posse transmitida na data prevista para escritura: ${endFormatted}.` },
        { id: 'c5', titulo: '5. DOS TRIBUTOS', texto: 'Tributos até a posse por conta da VENDEDORA; ITBI e emolumentos por conta da COMPRADORA.' },
        { id: 'c6', titulo: '6. DA IRREVOGABILIDADE', texto: 'Contrato irrevogável e irretratável nos termos do art. 420 do Código Civil.' },
        { id: 'c7', titulo: '7. DA DOCUMENTAÇÃO', texto: 'Entrega de certidões e documentos em até 15 dias úteis.' },
        { id: 'c8', titulo: '8. DA INADIMPLÊNCIA', texto: 'Multa de 10% sobre valor inadimplido, juros de 1% ao mês.' },
        { id: 'c9', titulo: '9. DA RESCISÃO', texto: 'Multa de 10% sobre valor do contrato em caso de rescisão por qualquer parte.' },
        { id: 'c10', titulo: '10. DA LGPD', texto: 'Sigilo e tratamento de dados conforme Lei 13.709/2018.' },
        { id: 'c11', titulo: '11. DO FORO', texto: 'Foro da situação do imóvel.' },
      ]
    }

    if (contract.type === 'administracao') {
      const taxaAdmin = contract.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'a definir'
      const percentual = contract.comissao_percentual ? `${contract.comissao_percentual}%` : 'a definir'
      return [
        { id: 'c1', titulo: '1. DO OBJETO', texto: `Prestação de serviços de administração do imóvel "${property?.name}", situado na ${property?.address}.` },
        { id: 'c2', titulo: '2. DO PRAZO', texto: `Contrato de ${startFormatted} a ${endFormatted}.` },
        { id: 'c3', titulo: '3. DA PROCURAÇÃO', texto: 'Autorização para divulgação, recebimento e quitação de aluguéis em nome do CONTRATANTE.' },
        { id: 'c4', titulo: '4. OBRIGAÇÕES DA CONTRATADA', texto: 'Análise cadastral de locatários, divulgação do imóvel, repasse dos valores, cobrança em caso de inadimplência, vistorias periódicas e prestação de contas mensal.' },
        { id: 'c5', titulo: '5. OBRIGAÇÕES DO CONTRATANTE', texto: 'Manter tributos quitados, entregar imóvel em perfeito funcionamento, arcar com encargos no período de vacância.' },
        { id: 'c6', titulo: '6. DA REMUNERAÇÃO', texto: `Taxa de administração de ${taxaAdmin}/mês e percentual de ${percentual} do aluguel.` },
        { id: 'c7', titulo: '7. DA ASSISTÊNCIA JURÍDICA', texto: 'Patrocínio de ações de cobrança, despejo e revisionais sem ônus adicional ao CONTRATANTE.' },
        { id: 'c8', titulo: '8. DA RESCISÃO', texto: 'Rescisão mediante notificação com 30 dias de antecedência.' },
        { id: 'c9', titulo: '9. DA MULTA', texto: 'Multa equivalente a meses da taxa de administração em caso de infração contratual.' },
        { id: 'c10', titulo: '10. DA LGPD', texto: 'Sigilo e tratamento de dados conforme Lei 13.709/2018.' },
        { id: 'c11', titulo: '11. DO FORO', texto: 'Foro da comarca da situação do imóvel.' },
      ]
    }

    if (contract.type === 'exclusividade') {
      const honorarios = contract.comissao_percentual ? `${contract.comissao_percentual}%` : 'a definir'
      return [
        { id: 'c1', titulo: 'PRIMEIRA', texto: `Intermediação na comercialização do imóvel "${property?.name}", livre de ônus.` },
        { id: 'c2', titulo: 'SEGUNDA', texto: 'Intermediação em caráter de EXCLUSIVIDADE, nos termos do art. 726 do Código Civil.' },
        { id: 'c3', titulo: 'TERCEIRA', texto: 'Autorização para visitas e divulgação do imóvel por qualquer meio.' },
        { id: 'c4', titulo: 'QUARTA', texto: 'Negociação por valor diferente do estipulado requer aceite expresso do CONTRATANTE.' },
        { id: 'c5', titulo: 'QUINTA', texto: `Honorários de ${honorarios} sobre o valor da transação, devidos mesmo em caso de arrependimento (art. 725 CC).` },
        { id: 'c6', titulo: 'SEXTA', texto: `Vigência de ${startFormatted} a ${endFormatted}.` },
        { id: 'c7', titulo: 'SÉTIMA', texto: 'Comissão devida mesmo após o prazo, se resultado do trabalho do CONTRATADO (art. 727 CC).' },
        { id: 'c8', titulo: 'OITAVA', texto: 'Possibilidade de parceria com outras imobiliárias.' },
        { id: 'c9', titulo: 'NONA', texto: 'Reembolso de despesas em caso de rescisão/arrependimento do CONTRATANTE.' },
        { id: 'c10', titulo: 'DÉCIMA', texto: 'Foro da comarca da situação do imóvel.' },
      ]
    }

    if (contract.type === 'compra_venda') {
      return [
        { id: 'c1', titulo: 'ITEM 01 — DO OBJETO', texto: `O objeto deste contrato é a venda e compra do imóvel situado na ${property?.address}, de propriedade do VENDEDOR, livre e desembaraçado de quaisquer ônus ou gravames.` },
        { id: 'c2', titulo: 'ITEM 02 — DO PREÇO E PAGAMENTO', texto: `O preço total, acertado entre as partes, é de ${valueFormatted}, pago integralmente à vista na data da assinatura deste contrato, mediante transferência bancária ou outro meio acordado, dando ao VENDEDOR quitação plena, geral e irrevogável.` },
        { id: 'c3', titulo: 'ITEM 03 — DA POSSE E ENTREGA', texto: `A posse do imóvel será transferida ao COMPRADOR após a quitação integral do preço, permanecendo o VENDEDOR responsável por tributos, taxas e encargos vencidos até aquela data.` },
        { id: 'c4', titulo: 'ITEM 04 — DA ESCRITURA E REGISTRO', texto: `A escritura pública de compra e venda será lavrada em nome do COMPRADOR, perante o Cartório de Notas da comarca, e posteriormente registrada no Cartório de Registro de Imóveis da mesma comarca, estando o VENDEDOR obrigado a providenciar todos os documentos necessários para o registro.` },
        { id: 'c5', titulo: 'ITEM 05 — DA DOCUMENTAÇÃO', texto: `O VENDEDOR entregará ao COMPRADOR, na ocasião da assinatura da escritura, a matrícula do imóvel atualizada, o cadastro de IPTU quitado até a data da posse, as contas de água, luz e gás quitadas, e as certidões necessárias para a transferência.` },
        { id: 'c6', titulo: 'ITEM 06 — DA IRREVOGABILIDADE', texto: `O presente contrato é irrevogável e irretratável, nos termos dos artigos 417 a 420 do Código Civil, não admitindo arrependimento ou resolução unilateral por qualquer das partes.` },
        { id: 'c7', titulo: 'ITEM 07 — DAS DESPESAS E GARANTIAS', texto: `As despesas com a escrituração, registro, impostos (ITBI, emolumentos, etc.) serão de exclusiva responsabilidade do COMPRADOR, enquanto o VENDEDOR responderá por eventuais evicções ou vícios de título relacionados ao imóvel.` },
      ]
    }

    if (contract.type === 'servicos') {
      const servico = contract.servico_descricao ?? 'serviços especializados'
      return [
        { id: 'c1', titulo: 'CLÁUSULA PRIMEIRA — DO OBJETO', texto: `Prestação de serviços de ${servico} pela CONTRATADA.` },
        { id: 'c2', titulo: 'CLÁUSULA SEGUNDA — OBRIGAÇÕES DA CONTRATANTE', texto: 'Fornecer informações necessárias e efetuar pagamento conforme acordado.' },
        { id: 'c3', titulo: 'CLÁUSULA TERCEIRA — OBRIGAÇÕES DA CONTRATADA', texto: 'Realizar os serviços, manter sigilo, responder por ônus trabalhista e fornecer documentos fiscais.' },
        { id: 'c4', titulo: 'CLÁUSULA QUARTA — DOS SERVIÇOS', texto: `Início em ${contract.servico_prazo_inicio ?? 5} dias corridos da assinatura.` },
        { id: 'c5', titulo: 'CLÁUSULA QUINTA — DO PREÇO', texto: `Pagamento de ${valueFormatted}. Multa de ${contract.multa_atraso_pgto ?? 2}% em caso de atraso acima de 10 dias.` },
        { id: 'c6', titulo: 'CLÁUSULA SEXTA — DO DESCUMPRIMENTO', texto: `Multa de ${contract.multa_descumprimento ?? 10}% sobre valor do contrato.` },
        { id: 'c7', titulo: 'CLÁUSULA SÉTIMA — DO PRAZO', texto: 'Prazo indeterminado, vigendo até finalização do serviço.' },
        { id: 'c8', titulo: 'CLÁUSULA OITAVA — DA RESCISÃO', texto: `Rescisão sem motivo com ${contract.prazo_rescisao_dias ?? 15} dias de antecedência.` },
        { id: 'c9', titulo: 'CLÁUSULA NONA — DA LGPD', texto: 'Tratamento de dados conforme Art. 7º, V da LGPD.' },
        { id: 'c10', titulo: 'CLÁUSULA DÉCIMA — AUSÊNCIA DE VÍNCULO', texto: 'Sem vínculo trabalhista, subordinação ou habitualidade.' },
        { id: 'c11', titulo: 'CLÁUSULA DÉCIMA PRIMEIRA — DO FORO', texto: 'Foro da comarca de domicílio da CONTRATANTE.' },
      ]
    }

    return []
  }

  function renumerarClausulas(lista: Clausula[]): Clausula[] {
    return lista.map((c, idx) => {
      const numero = idx + 1
      // Remove qualquer numeração antiga do início do título (ex: "1.", "3ª", "CLÁUSULA QUINTA —", "ITEM 04 —", "PRIMEIRA", etc.)
      const tituloLimpo = c.titulo
        .replace(/^(\d+ª?\s*[-—.]?\s*)/i, '')
        .replace(/^(cláusula\s+\w+\s*[-—]\s*)/i, '')
        .replace(/^(item\s+\d+\s*[-—]\s*)/i, '')
        .replace(/^(primeira|segunda|terceira|quarta|quinta|sexta|sétima|oitava|nona|décima)\s*[-—]?\s*/i, '')
        .trim()
      return {
        ...c,
        titulo: `${numero}. ${tituloLimpo}`,
      }
    })
  }

  async function generatePDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const property = contract.properties
    const tenant = contract.people
    const owner = property?.people

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
    const owner = property?.people
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

  async function generatePromessaPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const property = contract.properties
    const owner = property?.people
    const buyer = contract.people

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
    const tenant = contract.people
    const owner = property?.people

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
    const owner = property?.people
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

  async function generateExclusividadePDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single()

    const property = contract.properties
    const owner = property?.people
    const contratado = perfil

    const startFormatted = contract.start_date
      ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const endFormatted = contract.end_date
      ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '___/___/______'
    const valueFormatted = contract.value
      ? contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'a definir'
    const honorarios = contract.comissao_percentual ? `${contract.comissao_percentual}%` : '____%'
    const condicoes = contract.banco_nome ?? 'A definir entre as partes'
    const matricula = contract.banco_agencia ?? '_______________'

    const addText = (text: string, y: number, indent = 0): number => {
      if (y > 265) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(text, contentWidth - indent)
      doc.text(lines, margin + indent, y)
      return y + lines.length * 5.5
    }

    const addClausula = (titulo: string, texto: string, y: number): number => {
      if (y > 255) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      const tituloLines = doc.splitTextToSize(titulo, contentWidth)
      doc.text(tituloLines, margin, y)
      y += tituloLines.length * 5.5 + 1
      doc.setFont('helvetica', 'normal')
      const textoLines = doc.splitTextToSize(texto, contentWidth - 6)
      if (y + textoLines.length * 5.5 > 268) { doc.addPage(); y = 20 }
      doc.text(textoLines, margin + 6, y)
      return y + textoLines.length * 5.5 + 4
    }

    let y = 20

    // CABEÇALHO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.text('COM CLÁUSULA DE EXCLUSIVIDADE', pageWidth / 2, y, { align: 'center' })
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100)
    doc.text('(Arts. 722 a 729 do Novo Código Civil c/c Art. 20, III da Lei nº 6.530/78 e Resolução COFECI nº 458/95)', pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0)
    y += 10

    // I. CONTRATANTE
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('I. CONTRATANTE:', margin, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)

    if (owner?.name) {
      doc.text(`Nome: ${owner.name}`, margin + 4, y); y += 6
      if (owner.cpf) { doc.text(`CPF: ${owner.cpf}`, margin + 4, y); y += 6 }
      if (owner.rg) { doc.text(`RG: ${owner.rg}`, margin + 4, y); y += 6 }
      if (owner.address) { doc.text(`Endereço: ${owner.address}`, margin + 4, y); y += 6 }
      if (owner.phone) { doc.text(`Telefone: ${owner.phone}`, margin + 4, y); y += 6 }
      if (owner.email) { doc.text(`E-mail: ${owner.email}`, margin + 4, y); y += 6 }
    } else {
      doc.setTextColor(150)
      doc.text('(Proprietário não vinculado — acesse Imóveis e vincule um proprietário)', margin + 4, y)
      doc.setTextColor(0)
      y += 6
    }
    y += 3

    // II. CONTRATADO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('II. CONTRATADO(A):', margin, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (contratado?.full_name) {
      doc.text(`Nome: ${contratado.full_name}`, margin + 4, y); y += 6
      if (contratado.cpf) { doc.text(`CPF: ${contratado.cpf}`, margin + 4, y); y += 6 }
      if (contratado.address) { doc.text(`Endereço: ${contratado.address}`, margin + 4, y); y += 6 }
      if (contratado.phone) { doc.text(`Telefone: ${contratado.phone}`, margin + 4, y); y += 6 }
    } else {
      doc.setTextColor(150)
      doc.text('(Preencha seus dados em "Meu Perfil" para aparecerem aqui)', margin + 4, y)
      doc.setTextColor(0)
      y += 6
    }
    y += 3

    // III. OBJETO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('III. OBJETO DO CONTRATO:', margin, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(`Imóvel: ${property.name}`, margin + 4, y); y += 6
    doc.text(`Localização: ${property.address}`, margin + 4, y); y += 6
    doc.text(`Matrícula: ${matricula}`, margin + 4, y); y += 6
    doc.text(`Preço para venda: ${valueFormatted}`, margin + 4, y); y += 6
    doc.text(`Condições de pagamento: ${condicoes}`, margin + 4, y); y += 6
    y += 4

    // CLÁUSULAS
    y = addClausula(
      'PRIMEIRA —',
      `O presente instrumento tem por finalidade a intermediação na comercialização do imóvel de propriedade do CONTRATANTE, descrito no item III, que o CONTRATANTE declara estar desembaraçado de qualquer ônus ou gravame, inclusive de natureza tributária.`,
      y
    )

    y = addClausula(
      'SEGUNDA —',
      'A intermediação ora contratada é realizada em caráter de EXCLUSIVIDADE, obrigando-se o CONTRATANTE a não tratar diretamente sobre a venda, direta ou indiretamente, sob pena da remuneração ser devida integralmente ao CONTRATADO, nos termos do art. 726 do Novo Código Civil.',
      y
    )

    y = addClausula(
      'TERCEIRA —',
      'Para realização do serviço ora acertado, o CONTRATANTE autoriza o CONTRATADO a promover visitas ao imóvel, bem como o autoriza à realização de divulgação no próprio imóvel, por meio de placa, faixa, internet ou qualquer outra forma a critério do CONTRATADO.',
      y
    )

    y = addClausula(
      'QUARTA —',
      'O CONTRATADO somente poderá fechar negócio por valor ou condição diferente do estipulado no item III mediante aceite expresso do CONTRATANTE. Sendo proposta de valor e condições rigorosamente iguais ao estipulado, o CONTRATADO está autorizado a fechar o negócio sem necessidade de aceite do CONTRATANTE.',
      y
    )

    y = addClausula(
      'QUINTA —',
      `Pela intermediação ora acertada, o CONTRATANTE pagará ao CONTRATADO, a título de honorários, o percentual de ${honorarios} calculados sobre o valor total pelo qual a transação for fechada.\n§ 1º — Os honorários serão pagos de uma só vez no exato momento do recebimento do sinal de negócio ou, se não houver sinal, por ocasião da assinatura da escritura pública.\n§ 2º — A remuneração é devida ao CONTRATADO desde que tenha conseguido o resultado útil previsto neste contrato, ainda que este não se efetive em virtude de arrependimento das partes, nos termos do art. 725 do Novo Código Civil.`,
      y
    )

    y = addClausula(
      'SEXTA —',
      `Este contrato é válido de ${startFormatted} até ${endFormatted}. Ao final do prazo, as partes acertarão a renovação ou não através de aditivo.`,
      y
    )

    y = addClausula(
      'SÉTIMA —',
      'Caso a negociação se concretize após o prazo da referida contratação, por efeitos do trabalho do CONTRATADO, independentemente de prazo, lhe será devida integralmente a remuneração pela corretagem, nos termos do artigo 727 do Novo Código Civil.',
      y
    )

    y = addClausula(
      'OITAVA —',
      'O CONTRATADO poderá fazer parceria com outra imobiliária ou corretor para venda do imóvel, ficando com a responsabilidade total pelo encaminhamento das negociações, bem como pelo acerto de comissão com o co-participante.',
      y
    )

    y = addClausula(
      'NONA —',
      'Em caso de rescisão ou arrependimento deste instrumento por parte do CONTRATANTE, já tendo o CONTRATADO oferecido o imóvel e gasto com anúncios, fica o CONTRATANTE sujeito ao pagamento de todas as despesas efetuadas pelo CONTRATADO.',
      y
    )

    y = addClausula(
      'DÉCIMA —',
      'As partes elegem o foro da comarca da situação do imóvel para dirimir qualquer dúvida relacionada a este instrumento, renunciando a qualquer outro, por mais privilegiado que seja.',
      y
    )

    // ASSINATURAS
    if (y > 220) { doc.addPage(); y = 20 }
    y = addText(`E por estarem justas e contratadas, as partes assinam o presente contrato em 02 (duas) vias de igual teor e forma, na presença das testemunhas.`, y)
    y += 4
    y = addText(`[cidade/estado], ${new Date().toLocaleDateString('pt-BR')}.`, y)
    y += 14

    // Linha contratante / contratado
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(owner?.name ?? 'CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text(contratado?.full_name ?? 'CONTRATADO', pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text('CONTRATADO', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 14

    // Cônjuges
    if (y > 255) { doc.addPage(); y = 20 }
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.setFontSize(9)
    doc.text('Cônjuge do Contratante', margin + 35, y, { align: 'center' })
    doc.text('Cônjuge do Contratado', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 14

    // Testemunhas
    if (y > 255) { doc.addPage(); y = 20 }
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('Testemunha 1 — CPF: _______________', margin + 35, y, { align: 'center' })
    doc.text('Testemunha 2 — CPF: _______________', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br · Arts. 722-729 Novo Código Civil', pageWidth / 2, 290, { align: 'center' })

    doc.save(`contrato-exclusividade-${(owner?.name ?? 'imovel').toLowerCase().replace(/ /g, '-')}.pdf`)
  } 

  async function generateCompraVendaPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const property = contract.properties
    const owner = property?.people
    const buyer = contract.people

    const totalFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const dataAssinatura = contract.start_date
      ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR')
    const comissaoFormatted = contract.comissao_valor
      ? contract.comissao_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

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
    doc.text('CONTRATO PARTICULAR DE COMPRA E VENDA DE IMÓVEL À VISTA', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addText('Pelo presente instrumento particular de compra e venda, de um lado o(s) VENDEDOR(ES), senhor(es) legítimo(s) possuidor(es) do imóvel abaixo descrito, e de outro lado o(s) COMPRADOR(ES), que mutuamente outorgam e aceitam o seguinte:', y)
    y += 4

    // ITEM 01 - VENDEDOR
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('ITEM 01 — VENDEDOR(ES):', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (owner?.name) {
      y = addItem(`${owner.name}${owner.cpf ? `, CPF nº ${owner.cpf}` : ''}${owner.rg ? `, RG nº ${owner.rg}` : ''}${owner.address ? `, residente na ${owner.address}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}${owner.phone ? `, telefone: ${owner.phone}` : ''}.`, y)
    } else {
      y = addItem('(Proprietário não vinculado — acesse Imóveis e vincule um proprietário)', y)
    }
    y += 3

    // ITEM 02 - COMPRADOR
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('ITEM 02 — COMPRADOR(ES):', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`${buyer.name}${buyer.cpf ? `, CPF nº ${buyer.cpf}` : ''}${buyer.email ? `, e-mail: ${buyer.email}` : ''}${buyer.phone ? `, telefone: ${buyer.phone}` : ''}.`, y)
    y += 3

    // ITEM 03 - IMÓVEL
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('ITEM 03 — DESCRIÇÃO DO IMÓVEL:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`${property.name}, localizado na ${property.address}.`, y)
    y += 3

    // ITEM 04 - PREÇO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('ITEM 04 — DO PREÇO E CONDIÇÕES DE PAGAMENTO:', margin, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`O preço certo e ajustado para esta venda é de ${totalFormatted}, pago integralmente, à vista, na data de assinatura deste instrumento, dando o(s) VENDEDOR(ES) plena, geral e irrevogável quitação.`, y)
    y += 4

    // ITEM 05 - POSSE
    y = addSection('ITEM 05 — DA POSSE', y)
    y = addItem('O promitente vendedor obriga-se a entregar o imóvel ao comprador imediatamente após a liberação do pagamento integral do valor venal do imóvel, conforme item 04. A partir da transferência da posse, o(s) COMPRADOR(ES) passa(m) a responder pelos impostos, taxas, despesas condominiais e outras despesas incidentes sobre o imóvel. Pelos débitos anteriores a essa data, ainda que lançados ou cobrados posteriormente, o(s) VENDEDOR(ES) será(ão) os únicos responsáveis.', y)
    y += 3

    // ITEM 06 - ESCRITURA
    y = addSection('ITEM 06 — DA ESCRITURA DEFINITIVA', y)
    y = addItem('A escritura pública definitiva será lavrada em nome do(s) comprador(es), e registrada junto ao Cartório de Registro de Imóveis competente.', y)
    y += 3

    // ITEM 07 - DOCUMENTAÇÃO
    y = addSection('ITEM 07 — DA DOCUMENTAÇÃO', y)
    y = addItem('O(s) Vendedor(es) se obriga(m) a entregar ao(s) Comprador(es), na ocasião da lavratura da escritura: matrícula atualizada, carnê de IPTU devidamente pago, contas de água e energia quitadas, certidão de débito municipal do imóvel, certidões pessoais (justiça federal, cartório de protesto e distribuições cíveis), e demais documentos necessários para a outorga da escritura.', y)
    y += 3

    // ITEM 08 - IRREVOGABILIDADE
    y = addSection('ITEM 08 — DA IRREVOGABILIDADE E IRRETRATABILIDADE', y)
    y = addItem('O presente negócio é estabelecido em caráter irrevogável e irretratável, extensivo aos herdeiros e sucessores dos contratantes, a qualquer título, não comportando, de parte a parte, direito de arrependimento, conforme os artigos 417 a 420 do Código Civil Brasileiro (Lei 10.406/2002).', y)
    y += 3

    // ITEM 09 - DECLARAÇÕES FINAIS
    y = addSection('ITEM 09 — DECLARAÇÕES FINAIS', y)
    y = addItem('a) O(s) COMPRADOR(ES) concorda(m) que todas as despesas com a transferência de débito ou escritura definitiva, tais como imposto de transmissão (ITBI), laudêmio se houver, taxas de registro de cartório e despachante, correrão exclusivamente por sua conta.', y)
    y = addItem('b) O(s) VENDEDOR(ES) compromete(m)-se desde já a providenciar todas as quitações fiscais referentes ao imóvel.', y)
    y = addItem('c) O(s) VENDEDOR(ES) declara(m) ter feito a venda boa, firme e valiosa, respondendo por evicção de direito.', y)
    y = addItem('d) As partes elegem o foro da comarca da situação do imóvel para dirimir quaisquer dúvidas oriundas do presente instrumento, renunciando a qualquer outro, por mais privilegiado que seja.', y)
    y = addItem('e) O presente instrumento obriga, em todos os seus termos, os contratantes, seus bens, herdeiros e sucessores a qualquer título.', y)
    if (comissaoFormatted) {
      y = addItem(`f) O(s) VENDEDOR(ES) compromete(m)-se a efetuar o pagamento ao corretor intermediador, no ato do recebimento, de ${comissaoFormatted} a título de comissão pela intermediação realizada.`, y)
    }
    y += 6

    // ASSINATURAS
    if (y > 220) { doc.addPage(); y = 20 }
    y = addText('E, assim, por se acharem justos e contratados, as partes assinam o presente instrumento em 03 (três) vias de igual teor e forma para um só efeito.', y)
    y += 4
    y = addText(`[cidade/estado], ${dataAssinatura}.`, y)
    y += 14

    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(owner?.name ?? 'VENDEDOR', margin + 35, y, { align: 'center' })
    doc.text('Cônjuge', pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('VENDEDOR', margin + 35, y, { align: 'center' })
    doc.text('CÔNJUGE', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 14

    if (y > 255) { doc.addPage(); y = 20 }
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(buyer.name, margin + 35, y, { align: 'center' })
    doc.text('Cônjuge', pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('COMPRADOR', margin + 35, y, { align: 'center' })
    doc.text('CÔNJUGE', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 14

    if (y > 255) { doc.addPage(); y = 20 }
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('Testemunha 1 — CPF: _______________', margin + 35, y, { align: 'center' })
    doc.text('Testemunha 2 — CPF: _______________', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br · Arts. 417-420 Código Civil', pageWidth / 2, 290, { align: 'center' })

    doc.save(`contrato-compra-venda-${buyer.name.toLowerCase().replace(/ /g, '-')}.pdf`)
  }

  async function generateServicosPDF(contract: Contract) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single()

    const prestador = contract.people
    const contratante = perfil

    const dataAssinatura = contract.start_date
      ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR')
    const valueFormatted = contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const servico = contract.servico_descricao ?? 'serviços especializados'
    const prazoInicio = contract.servico_prazo_inicio ?? 5
    const multaAtraso = contract.multa_atraso_pgto ?? 2
    const multaDescump = contract.multa_descumprimento ?? 10
    const prazoRescisao = contract.prazo_rescisao_dias ?? 15

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
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text('DAS PARTES', margin, y); y += 7
    doc.setFont('helvetica', 'normal')

    // CONTRATADA (prestador de serviço)
    y = addItem(`${prestador.name}${prestador.cpf ? `, CPF nº ${prestador.cpf}` : ''}${prestador.email ? `, e-mail: ${prestador.email}` : ''}${prestador.phone ? `, telefone: ${prestador.phone}` : ''}, doravante denominada CONTRATADA;`, y)
    y += 3
    doc.setFont('helvetica', 'bold')
    doc.text('e', margin, y); y += 6
    doc.setFont('helvetica', 'normal')

    // CONTRATANTE (você/seu perfil)
    if (contratante?.full_name) {
      y = addItem(`${contratante.full_name}${contratante.cpf ? `, CPF nº ${contratante.cpf}` : ''}${contratante.rg ? `, RG nº ${contratante.rg}` : ''}${contratante.address ? `, residente na ${contratante.address}` : ''}${contratante.phone ? `, telefone: ${contratante.phone}` : ''}, doravante denominado CONTRATANTE.`, y)
    } else {
      y = addItem('(Preencha seus dados em "Meu Perfil" para aparecerem aqui), doravante denominado CONTRATANTE.', y)
    }
    y += 4

    y = addText('Assim sendo, ambas as partes decidem celebrar o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, mediante as cláusulas e condições definidas a seguir.', y)
    y += 6

    // CLÁUSULAS
    y = addSection('CLÁUSULA PRIMEIRA — DO OBJETO', y)
    y = addItem(`1.1 Este contrato refere-se à prestação de serviços profissionais especializados em ${servico} pela CONTRATADA, conforme os termos e condições detalhados neste presente contrato.`, y)
    y += 3

    y = addSection('CLÁUSULA SEGUNDA — OBRIGAÇÕES DA CONTRATANTE', y)
    y = addItem('2.1 Caberá à CONTRATANTE fornecer à CONTRATADA todas as informações necessárias à realização do serviço, especificando os detalhes fundamentais à sua consecução.', y)
    y = addItem('2.2 O pagamento deve ser efetuado pela CONTRATANTE de acordo com a forma e condições estabelecidas na cláusula específica deste contrato.', y)
    y += 3

    y = addSection('CLÁUSULA TERCEIRA — OBRIGAÇÕES DA CONTRATADA', y)
    y = addItem('3.1 A CONTRATADA deverá realizar os serviços solicitados pela CONTRATANTE conforme acordado.', y)
    y = addItem('3.2 A CONTRATADA se obriga a manter absoluto sigilo sobre as operações, dados, estratégias e informações da CONTRATANTE, mesmo após a conclusão dos serviços, sendo vedada a comercialização ou uso para outras finalidades.', y)
    y = addItem('3.3 Será de responsabilidade da CONTRATADA o ônus trabalhista ou tributário referente a funcionários envolvidos na prestação do serviço, ficando a CONTRATANTE isenta de qualquer obrigação em relação a eles.', y)
    y = addItem('3.4 A CONTRATADA deverá fornecer os documentos fiscais referentes ao(s) pagamento(s) do serviço.', y)
    y += 3

    y = addSection('CLÁUSULA QUARTA — DOS SERVIÇOS', y)
    y = addItem(`4.1 A CONTRATADA realizará os serviços contratados conforme especificado: ${servico}.`, y)
    y = addItem(`4.2 Os serviços terão início em ${prazoInicio} (${prazoInicio === 1 ? 'um' : prazoInicio} dias) dias corridos da assinatura deste contrato.`, y)
    y += 3

    y = addSection('CLÁUSULA QUINTA — DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO', y)
    y = addItem(`5.1 A CONTRATANTE se responsabiliza a pagar o valor de ${valueFormatted} à CONTRATADA pelos serviços prestados, até a finalização do serviço.`, y)
    y = addItem(`5.2 Caso haja mais de 10 dias de atraso no pagamento, será devida multa moratória de ${multaAtraso}% sobre a parcela inadimplida.`, y)
    y = addItem('5.3 Considera-se o cumprimento integral do contrato o momento em que todos os serviços especificados tenham sido concluídos, sob aprovação e revisão final da CONTRATANTE.', y)
    y += 3

    y = addSection('CLÁUSULA SEXTA — DO DESCUMPRIMENTO', y)
    y = addItem('6.1 O descumprimento de qualquer uma das cláusulas por qualquer parte implicará na rescisão imediata deste contrato.', y)
    y = addItem(`6.2 Havendo descumprimento deste contrato, será devida multa de ${multaDescump}% sobre o valor do contrato.`, y)
    y += 3

    y = addSection('CLÁUSULA SÉTIMA — DO PRAZO E VALIDADE', y)
    y = addItem('7.1 A CONTRATADA deverá realizar os serviços dentro dos prazos determinados pela CONTRATANTE, sendo sua responsabilidade comunicar a impossibilidade de cumprimento, podendo as partes estabelecer novo prazo.', y)
    y = addItem('7.2 Este instrumento é válido por prazo indeterminado, vigendo até a finalização do serviço.', y)
    y += 3

    y = addSection('CLÁUSULA OITAVA — DA RESCISÃO IMOTIVADA', y)
    y = addItem(`8.1 Poderá o presente instrumento ser rescindido por qualquer das partes, em qualquer momento, sem motivo relevante, respeitando-se período mínimo de ${prazoRescisao} dias de antecedência, cabendo à CONTRATANTE pagar apenas os valores referentes aos serviços em andamento.`, y)
    y += 3

    y = addSection('CLÁUSULA NONA — DA OBSERVÂNCIA À LGPD', y)
    y = addItem('9.1 A CONTRATANTE expressa consentimento de que a CONTRATADA irá coletar, tratar e compartilhar os dados necessários para o cumprimento do contrato, nos termos do Art. 7º, inc. V da LGPD, e demais leis referentes à utilização de dados.', y)
    y += 3

    y = addSection('CLÁUSULA DÉCIMA — DA AUSÊNCIA DE VÍNCULO TRABALHISTA', y)
    y = addItem('10.1 Este contrato expressa a total inexistência de vínculo trabalhista entre as partes.', y)
    y = addItem('10.2 Não há subordinação, pessoalidade ou habitualidade na relação entre as partes, não se configurando qualquer vínculo empregatício.', y)
    y += 3

    y = addSection('CLÁUSULA DÉCIMA PRIMEIRA — DO FORO', y)
    y = addItem('11.1 Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de domicílio da CONTRATANTE.', y)
    y += 8

    // ASSINATURAS
    if (y > 225) { doc.addPage(); y = 20 }
    y = addText('Justos e de acordo, firmam o presente instrumento, em duas vias de igual teor, juntamente com 2 (duas) testemunhas.', y)
    y += 4
    y = addText(`[Local], ${dataAssinatura}.`, y)
    y += 14

    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setFontSize(9)
    doc.text(contratante?.full_name ?? 'CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text(prestador.name, pageWidth / 2 + 45, y, { align: 'center' })
    y += 4
    doc.setTextColor(120)
    doc.text('CONTRATANTE', margin + 35, y, { align: 'center' })
    doc.text('CONTRATADA', pageWidth / 2 + 45, y, { align: 'center' })
    doc.setTextColor(0)
    y += 14

    if (y > 255) { doc.addPage(); y = 20 }
    doc.text('Testemunhas:', margin, y); y += 8
    doc.line(margin, y, margin + 70, y)
    doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
    y += 5
    doc.setTextColor(120)
    doc.text('1. Nome: _______________  CPF: _______________', margin, y)
    doc.text('2. Nome: _______________  CPF: _______________', pageWidth / 2 + 10, y)
    doc.setTextColor(0)

    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 290, { align: 'center' })

    doc.save(`contrato-prestacao-servicos-${prestador.name.toLowerCase().replace(/ /g, '-')}.pdf`)
  }

async function generatePDFComClausulas(contract: Contract, clausulasEditadas: Clausula[]) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single()

  const property = contract.properties
  const tenant = contract.people
  const owner = property?.people

  const startFormatted = contract.start_date
    ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '___/___/______'
  const endFormatted = contract.end_date
    ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
    : 'indeterminado'
  const valueFormatted = contract.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'a combinar'
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

  // TÍTULO
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('INSTRUMENTO PARTICULAR DE CONTRATO', pageWidth / 2, y, { align: 'center' })
  y += 6

  // Define o título específico baseado no tipo de contrato
  const contractTitles: Record<string, string> = {
    rental: 'DE LOCAÇÃO RESIDENCIAL',
    commercial: 'DE LOCAÇÃO COMERCIAL',
    intermediacao: 'DE INTERMEDIAÇÃO IMOBILIÁRIA',
    promessa_compra_venda: 'DE PROMESSA DE COMPRA E VENDA',
    administracao: 'DE ADMINISTRAÇÃO DE IMÓVEIS',
    exclusividade: 'DE EXCLUSIVIDADE',
    compra_venda: 'DE COMPRA E VENDA',
    servicos: 'DE PRESTAÇÃO DE SERVIÇOS',
  }
  doc.text(contractTitles[contract.type] || '', pageWidth / 2, y, { align: 'center' })
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  // Define os rótulos e quem é quem, conforme o tipo de contrato
  const labels: Record<string, { parte1: string; parte2: string }> = {
    rental: { parte1: 'LOCADOR', parte2: 'LOCATÁRIO' },
    commercial: { parte1: 'LOCADOR', parte2: 'LOCATÁRIO' },
    intermediacao: { parte1: 'CONTRATANTE', parte2: 'CONTRATADA' },
    promessa_compra_venda: { parte1: 'VENDEDOR', parte2: 'COMPRADOR' },
    administracao: { parte1: 'CONTRATANTE', parte2: 'CONTRATADA' },
    exclusividade: { parte1: 'CONTRATANTE', parte2: 'CONTRATADO' },
    compra_venda: { parte1: 'VENDEDOR', parte2: 'COMPRADOR' },
    servicos: { parte1: 'CONTRATANTE', parte2: 'CONTRATADA' },
  }
  const rotulo = labels[contract.type] ?? { parte1: 'PARTE 1', parte2: 'PARTE 2' }

  // Define quem preenche cada papel:
  // - Contratos de locação/venda: PARTE 1 = proprietário do imóvel, PARTE 2 = inquilino/comprador
  // - Intermediação/Administração/Exclusividade: PARTE 1 = proprietário (CONTRATANTE), PARTE 2 = você (CONTRATADA)
  // - Serviços: PARTE 1 = você (CONTRATANTE), PARTE 2 = prestador de serviço (inquilino cadastrado)
  const ehVoceQuemContrata = ['servicos'].includes(contract.type)
  const ehVoceQuemEContratado = ['intermediacao', 'administracao', 'exclusividade'].includes(contract.type)

  let dadosParte1: { nome: string; cpf?: string; rg?: string; endereco?: string; telefone?: string; email?: string } | null = null
  let dadosParte2: { nome: string; cpf?: string; rg?: string; endereco?: string; telefone?: string; email?: string } | null = null

  if (ehVoceQuemContrata) {
    // Você é o CONTRATANTE, o "tenant" cadastrado é o prestador (CONTRATADA)
    dadosParte1 = perfil?.full_name ? { nome: perfil.full_name, cpf: perfil.cpf, rg: perfil.rg, endereco: perfil.address, telefone: perfil.phone } : null
    dadosParte2 = tenant ? { nome: tenant.name, cpf: tenant.cpf, telefone: tenant.phone, email: tenant.email } : null
  } else if (ehVoceQuemEContratado) {
    // Proprietário é o CONTRATANTE, você é a CONTRATADA
    dadosParte1 = owner ? { nome: owner.name, cpf: owner.cpf, rg: owner.rg, endereco: owner.address, telefone: owner.phone, email: owner.email } : null
    dadosParte2 = perfil?.full_name ? { nome: perfil.full_name, cpf: perfil.cpf, rg: perfil.rg, endereco: perfil.address, telefone: perfil.phone } : null
  } else {
    // Locação / Compra e venda: proprietário x inquilino/comprador
    dadosParte1 = owner ? { nome: owner.name, cpf: owner.cpf, rg: owner.rg, endereco: owner.address, telefone: owner.phone, email: owner.email } : null
    dadosParte2 = tenant ? { nome: tenant.name, cpf: tenant.cpf, telefone: tenant.phone, email: tenant.email } : null
  }

  // ── PREÂMBULO ──
  y = addText('Pelo presente instrumento particular de contrato e na melhor forma de Direito, as partes abaixo qualificadas:', y)
  y += 4

  // ── PARTE 1 ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`${rotulo.parte1}`, margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  if (dadosParte1?.nome) {
    y = addItem(`${dadosParte1.nome}${dadosParte1.cpf ? `, CPF nº ${dadosParte1.cpf}` : ''}${dadosParte1.rg ? `, RG nº ${dadosParte1.rg}` : ''}${dadosParte1.endereco ? `, residente na ${dadosParte1.endereco}` : ''}${dadosParte1.telefone ? `, telefone: ${dadosParte1.telefone}` : ''}${dadosParte1.email ? `, e-mail: ${dadosParte1.email}` : ''}.`, y)
  } else {
    doc.setTextColor(150)
    y = addItem(ehVoceQuemContrata ? '(Preencha seus dados em "Meu Perfil")' : '(Proprietário não vinculado ao imóvel)', y)
    doc.setTextColor(0)
  }
  y += 4

  // ── PARTE 2 ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`${rotulo.parte2}`, margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  if (dadosParte2?.nome) {
    y = addItem(`${dadosParte2.nome}${dadosParte2.cpf ? `, CPF nº ${dadosParte2.cpf}` : ''}${dadosParte2.rg ? `, RG nº ${dadosParte2.rg}` : ''}${dadosParte2.endereco ? `, residente na ${dadosParte2.endereco}` : ''}${dadosParte2.telefone ? `, telefone: ${dadosParte2.telefone}` : ''}${dadosParte2.email ? `, e-mail: ${dadosParte2.email}` : ''}.`, y)
  } else {
    doc.setTextColor(150)
    y = addItem(ehVoceQuemEContratado ? '(Preencha seus dados em "Meu Perfil")' : '(Selecione um inquilino/comprador no contrato)', y)
    doc.setTextColor(0)
  }
  y += 4

  if (contract.fiador_nome) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('FIADOR(A):', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addItem(`${contract.fiador_nome}${contract.fiador_cpf ? `, CPF nº ${contract.fiador_cpf}` : ''}.`, y)
    y += 4
  }

  y += 6

  // NÚMEROS DAS CLÁUSULAS
  const clausulasNumeradas = clausulasEditadas.map((clausula, index) => {
    const numero = index + 1
    // Remove qualquer numeração antiga do início do título
    const tituloLimpo = clausula.titulo
      .replace(/^(\d+ª?\s*[-—.]?\s*)/i, '')
      .replace(/^(cláusula\s+\w+\s*[-—]\s*)/i, '')
      .replace(/^(item\s+\d+\s*[-—]\s*)/i, '')
      .replace(/^(primeira|segunda|terceira|quarta|quinta|sexta|sétima|oitava|nona|décima)\s*[-—]?\s*/i, '')
      .trim()
    return {
      ...clausula,
      titulo: `${numero}. ${tituloLimpo}`,
      texto: clausula.texto
    }
  })

  // SEÇÃO DAS CLÁUSULAS (equivalente à seção 3. DO PRAZO nos contratos específicos)
  y = addSection('3. DAS CLÁUSULAS CONTRATUAIS', y)

  // ADICIONA AS CLÁUSULAS EDITÁVEIS
  clausulasNumeradas.forEach((clausula, index) => {
    if (y > 250) { doc.addPage(); y = 20 }

    // Número e título da cláusula
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(clausula.titulo, margin, y)
    y += 6

    // Texto da cláusula
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    y = addText(clausula.texto, y, 4)
    y += 6
  })

  y += 6

  // ASSINATURAS
  if (y > 230) { doc.addPage(); y = 20 }
  y = addText('E, assim, por estarem justas e contratadas, as partes assinam o presente instrumento em 02 (duas) vias de igual teor, na presença de 02 (duas) testemunhas.', y)
  y += 4
  y = addText(`[cidade/estado], ${new Date().toLocaleDateString('pt-BR')}.`, y)
  y += 12

  doc.line(margin, y, margin + 70, y)
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
  y += 5
  doc.setFontSize(9)
  doc.text(dadosParte1?.nome ?? rotulo.parte1, margin + 35, y, { align: 'center' })
  doc.text(dadosParte2?.nome ?? rotulo.parte2, pageWidth / 2 + 45, y, { align: 'center' })
  y += 4
  doc.setTextColor(120)
  doc.text(rotulo.parte1, margin + 35, y, { align: 'center' })
  doc.text(rotulo.parte2, pageWidth / 2 + 45, y, { align: 'center' })
  doc.setTextColor(0)
  y += 12

  if (y > 255) { doc.addPage(); y = 20 }
  doc.text('Testemunhas:', margin, y); y += 8
  doc.line(margin, y, margin + 70, y)
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y)
  y += 5
  doc.setTextColor(120)
  doc.text('1. Nome: _______________  CPF: _______________', margin, y)
  doc.text('2. Nome: _______________  CPF: _______________', pageWidth / 2 + 10, y)
  doc.setTextColor(0)

  doc.setFontSize(7)
  doc.setTextColor(150)
  // Adiciona referência à lei específica conforme o tipo de contrato
  let lawReference = 'Lei 8.245/1991' // Padrão para locação
  if (contract.type === 'promessa_compra_venda' || contract.type === 'compra_venda') {
    lawReference = 'Lei 13.786/2018 (Lei do Registro Imobiliário)'
  } else if (contract.type === 'servicos') {
    lawReference = 'Lei 13.709/2018 (LGPD) e Código Civil'
  }
  doc.text(`Gerado por ImobApp · imobapp.com.br · ${lawReference}`, pageWidth / 2, 290, { align: 'center' })

  doc.save(`contrato-personalizado-${(tenant?.name ?? 'contrato').toLowerCase().replace(/ /g, '-')}.pdf`)
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
              {form.type === 'compra_venda' && (
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
                    <label className="text-sm font-medium text-gray-700">Valor de venda à vista (R$)</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      placeholder="Ex: 350000"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data da assinatura</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comissão do corretor (R$, opcional)</label>
                    <input type="number" value={form.comissao_valor} onChange={e => setForm({ ...form, comissao_valor: e.target.value })}
                      placeholder="Ex: 15000"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              {form.type === 'promessa_compra_venda' && (
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
              {form.type === 'exclusividade' && (
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
                    <label className="text-sm font-medium text-gray-700">Preço para venda (R$)</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      placeholder="Ex: 350000"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Honorários (%)</label>
                    <input type="number" value={form.comissao_percentual} onChange={e => setForm({ ...form, comissao_percentual: e.target.value })}
                      placeholder="Ex: 6"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Condições de pagamento</label>
                    <input type="text" value={form.banco_nome} onChange={e => setForm({ ...form, banco_nome: e.target.value })}
                      placeholder="Ex: À vista, financiamento, permuta..."
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nº matrícula do imóvel</label>
                    <input type="text" value={form.banco_agencia} onChange={e => setForm({ ...form, banco_agencia: e.target.value })}
                      placeholder="Ex: 12345"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              {/* ── CAMPOS PARA PRESTAÇÃO DE SERVIÇOS ── */}
              {form.type === 'servicos' && (
                <>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Descrição do serviço</label>
                    <input type="text" value={form.servico_descricao} onChange={e => setForm({ ...form, servico_descricao: e.target.value })}
                      placeholder="Ex: Reparo hidráulico, pintura, instalação elétrica..."
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prestador de serviço</label>
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
                    <label className="text-sm font-medium text-gray-700">Data de assinatura</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prazo para início (dias corridos)</label>
                    <input type="number" value={form.servico_prazo_inicio} onChange={e => setForm({ ...form, servico_prazo_inicio: e.target.value })}
                      placeholder="Ex: 5"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Multa por atraso no pagamento (%)</label>
                    <input type="number" value={form.multa_atraso_pgto} onChange={e => setForm({ ...form, multa_atraso_pgto: e.target.value })}
                      placeholder="Ex: 2"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Multa por descumprimento (%)</label>
                    <input type="number" value={form.multa_descumprimento} onChange={e => setForm({ ...form, multa_descumprimento: e.target.value })}
                      placeholder="Ex: 10"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Antecedência p/ rescisão (dias)</label>
                    <input type="number" value={form.prazo_rescisao_dias} onChange={e => setForm({ ...form, prazo_rescisao_dias: e.target.value })}
                      placeholder="Ex: 15"
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
                    <span className="text-sm font-semibold text-gray-900">{c.people?.name}</span>
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
                    setContractParaGerar(c)
                    setClausulas(renumerarClausulas(montarClausulasPadrao(c)))
                    setShowClausulasEditor(true)
                  }}             
                  // onClick={() => {
                  //   if (c.type === 'intermediacao') generateIntermediacaoPDF(c)
                  //   else if (c.type === 'promessa_compra_venda') generatePromessaPDF(c)
                  //   else if (c.type === 'commercial') generateLocacaoComercialPDF(c)
                  //   else if (c.type === 'administracao') generateAdministracaoPDF(c)
                  //   else if (c.type === 'exclusividade') generateExclusividadePDF(c)
                  //   else if (c.type === 'compra_venda') generateCompraVendaPDF(c)
                  //   else if (c.type === 'servicos') generateServicosPDF(c)
                  //   else generatePDF(c)
                  // }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  ⬇ Revisar PDF
                </button>
              </div>
            ))}
          </div>
        )}
        {showClausulasEditor && contractParaGerar && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Editor de cláusulas</h3>
                  <p className="text-sm text-gray-500">Revise e personalize antes de gerar o PDF</p>
                </div>
                <button onClick={() => setShowClausulasEditor(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {clausulas.map((c, idx) => {
                  const match = c.titulo.match(/^(\d+\.\s*)(.*)$/)
                  const numero = match ? match[1] : `${idx + 1}. `
                  const nomeClausula = match ? match[2] : c.titulo

                  return (
                    <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center flex-1 gap-1">
                          <div className="flex flex-col -ml-1 mr-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const novas = [...clausulas]
                                  ;[novas[idx - 1], novas[idx]] = [novas[idx], novas[idx - 1]]
                                setClausulas(renumerarClausulas(novas))
                              }}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === clausulas.length - 1}
                              onClick={() => {
                                const novas = [...clausulas]
                                  ;[novas[idx], novas[idx + 1]] = [novas[idx + 1], novas[idx]]
                                setClausulas(renumerarClausulas(novas))
                              }}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                            >
                              ▼
                            </button>
                          </div>
                          <span className="font-semibold text-sm text-gray-500">{numero}</span>
                          <input
                            type="text"
                            value={nomeClausula}
                            onChange={e => {
                              const novas = clausulas.map((cl, i) =>
                                i === idx ? { ...cl, titulo: `${numero}${e.target.value}` } : cl
                              )
                              setClausulas(novas)
                            }}
                            className="font-semibold text-sm text-gray-900 border-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 flex-1"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setClausulas(renumerarClausulas(clausulas.filter(cl => cl.id !== c.id)))}
                          className="text-gray-400 hover:text-red-500 text-sm ml-2"
                        >
                          🗑️
                        </button>
                      </div>
                      <textarea
                        value={c.texto}
                        onChange={e => {
                          const novoTexto = e.target.value
                          const novas = clausulas.map((cl, i) =>
                            i === idx ? { ...cl, texto: novoTexto } : cl
                          )
                          setClausulas(novas)
                        }}
                        rows={3}
                        className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      />
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={() => {
                    const novaLista = [...clausulas, {
                      id: `extra-${Date.now()}`,
                      titulo: 'NOVA CLÁUSULA',
                      texto: 'Digite o texto da cláusula aqui...'
                    }]
                    setClausulas(renumerarClausulas(novaLista))
                  }}
                  className="w-full border-2 border-dashed border-gray-300 text-gray-500 rounded-lg py-3 text-sm hover:bg-gray-50 hover:border-gray-400"
                >
                  + Adicionar cláusula
                </button>
              </div>

              <div className="p-5 border-t border-gray-200 flex gap-3">
                <button
                  onClick={async () => {
                    await generatePDFComClausulas(contractParaGerar, clausulas)
                    setShowClausulasEditor(false)
                  }}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  ⬇ Gerar PDF com essas cláusulas
                </button>
                <button
                  onClick={() => setShowClausulasEditor(false)}
                  className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}       
      </main>
    </div>
  )
}