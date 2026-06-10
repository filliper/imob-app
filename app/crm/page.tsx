'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

type Agent = { id: string; name: string; email: string; phone: string; active: boolean }

type Lead = {
  id: string
  name: string
  email: string
  phone: string
  source: string
  interest: string
  status: string
  priority: string
  notes: string
  last_contact: string
  created_at: string
  agent_id: string
  agents?: Agent
}

type Activity = {
  id: string
  lead_id: string
  type: string
  description: string
  created_at: string
}

const COLUNAS = [
  { id: 'novo',      label: 'Novos leads',      color: 'bg-blue-500',   light: 'bg-blue-50 border-blue-200' },
  { id: 'atendendo', label: 'Em atendimento',   color: 'bg-yellow-500', light: 'bg-yellow-50 border-yellow-200' },
  { id: 'proposta',  label: 'Proposta enviada', color: 'bg-purple-500', light: 'bg-purple-50 border-purple-200' },
  { id: 'fechado',   label: 'Fechado',          color: 'bg-green-500',  light: 'bg-green-50 border-green-200' },
  { id: 'perdido',   label: 'Perdido',          color: 'bg-red-400',    light: 'bg-red-50 border-red-200' },
]

const SOURCES = ['manual', 'ZAP Imóveis', 'OLX', 'Instagram', 'Site próprio', 'Indicação', 'WhatsApp']
const ACTIVITY_TYPES = ['Ligação', 'WhatsApp', 'E-mail', 'Visita', 'Proposta', 'Anotação']

const priorityStyle: Record<string, string> = {
  alta:   'bg-red-100 text-red-700',
  normal: 'bg-gray-100 text-gray-600',
  baixa:  'bg-blue-100 text-blue-700',
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'lista'>('kanban')

  // Modais
  const [showNewLead, setShowNewLead] = useState(false)
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Forms
  const [leadForm, setLeadForm] = useState({
    name: '', email: '', phone: '', source: 'manual',
    interest: '', priority: 'normal', agent_id: '', notes: ''
  })
  const [agentForm, setAgentForm] = useState({ name: '', email: '', phone: '' })
  const [activityForm, setActivityForm] = useState({ type: 'Ligação', description: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from('leads').select('*, agents(*)').order('created_at', { ascending: false }),
      supabase.from('agents').select('*').eq('active', true),
    ])
    setLeads(l ?? [])
    setAgents(a ?? [])
    setLoading(false)
  }

  async function loadActivities(leadId: string) {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    setActivities(data ?? [])
  }

  async function saveLead() {
    if (!leadForm.name || !leadForm.phone) { alert('Nome e telefone são obrigatórios'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Distribuição automática se não selecionou corretor
    let agentId = leadForm.agent_id || null
    if (!agentId && agents.length > 0) {
      const leadCount = await Promise.all(
        agents.map(a => supabase.from('leads').select('id', { count: 'exact' }).eq('agent_id', a.id))
      )
      const counts = leadCount.map((r, i) => ({ id: agents[i].id, count: r.count ?? 0 }))
      agentId = counts.sort((a, b) => a.count - b.count)[0].id
    }

    const { error } = await supabase.from('leads').insert({
      user_id: user!.id,
      ...leadForm,
      agent_id: agentId,
      status: 'novo',
    })

    if (!error) {
      setLeadForm({ name: '', email: '', phone: '', source: 'manual', interest: '', priority: 'normal', agent_id: '', notes: '' })
      setShowNewLead(false)
      loadAll()
    }
    setSaving(false)
  }

  async function saveAgent() {
    if (!agentForm.name) { alert('Nome é obrigatório'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('agents').insert({ user_id: user!.id, ...agentForm })
    setAgentForm({ name: '', email: '', phone: '' })
    setShowNewAgent(false)
    loadAll()
    setSaving(false)
  }

  async function moveStatus(lead: Lead, newStatus: string) {
    await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      user_id: user!.id,
      type: 'Status',
      description: `Status alterado para "${COLUNAS.find(c => c.id === newStatus)?.label}"`,
    })
    loadAll()
    if (selectedLead?.id === lead.id) loadActivities(lead.id)
  }

  async function addActivity() {
    if (!activityForm.description || !selectedLead) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('lead_activities').insert({
      lead_id: selectedLead.id,
      user_id: user!.id,
      type: activityForm.type,
      description: activityForm.description,
    })
    await supabase.from('leads').update({ last_contact: new Date().toISOString() }).eq('id', selectedLead.id)
    setActivityForm({ type: 'Ligação', description: '' })
    loadActivities(selectedLead.id)
    loadAll()
    setSaving(false)
  }

  async function assignAgent(leadId: string, agentId: string) {
    await supabase.from('leads').update({ agent_id: agentId || null }).eq('id', leadId)
    loadAll()
  }

  function openLead(lead: Lead) {
    setSelectedLead(lead)
    loadActivities(lead.id)
  }

  const leadsAlerta = leads.filter(l => {
    if (!l.last_contact && l.status === 'novo') {
      const hours = (Date.now() - new Date(l.created_at).getTime()) / 1000 / 3600
      return hours > 2
    }
    return false
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">CRM — Gestão de Leads</h2>
            <p className="text-sm text-gray-500">{leads.length} leads · {agents.length} corretores</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setView('kanban')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                Kanban
              </button>
              <button onClick={() => setView('lista')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'lista' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                Lista
              </button>
            </div>
            <button onClick={() => setShowNewAgent(true)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              + Corretor
            </button>
            <button onClick={() => setShowNewLead(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + Novo lead
            </button>
          </div>
        </div>

        {/* Alerta de leads sem atendimento */}
        {leadsAlerta.length > 0 && (
          <div className="mx-8 mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-700 font-medium">
              {leadsAlerta.length} lead(s) sem atendimento há mais de 2 horas:
              {' '}{leadsAlerta.map(l => l.name).join(', ')}
            </p>
          </div>
        )}

        {/* Modal novo lead */}
        {showNewLead && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-4">Novo lead</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Nome completo *</label>
                  <input type="text" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Telefone / WhatsApp *</label>
                  <input type="text" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">E-mail</label>
                  <input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Origem</label>
                  <select value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Prioridade</label>
                  <select value={leadForm.priority} onChange={e => setLeadForm({ ...leadForm, priority: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="alta">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Interesse (imóvel desejado)</label>
                  <input type="text" value={leadForm.interest} onChange={e => setLeadForm({ ...leadForm, interest: e.target.value })}
                    placeholder="Ex: Apartamento 2 quartos, Campinas, até R$ 400k"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {agents.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600">Atribuir corretor (opcional — distribui automaticamente se vazio)</label>
                    <select value={leadForm.agent_id} onChange={e => setLeadForm({ ...leadForm, agent_id: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Distribuição automática</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Observações</label>
                  <textarea value={leadForm.notes} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}
                    rows={2} placeholder="Informações adicionais..."
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={saveLead} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar lead'}
                </button>
                <button onClick={() => setShowNewLead(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal novo corretor */}
        {showNewAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-4">Novo corretor</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Nome *</label>
                  <input type="text" value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">E-mail</label>
                  <input type="email" value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Telefone</label>
                  <input type="text" value={agentForm.phone} onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={saveAgent} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar corretor'}
                </button>
                <button onClick={() => setShowNewAgent(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detalhe do lead */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-end justify-end z-50">
            <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedLead.name}</h3>
                  <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Origem</span><p className="font-medium text-gray-900">{selectedLead.source}</p></div>
                  <div><span className="text-gray-400">Prioridade</span>
                    <p><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle[selectedLead.priority]}`}>{selectedLead.priority}</span></p>
                  </div>
                  {selectedLead.email && <div className="col-span-2"><span className="text-gray-400">E-mail</span><p className="font-medium text-gray-900">{selectedLead.email}</p></div>}
                  {selectedLead.interest && <div className="col-span-2"><span className="text-gray-400">Interesse</span><p className="font-medium text-gray-900">{selectedLead.interest}</p></div>}
                  {selectedLead.notes && <div className="col-span-2"><span className="text-gray-400">Observações</span><p className="text-gray-700">{selectedLead.notes}</p></div>}
                </div>

                {/* Mover status */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Mover para</p>
                  <div className="flex flex-wrap gap-2">
                    {COLUNAS.filter(c => c.id !== selectedLead.status).map(c => (
                      <button key={c.id} onClick={() => moveStatus(selectedLead, c.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                        → {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Atribuir corretor */}
                {agents.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Corretor responsável</p>
                    <select value={selectedLead.agent_id ?? ''} onChange={e => assignAgent(selectedLead.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Sem corretor</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Registrar atividade */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Registrar contato</p>
                  <div className="flex gap-2 mb-2">
                    {ACTIVITY_TYPES.map(t => (
                      <button key={t} onClick={() => setActivityForm({ ...activityForm, type: t })}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${activityForm.type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea value={activityForm.description} onChange={e => setActivityForm({ ...activityForm, description: e.target.value })}
                    rows={2} placeholder="Descreva o contato realizado..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={addActivity} disabled={saving || !activityForm.description}
                    className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    Registrar
                  </button>
                </div>

                {/* Histórico */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Histórico</p>
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum contato registrado ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.map(a => (
                        <div key={a.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.type}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{a.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-gray-400 text-sm">Carregando...</p>
          ) : view === 'kanban' ? (
            <div className="flex gap-4 h-full">
              {COLUNAS.map(col => {
                const colLeads = leads.filter(l => l.status === col.id)
                return (
                  <div key={col.id} className="flex-shrink-0 w-64">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${col.color}`} />
                      <span className="text-sm font-medium text-gray-700">{col.label}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full ml-auto">{colLeads.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colLeads.map(lead => (
                        <div key={lead.id}
                          onClick={() => openLead(lead)}
                          className={`border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow ${col.light}`}>
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{lead.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ml-1 flex-shrink-0 ${priorityStyle[lead.priority]}`}>
                              {lead.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{lead.phone}</p>
                          {lead.interest && <p className="text-xs text-gray-400 truncate">{lead.interest}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">{lead.source}</span>
                            {lead.agents && (
                              <span className="text-xs bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                {lead.agents.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {colLeads.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-400">Nenhum lead</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Lead</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contato</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Origem</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Corretor</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map(lead => (
                    <tr key={lead.id} onClick={() => openLead(lead)}
                      className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        {lead.interest && <p className="text-xs text-gray-400 truncate max-w-xs">{lead.interest}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                      <td className="px-4 py-3 text-gray-500">{lead.source}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          COLUNAS.find(c => c.id === lead.status)?.light ?? ''
                        }`}>
                          {COLUNAS.find(c => c.id === lead.status)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{lead.agents?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500">Nenhum lead cadastrado ainda.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}