'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import jsPDF from 'jspdf'

type Property = { id: string; name: string; address: string }

type ChecklistItem = {
  id: string
  comodo: string
  item: string
  estado: 'otimo' | 'bom' | 'regular' | 'ruim' | ''
  observacao: string
}

type Vistoria = {
  id: string
  type: string
  scheduled_date: string
  status: string
  properties: Property
  checklist: ChecklistItem[]
}

const CHECKLIST_PADRAO: Omit<ChecklistItem, 'estado' | 'observacao'>[] = [
  { id: '1', comodo: 'Sala',    item: 'Paredes e teto' },
  { id: '2', comodo: 'Sala',    item: 'Piso' },
  { id: '3', comodo: 'Sala',    item: 'Portas e janelas' },
  { id: '4', comodo: 'Cozinha', item: 'Paredes e teto' },
  { id: '5', comodo: 'Cozinha', item: 'Piso' },
  { id: '6', comodo: 'Cozinha', item: 'Pia e torneira' },
  { id: '7', comodo: 'Banheiro', item: 'Paredes e teto' },
  { id: '8', comodo: 'Banheiro', item: 'Vaso e descarga' },
  { id: '9', comodo: 'Banheiro', item: 'Chuveiro' },
  { id: '10', comodo: 'Quarto',  item: 'Paredes e teto' },
  { id: '11', comodo: 'Quarto',  item: 'Piso' },
  { id: '12', comodo: 'Quarto',  item: 'Portas e janelas' },
  { id: '13', comodo: 'Área',    item: 'Paredes' },
  { id: '14', comodo: 'Área',    item: 'Piso' },
]

const estadoCores: Record<string, string> = {
  otimo:   'bg-green-100 text-green-700 border-green-300',
  bom:     'bg-blue-100 text-blue-700 border-blue-300',
  regular: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  ruim:    'bg-red-100 text-red-700 border-red-300',
  '':      'bg-gray-100 text-gray-500 border-gray-200',
}

export default function VistoriasPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showChecklist, setShowChecklist] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [form, setForm] = useState({ property_id: '', type: 'entrada', scheduled_date: '' })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from('properties').select('*'),
      supabase.from('inspections').select('*, properties(*)').order('scheduled_date', { ascending: false }),
    ])

    setProperties(p ?? [])
    setVistorias(v ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.property_id || !form.scheduled_date) {
      alert('Selecione o imóvel e a data')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('inspections').insert({
      user_id: user!.id,
      property_id: form.property_id,
      type: form.type,
      scheduled_date: form.scheduled_date,
      status: 'agendada',
      checklist: CHECKLIST_PADRAO.map(i => ({ ...i, estado: '', observacao: '' })),
    })
    if (error) { alert('Erro: ' + error.message) }
    else {
      setForm({ property_id: '', type: 'entrada', scheduled_date: '' })
      setShowForm(false)
      loadAll()
    }
    setSaving(false)
  }

  function abrirChecklist(v: Vistoria) {
    setChecklist(v.checklist ?? CHECKLIST_PADRAO.map(i => ({ ...i, estado: '', observacao: '' })))
    setShowChecklist(v.id)
  }

  async function salvarChecklist(vistoriaId: string) {
    await supabase.from('inspections').update({ checklist, status: 'concluida' }).eq('id', vistoriaId)
    setShowChecklist(null)
    loadAll()
  }

  function updateItem(id: string, field: 'estado' | 'observacao', value: string) {
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function gerarPDF(v: Vistoria) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('RELATÓRIO DE VISTORIA', pageWidth / 2, 25, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} pelo ImobApp`, pageWidth / 2, 33, { align: 'center' })
    doc.setTextColor(0)

    doc.setDrawColor(200)
    doc.line(20, 38, 190, 38)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DA VISTORIA', 20, 48)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Imóvel: ${v.properties?.name}`, 20, 57)
    doc.text(`Endereço: ${v.properties?.address}`, 20, 64)
    doc.text(`Tipo: ${v.type === 'entrada' ? 'Entrada' : 'Saída'}`, 20, 71)
    doc.text(`Data: ${new Date(v.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR')}`, 20, 78)
    doc.text(`Status: ${v.status === 'concluida' ? 'Concluída' : 'Agendada'}`, 20, 85)

    doc.line(20, 91, 190, 91)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('CHECKLIST', 20, 101)

    let y = 110
    const items = v.checklist ?? []
    let comodoAtual = ''

    items.forEach(item => {
      if (y > 260) { doc.addPage(); y = 20 }

      if (item.comodo !== comodoAtual) {
        comodoAtual = item.comodo
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(item.comodo.toUpperCase(), 20, y)
        y += 7
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`• ${item.item}:`, 24, y)

      const estadoLabel: Record<string, string> = {
        otimo: 'Ótimo', bom: 'Bom', regular: 'Regular', ruim: 'Ruim', '': 'Não avaliado'
      }
      doc.setFont('helvetica', 'bold')
      doc.text(estadoLabel[item.estado] ?? '-', 130, y)
      doc.setFont('helvetica', 'normal')

      if (item.observacao) {
        y += 5
        doc.setTextColor(100)
        doc.text(`  Obs: ${item.observacao}`, 24, y)
        doc.setTextColor(0)
      }
      y += 7
    })

    y += 10
    doc.line(20, y, 190, y)
    y += 10
    doc.setFontSize(10)
    doc.text('Assinatura do Vistoriador', 60, y + 15, { align: 'center' })
    doc.text('Assinatura do Inquilino', 145, y + 15, { align: 'center' })

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 285, { align: 'center' })

    doc.save(`vistoria-${v.type}-${v.scheduled_date}.pdf`)
  }

  const comodos = [...new Set(checklist.map(i => i.comodo))]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vistorias</h2>
            <p className="text-gray-500 mt-1">Agende e registre vistorias com checklist digital</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Nova vistoria
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-2xl">
            <h3 className="font-semibold text-gray-900 mb-4">Agendar vistoria</h3>
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
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Data da vistoria</label>
                <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Agendar vistoria'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {showChecklist && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Checklist da vistoria</h3>
            {comodos.map(comodo => (
              <div key={comodo} className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{comodo}</h4>
                <div className="space-y-3">
                  {checklist.filter(i => i.comodo === comodo).map(item => (
                    <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{item.item}</span>
                        <div className="flex gap-1">
                          {(['otimo', 'bom', 'regular', 'ruim'] as const).map(e => (
                            <button key={e}
                              onClick={() => updateItem(item.id, 'estado', e)}
                              className={`px-2 py-1 text-xs rounded border font-medium transition-colors ${
                                item.estado === e ? estadoCores[e] : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                              }`}>
                              {e === 'otimo' ? 'Ótimo' : e.charAt(0).toUpperCase() + e.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input type="text" value={item.observacao}
                        onChange={e => updateItem(item.id, 'observacao', e.target.value)}
                        placeholder="Observação (opcional)"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button onClick={() => salvarChecklist(showChecklist)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Salvar e concluir vistoria
              </button>
              <button onClick={() => setShowChecklist(null)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : vistorias.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-gray-500">Nenhuma vistoria agendada ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Nova vistoria" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vistorias.map(v => (
              <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {v.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.status === 'concluida' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {v.status === 'concluida' ? 'Concluída' : 'Agendada'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{v.properties?.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">{v.properties?.address}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {new Date(v.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {v.status !== 'concluida' && (
                    <button onClick={() => abrirChecklist(v)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                      Preencher checklist
                    </button>
                  )}
                  <button onClick={() => gerarPDF(v)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                    ⬇ PDF
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