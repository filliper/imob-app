# ImobApp — Documento de Handoff
> Gerado em: 19/06/2026  
> URL de produção: https://imob-app-navy.vercel.app  
> Repositório: https://github.com/filliper/imob-app  
> Stack: Next.js 16.2.7 · Supabase · Tailwind CSS · Vercel

---

## 1. Visão Geral do Projeto

ImobApp é uma plataforma SaaS de gestão imobiliária para corretores e imobiliárias brasileiras. O sistema é operado por um intermediador (o usuário logado) que gerencia imóveis de múltiplos proprietários, inquilinos, leads e contratos.

### Papel dos usuários
- **Usuário logado** = corretor/intermediador (dados em `user_profiles`)
- **Proprietários** = donos dos imóveis (tabela `people`, vinculados via `properties.people_owner_id`)
- **Inquilinos/Compradores/Prestadores** = tabela `people`, vinculados via `contracts.people_tenant_id`
- **Leads** = tabela `leads`, com funil no CRM

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16.2.7 (App Router, Turbopack) |
| Estilo | Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Vercel (domínio: imob-app-navy.vercel.app) |
| PDF | jsPDF (geração client-side) |
| Índices econômicos | API pública do Banco Central (SGS) |

### Variáveis de ambiente necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=https://[projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 3. Estrutura de Pastas

```
imob-app/
├── app/
│   ├── components/
│   │   └── Sidebar.tsx          # Menu lateral compartilhado (todos os módulos)
│   ├── contratos/
│   │   └── page.tsx             # Gerador de contratos + editor de cláusulas + PDF
│   ├── crm/
│   │   └── page.tsx             # CRM com kanban de leads
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard com dados reais do banco
│   ├── imoveis/
│   │   └── page.tsx             # CRUD de imóveis
│   ├── inquilinos/              # PÁGINA LEGADA — substituída por /pessoas
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx             # Autenticação Supabase
│   ├── pagamentos/
│   │   ├── layout.tsx           # force-dynamic para evitar cache na Vercel
│   │   └── page.tsx             # Monitor de pagamentos e cobranças
│   ├── perfil/
│   │   └── page.tsx             # Dados do corretor (usados nos contratos)
│   ├── pessoas/
│   │   └── page.tsx             # Cadastro único de pessoas (proprietários + inquilinos + prestadores)
│   ├── proprietarios/           # PÁGINA LEGADA — substituída por /pessoas
│   │   └── page.tsx
│   ├── reajuste/
│   │   └── page.tsx             # Calculadora IPCA/IGP-M via API BACEN
│   ├── vistorias/
│   │   └── page.tsx             # Agendador de vistorias com checklist digital
│   ├── layout.tsx               # Layout global
│   └── page.tsx                 # Home com botão → /login
├── lib/
│   └── supabase.ts              # createBrowserClient do @supabase/ssr
├── next.config.js               # module.exports = { turbopack: { root: __dirname } }
├── .env.local                   # Variáveis de ambiente (NÃO vai para o Git)
└── package.json
```

---

## 4. Banco de Dados (Supabase)

### Tabelas principais

#### `people` ← TABELA CENTRAL (migração recente)
```sql
id uuid primary key
user_id uuid references auth.users(id)
name text not null
cpf text
rg text
email text
phone text
address text
notes text
created_at timestamp
```
**Papel da pessoa é definido pelo contexto:**
- Vinculada como `properties.people_owner_id` → é proprietário
- Vinculada como `contracts.people_tenant_id` → é inquilino/comprador/prestador

#### `properties` (imóveis)
```sql
id uuid primary key
user_id uuid references auth.users(id)
name text
address text
type text  -- 'residential' | 'commercial'
rent_value numeric
people_owner_id uuid references people(id)  -- ← coluna nova (migração)
owner_id uuid references owners(id)          -- ← coluna legada (manter por ora)
created_at timestamp
```

#### `contracts` (contratos)
```sql
id uuid primary key
user_id uuid references auth.users(id)
property_id uuid references properties(id)
people_tenant_id uuid references people(id)  -- ← coluna nova (migração)
tenant_id uuid references tenants(id)         -- ← coluna legada (manter por ora)
type text  -- ver tipos abaixo
start_date date
end_date date
value numeric
indice_reajuste text  -- 'IPCA' | 'IGP-M' | 'INPC'
multa_rescisao text   -- '1' | '2' | '3'
fiador_nome text
fiador_cpf text
fiador_rg text
fiador_endereco text
comissao_valor numeric
comissao_percentual numeric
banco_nome text
banco_agencia text
banco_conta text
banco_titular text
sinal_valor numeric
parcelas_quantidade integer
parcelas_valor numeric
servico_descricao text
servico_prazo_inicio integer
multa_atraso_pgto numeric
multa_descumprimento numeric
prazo_rescisao_dias integer
pdf_url text
created_at timestamp
```

**Tipos de contrato (`type`):**
- `rental` → Locação Residencial
- `commercial` → Locação Comercial
- `intermediacao` → Intermediação Imobiliária
- `promessa_compra_venda` → Promessa de Compra e Venda
- `administracao` → Administração de Imóveis
- `exclusividade` → Exclusividade
- `compra_venda` → Compra e Venda à Vista
- `servicos` → Prestação de Serviços

#### `payments` (pagamentos)
```sql
id uuid primary key
user_id uuid references auth.users(id)
contract_id uuid references contracts(id)
due_date date
paid_date date
amount numeric
status text  -- 'pendente' | 'pago' | 'atrasado'
notes text
created_at timestamp
```

#### `inspections` (vistorias)
```sql
id uuid primary key
user_id uuid references auth.users(id)
property_id uuid references properties(id)
type text  -- 'entrada' | 'saida'
scheduled_date date
status text  -- 'agendada' | 'concluida'
checklist jsonb  -- array de { id, comodo, item, estado, observacao }
created_at timestamp
```

#### `leads` (CRM)
```sql
id uuid primary key
user_id uuid references auth.users(id)
agent_id uuid references agents(id)
name text
email text
phone text
source text  -- 'manual' | 'ZAP Imóveis' | 'OLX' | 'Instagram' etc
interest text
status text  -- 'novo' | 'atendendo' | 'proposta' | 'fechado' | 'perdido'
priority text  -- 'alta' | 'normal' | 'baixa'
notes text
last_contact timestamp
created_at timestamp
```

#### `lead_activities` (histórico CRM)
```sql
id uuid primary key
lead_id uuid references leads(id)
user_id uuid references auth.users(id)
type text  -- 'Ligação' | 'WhatsApp' | 'E-mail' | 'Visita' | 'Proposta' | 'Anotação' | 'Status'
description text
created_at timestamp
```

#### `agents` (corretores da equipe)
```sql
id uuid primary key
user_id uuid references auth.users(id)
name text
email text
phone text
active boolean default true
created_at timestamp
```

#### `user_profiles` (perfil do corretor logado)
```sql
id uuid references auth.users(id) primary key
full_name text
cpf text
rg text
address text
phone text
created_at timestamp
```

#### Tabelas legadas (manter até migração completa)
- `owners` — substituída por `people`
- `tenants` — substituída por `people`

### RLS (Row Level Security)
Todas as tabelas têm RLS habilitado com policy: `auth.uid() = user_id`

---

## 5. Módulos Implementados

### ✅ Autenticação (`/login`)
- Login e cadastro via Supabase Auth (email/senha)
- Redirecionamento para `/dashboard` após login
- `createBrowserClient` do `@supabase/ssr`

### ✅ Dashboard (`/dashboard`)
- Dados reais: imóveis, proprietários, inquilinos, contratos, leads, vistorias
- Cards financeiros: recebido no mês, a receber, em atraso
- Alerta visual para pagamentos em atraso
- Cards clicáveis com link para cada módulo

### ✅ CRM (`/crm`)
- Visualização Kanban e Lista
- 5 colunas: Novos → Em atendimento → Proposta → Fechado → Perdido
- Cadastro de leads com origem, prioridade, interesse
- Distribuição automática de leads para corretores (balanceamento por quantidade)
- Histórico de contatos por lead (Ligação, WhatsApp, E-mail, Visita, Proposta, Anotação)
- Alerta de leads sem atendimento há mais de 2 horas
- Cadastro de corretores da equipe

### ✅ Contratos (`/contratos`)
**8 tipos de contrato com PDF gerado pelo jsPDF:**
1. `rental` → `generatePDF()` — usa modelo da Lei 8.245/91
2. `commercial` → `generateLocacaoComercialPDF()`
3. `intermediacao` → `generateIntermediacaoPDF()`
4. `promessa_compra_venda` → `generatePromessaPDF()`
5. `administracao` → `generateAdministracaoPDF()`
6. `exclusividade` → `generateExclusividadePDF()`
7. `compra_venda` → `generateCompraVendaPDF()`
8. `servicos` → `generateServicosPDF()`

**Editor de cláusulas (antes do PDF):**
- Clique em "Baixar PDF" abre o editor
- Cláusulas editáveis (título + texto)
- Renumeração automática ao adicionar/remover
- Botões ▲▼ para reordenar
- Botão "+" para adicionar cláusulas extras
- `generatePDFComClausulas()` usa lista editada
- `montarClausulasPadrao()` gera cláusulas completas por tipo

**Formulário dinâmico:** campos aparecem/somem conforme o tipo selecionado

**Identificação automática das partes no PDF:**
- `rental` / `commercial`: Proprietário (owner) × Inquilino (tenant)
- `intermediacao` / `administracao` / `exclusividade`: Proprietário × Você (perfil)
- `servicos`: Você (perfil) × Prestador (tenant)
- `compra_venda` / `promessa_compra_venda`: Proprietário × Comprador (tenant)

### ✅ Pagamentos (`/pagamentos`)
- Registro de cobranças vinculadas a contratos
- Status: pendente → pago | atrasado (automático por data)
- Botão "Gerar cobrança do mês" preenche data = dia 10 do mês atual
- Filtros: Todos / Pendente / Atrasado / Pago
- Cards de resumo financeiro
- Alerta vermelho para cobranças em atraso
- `layout.tsx` com `export const dynamic = 'force-dynamic'` (evita cache na Vercel)

### ✅ Imóveis (`/imoveis`)
- CRUD completo
- Vinculação com proprietário via `people_owner_id`
- Tipos: Residencial / Comercial

### ✅ Pessoas (`/pessoas`) ← MÓDULO NOVO
- Cadastro único substituindo `/proprietarios` e `/inquilinos`
- Busca por nome, CPF ou telefone
- Filtros: Todos / Proprietários / Inquilinos / Sem papel
- Exibe papéis automaticamente com base em vínculos
- Uma pessoa pode ser proprietário E inquilino ao mesmo tempo

### ✅ Reajuste (`/reajuste`)
- Busca IPCA (série 433) e IGP-M (série 189) na API do BACEN
- URL: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados?formato=json&dataInicial=...`
- Cálculo do acumulado pelo produto das variações mensais
- Gera relatório PDF com período, variação e novo valor

### ✅ Vistorias (`/vistorias`)
- Agendamento com tipo (entrada/saída) e data
- Checklist digital por cômodo (Sala, Cozinha, Banheiro, Quarto, Área)
- Estados: Ótimo / Bom / Regular / Ruim
- Observações por item
- Relatório PDF com checklist completo
- Status: agendada → concluída

### ✅ Perfil (`/perfil`)
- Dados do corretor: nome, CPF, RG, endereço, telefone
- Usado automaticamente nos contratos como CONTRATADA/LOCADOR

---

## 6. Componente Sidebar

`app/components/Sidebar.tsx` — menu compartilhado por todas as páginas.

Links atuais:
```tsx
{ href: '/dashboard',     icon: '🏠', label: 'Dashboard' },
{ href: '/crm',           icon: '🎯', label: 'CRM / Leads' },
{ href: '/contratos',     icon: '📄', label: 'Contratos' },
{ href: '/pagamentos',    icon: '💰', label: 'Pagamentos' },
{ href: '/imoveis',       icon: '🏢', label: 'Imóveis' },
{ href: '/pessoas',       icon: '👥', label: 'Pessoas' },
{ href: '/reajuste',      icon: '📊', label: 'Reajuste' },
{ href: '/vistorias',     icon: '🗓️', label: 'Vistorias' },
{ href: '/perfil',        icon: '⚙️', label: 'Meu perfil' },
```

Destaque automático da página ativa via `usePathname()`.

---

## 7. Bugs Conhecidos / Pendências

### 🐛 Bugs ativos

1. **Typo no nome do imóvel:** "Apto 101- Cantro" (digitado errado no cadastro de teste). Corrigir manualmente no Supabase ou via interface de edição.

2. **Migração incompleta de owners/tenants para people:** As tabelas `owners` e `tenants` ainda existem no banco. Os módulos `/proprietarios` e `/inquilinos` ainda funcionam mas não são mais exibidos no menu. A migração de dados foi feita via SQL mas as páginas de contratos e imóveis ainda podem usar as colunas legadas `owner_id` e `tenant_id` em algumas queries. **Verificar se todas as queries usam `people_owner_id` e `people_tenant_id`.**

3. **Editor de cláusulas — renumeração parcial:** Alguns títulos de cláusulas vindos das funções legadas têm formato misto (ex: "CLÁUSULA SÉTIMA — DO PRAZO", "ITEM 04 —"). O regex de limpeza em `renumerarClausulas()` pode não capturar todos os formatos. Verificar e ajustar o regex se necessário.

4. **PDF do editor de cláusulas vs PDF direto:** Existem dois caminhos para gerar PDF:
   - **Botão "Baixar PDF"** → abre editor → `generatePDFComClausulas()` (genérico)
   - As funções originais (`generatePDF`, `generateServicosPDF`, etc.) ainda existem mas não são chamadas pelo fluxo atual
   - O PDF via editor tem cabeçalho/partes mais simples que os PDFs originais
   - **Decisão pendente:** unificar os dois caminhos ou manter os dois

5. **Contrato de Compra e Venda:** modelo foi atualizado para "Compra e Venda de Bem Móvel" mas o sistema é imobiliário. Verificar se o modelo correto foi aplicado ou se precisa ajuste.

### ⚠️ Melhorias pendentes

1. **Contadores do dashboard** mostram dados corretos mas não atualizam em tempo real — precisaria de `realtime` do Supabase ou refresh manual.

2. **Pagamentos:** a marcação automática de "atrasado" roda no `useEffect` do cliente, não no servidor — se o usuário não abrir a página, cobranças antigas não são marcadas como atrasadas automaticamente.

3. **Upload de fotos nas vistorias:** o checklist aceita observações mas não fotos ainda (o campo existe no modelo mas não foi implementado na UI).

4. **Assinatura digital:** contratos têm linhas de assinatura manual mas não integração com plataforma de assinatura digital (DocuSign, D4Sign, etc.).

5. **Notificações:** alertas de lead sem atendimento e pagamentos em atraso existem na UI mas não há envio de e-mail ou push notification.

6. **Monetização:** sem implementação de planos/pagamento (Stripe/Pagar.me não integrado).

7. **Multi-tenant real:** todos os dados são isolados por `user_id`, mas não há conceito de "imobiliária" com múltiplos usuários sob o mesmo CNPJ.

---

## 8. Próximos Passos Sugeridos

### Prioridade Alta
- [ ] Finalizar migração: garantir que `/contratos` e `/imoveis` usam exclusivamente `people_owner_id` e `people_tenant_id`
- [ ] Remover referências a `owners` e `tenants` das queries de contratos
- [ ] Unificar o gerador de PDF (editor de cláusulas deve usar o mesmo cabeçalho detalhado dos PDFs originais)
- [ ] Corrigir regex de renumeração de cláusulas para todos os formatos

### Prioridade Média
- [ ] Upload de fotos nas vistorias (Supabase Storage já configurado)
- [ ] Landing page para divulgação do produto
- [ ] Planos e cobrança (Stripe ou Pagar.me)
- [ ] Notificações por e-mail (Resend já sugerido na stack)
- [ ] Assinatura digital (integração D4Sign ou ClickSign)

### Prioridade Baixa
- [ ] Dark mode
- [ ] Exportação de relatórios em Excel
- [ ] Dashboard com gráficos de receita mensal
- [ ] App mobile (React Native ou PWA)

---

## 9. Comandos Úteis

```bash
# Rodar localmente
npm run dev

# Build de produção
npm run build

# Deploy (automático via push)
git add .
git commit -m "feat: descrição"
git push

# Verificar erros de TypeScript
npx tsc --noEmit
```

---

## 10. Arquivos Críticos

| Arquivo | O que contém |
|---|---|
| `app/contratos/page.tsx` | Maior arquivo do projeto. Tipos, estados, 8 funções de PDF, editor de cláusulas, formulário dinâmico |
| `app/components/Sidebar.tsx` | Menu compartilhado — alterar aqui muda em todas as páginas |
| `lib/supabase.ts` | Conexão com Supabase — não alterar sem necessidade |
| `app/pagamentos/layout.tsx` | `force-dynamic` — necessário para evitar cache na Vercel |
| `.env.local` | Credenciais do Supabase — NUNCA commitar |

---

## 11. Decisões de Arquitetura Tomadas

1. **Geração de PDF client-side (jsPDF):** evita necessidade de servidor para gerar PDFs, mas limita formatação avançada.

2. **Sem `pages/` router:** usa exclusivamente App Router do Next.js 14+.

3. **Supabase como BaaS completo:** Auth + PostgreSQL + Storage + RLS — sem backend próprio.

4. **Campos dinâmicos no formulário de contratos:** um único formulário com blocos condicionais por tipo, ao invés de páginas separadas por tipo de contrato.

5. **Editor de cláusulas como camada intermediária:** ao invés de gerar PDF direto, abre um modal com as cláusulas editáveis primeiro.

6. **Tabela `people` unificada:** uma pessoa pode ter múltiplos papéis (proprietário, inquilino, prestador) definidos pelo contexto do vínculo, não por campos booleanos.

---

## 12. Credenciais e Acessos

- **Vercel:** https://vercel.com/fillipers-projects/imob-app
- **Supabase:** https://supabase.com (projeto: imob-app)
- **GitHub:** https://github.com/filliper/imob-app
- **URL produção:** https://imob-app-navy.vercel.app
- **Usuário de teste:** filliper@gmail.com

---

*Documento gerado automaticamente pelo Claude para continuidade do desenvolvimento. Atualizar após cada sessão significativa de desenvolvimento.*
