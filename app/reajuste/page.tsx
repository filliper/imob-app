'use client'

import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'
import jsPDF from 'jspdf'

type Resultado = {
  indice: string
  valorAtual: number
  valorNovo: number
  variacao: number
  periodo: string
}

export default function ReajustePage() {
  const [valorAtual, setValorAtual] = useState('')
  const [dataBase, setDataBase] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')

  async function buscarIPCA(dataInicio: string) {
    const inicio = dataInicio.replace('-', '')
    const hoje = new Date()
    const fim = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/${dataInicio.split('-')[1]}/${dataInicio.split('-')[0]}&dataFinal=01/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
    const res = await fetch(url)
    const data = await res.json()
    return data as { data: string; valor: string }[]
  }

  async function buscarIGPM(dataInicio: string) {
    const hoje = new Date()
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=01/${dataInicio.split('-')[1]}/${dataInicio.split('-')[0]}&dataFinal=01/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
    const res = await fetch(url)
    const data = await res.json()
    return data as { data: string; valor: string }[]
  }

  async function calcular(indice: 'IPCA' | 'IGP-M') {
    if (!valorAtual || !dataBase) {
      setErro('Preencha o valor e a data base')
      return
    }
    setCalculando(true)
    setErro('')
    setResultado(null)

    try {
      const dados = indice === 'IPCA'
        ? await buscarIPCA(dataBase)
        : await buscarIGPM(dataBase)

      if (!dados || dados.length === 0) {
        setErro('Não foi possível buscar os dados. Tente uma data mais recente.')
        setCalculando(false)
        return
      }

      const variacao = dados.reduce((acc, item) => {
        return acc * (1 + parseFloat(item.valor) / 100)
      }, 1) - 1

      const valor = parseFloat(valorAtual)
      const valorNovo = valor * (1 + variacao)

      setResultado({
        indice,
        valorAtual: valor,
        valorNovo,
        variacao: variacao * 100,
        periodo: `${dados[0].data} a ${dados[dados.length - 1].data}`,
      })
    } catch (e) {
      setErro('Erro ao buscar dados do Banco Central. Tente novamente.')
    }
    setCalculando(false)
  }

  function gerarPDF() {
    if (!resultado) return
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('RELATÓRIO DE REAJUSTE DE ALUGUEL', pageWidth / 2, 30, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} pelo ImobApp`, pageWidth / 2, 40, { align: 'center' })

    doc.setDrawColor(200)
    doc.line(20, 46, 190, 46)
    doc.setTextColor(0)

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DO REAJUSTE', 20, 60)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Índice utilizado: ${resultado.indice}`, 20, 72)
    doc.text(`Período de referência: ${resultado.periodo}`, 20, 80)
    doc.text(`Variação acumulada: ${resultado.variacao.toFixed(4)}%`, 20, 88)

    doc.setDrawColor(220)
    doc.line(20, 96, 190, 96)

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('VALORES', 20, 108)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Valor atual do aluguel:', 20, 120)
    doc.setFont('helvetica', 'bold')
    doc.text(
      resultado.valorAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      190, 120, { align: 'right' }
    )

    doc.setFont('helvetica', 'normal')
    doc.text(`Reajuste pelo ${resultado.indice} (${resultado.variacao.toFixed(2)}%):`, 20, 132)
    doc.setFont('helvetica', 'bold')
    const diferenca = resultado.valorNovo - resultado.valorAtual
    doc.text(
      `+ ${diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      190, 132, { align: 'right' }
    )

    doc.setFillColor(235, 245, 235)
    doc.rect(18, 140, 174, 20, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Novo valor do aluguel:', 22, 153)
    doc.text(
      resultado.valorNovo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      188, 153, { align: 'right' }
    )

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text('Este relatório foi gerado com base nos dados oficiais do Banco Central do Brasil.', 20, 172)
    doc.text('Os valores de IPCA e IGP-M são divulgados pelo IBGE e FGV respectivamente.', 20, 180)

    doc.line(20, 240, 190, 240)
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text('Assinatura do Locador', 60, 250, { align: 'center' })
    doc.text('Assinatura do Locatário', 150, 250, { align: 'center' })

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Gerado por ImobApp · imobapp.com.br', pageWidth / 2, 285, { align: 'center' })

    doc.save(`reajuste-${resultado.indice.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Calculadora de Reajuste</h2>
          <p className="text-gray-500 mt-1">Calcula automaticamente com dados oficiais do Banco Central</p>
        </div>

        {/* Formulário */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Dados para cálculo</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Valor atual do aluguel (R$)</label>
              <input
                type="number"
                value={valorAtual}
                onChange={e => setValorAtual(e.target.value)}
                placeholder="Ex: 1500"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data base do contrato</label>
              <input
                type="month"
                value={dataBase}
                onChange={e => setDataBase(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{erro}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => calcular('IPCA')}
              disabled={calculando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {calculando ? 'Calculando...' : 'Calcular pelo IPCA'}
            </button>
            <button
              onClick={() => calcular('IGP-M')}
              disabled={calculando}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {calculando ? 'Calculando...' : 'Calcular pelo IGP-M'}
            </button>
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Resultado do reajuste</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {resultado.indice}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">Período: {resultado.periodo}</p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Valor atual</span>
                <span className="font-medium text-gray-900">
                  {resultado.valorAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Variação {resultado.indice}</span>
                <span className="font-medium text-blue-600">
                  +{resultado.variacao.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Acréscimo</span>
                <span className="font-medium text-orange-600">
                  + {(resultado.valorNovo - resultado.valorAtual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-4 bg-green-50 rounded-lg px-4">
                <span className="font-semibold text-gray-900">Novo valor do aluguel</span>
                <span className="text-xl font-bold text-green-600">
                  {resultado.valorNovo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <button
              onClick={gerarPDF}
              className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
            >
              ⬇ Baixar relatório em PDF
            </button>
          </div>
        )}
      </main>
    </div>
  )
}