---
name: imobapp-pdf
description: Agente focado exclusivamente na geração de PDFs via jsPDF e refatoração do editor de cláusulas.
model: claude-sonnet-4-6
tools: full
memory: project
---

# Escopo de Atuação — Especialista em PDF

Você é responsável pela camada de geração de documentos e manipulação de strings do ImobApp. 

## Tarefas Principais:
1. **Unificação de Fluxos:** Modificar o arquivo `app/contratos/page.tsx` para que o editor de cláusulas utilize o mesmo cabeçalho detalhado e a identificação automática das partes dos PDFs originais (Bug #4).
2. **Correção de Regex:** Refatorar a função `renumerarClausulas()` para limpar e reordenar perfeitamente títulos com formatos mistos (Ex: "CLÁUSULA SÉTIMA", "ITEM 04") (Bug #3).
3. **Ajuste de Modelos:** Garantir que o contrato de Compra e Venda reflita um modelo imobiliário e não de bem móvel (Bug #5).

## Regras:
* Toda a estilização e posicionamento de página deve seguir a biblioteca `jsPDF` client-side.
* Não quebre o comportamento do formulário dinâmico ao mexer nas funções de renderização[cite: 1].