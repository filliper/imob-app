### Prioridade Média
- [x] Upload de fotos nas vistorias (Supabase Storage já configurado)
- [ ] Landing page para divulgação do produto
- [ ] Planos e cobrança (Stripe ou Pagar.me)
- [x] Notificações por e-mail para pagamentos em atraso (Resend integrado) - Implementado com envio para e-mail do usuário e agendamento via Vercel Cron (diariamente às 3h UTC)
- [x] Notificações por e-mail para leads sem atendimento - Implementado com envio para e-mail do usuário (corretor responsável ou agente) e agendamento via Vercel Cron (a cada 30 minutos)
- [ ] Assinatura digital (integração D4Sign ou ClickSign)


### 7. Bugs Conhecidos / Pendências



#### 🐛 Bugs ativos



1. **Typo no nome do imóvel:** "Apto 101- Cantro" (digitado errado no cadastro de teste). **Corrigido manualmente no Supabase.*



2. **Migração incompleta de owners/tenants para people:** As tabelas `owners` e `tenants` ainda existem no banco. Os módulos `/proprietarios` e `/inquilinos` ainda funcionam mas não são mais exibidos no menu. A migração de dados foi feita via SQL mas as páginas de contratos e imóveis ainda podem usar as colunas legadas `owner_id` e `tenant_id` em algumas queries. **Verificado e corrigido: todas as queries agora usam `people_owner_id` e `people_tenant_id*.*



3. **Editor de cláusulas — renumeração parcial:** Alguns títulos de cláusulas vindos das funções legadas têm formato misto (ex: "CLÁUSULA SÉTIMA — DO PRAZO", "ITEM 04 — "). O regex de limpeza em `renumerarClausulas()` foi ajustado para capturar todos os formatos, incluindo aqueles com acentos e variações de dash. **Corrigido.*



4. **PDF do editor de cláusulas vs PDF direto:** Existem dois caminhos para gerar PDF:

   - **Botão "Baixar PDF"** → abre editor → `generatePDFComClausulas()` (genérico)

   - As funções originais (`generatePDF`, `generateServicosPDF`, etc.) ainda existem mas não são chamadas pelo fluxo atual

   - O PDF via editor tem cabeçalho/partes mais simples que os PDFs originais

   - **Decisão tomada: unificar os dois caminhos fazendo com que o editor use as funções específicas de tipo (como generatePDF, generateServicosPDF, etc.) passando a lista editada de cláusulas. Isso será implementado em uma futura atualização.*



5. **Contrato de Compra e Venda:** modelo foi atualizado para "Compra e Venda de Bem Móvel" mas o sistema é imobiliário. **Verificado e corrigido: o modelo agora usa o contrato padrão de Compra e Venda de Imóvel.** (Concluído)



#### ⚠️ Melhorias pendentes



1. **Contadores do dashboard:** mostram dados corretos mas não atualizam em tempo real — precisaria de `realtime` do Supabase ou refresh manual.



2. **Pagamentos:** a marcação automática de "atrasado" roda no `useEffect` do cliente, não no servidor — se o usuário não abrir a página, cobranças antigas não são marcadas como atrasadas automaticamente.



3. **Upload de fotos nas vistorias:** o checklist aceita observações mas não fotos ainda (o campo existe no modelo mas não foi implementado na UI).



4. **Assinatura digital:** contratos têm linhas de assinatura manual mas não integração com plataforma de assinatura digital (DocuSign, D4Sign, etc.).



5. **Notificações:** alertas de lead sem atendimento e pagamentos em atraso possuem envio de e-mail via Resend e agendamento via Vercel Cron (diariamente para pagamentos, a cada 30 minutos para leads).



6. **Monetização:** sem implementação de planos/pagamento (Stripe/Pagar.me não integrado).



7. **Multi-tenant real:** todos os dados são isolados por `user_id`, mas não há conceito de "imobiliária" com múltiplos usuários sob o mesmo CNPJ.



---



### 8. Próximos Passos Sugeridos



#### Prioridade Alta



#### Prioridade Média



#### Prioridade Baixa