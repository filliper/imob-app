### 7. Bugs Conhecidos / Pendências



#### 🐛 Bugs ativos



1. **Typo no nome do imóvel:** "Apto 101- Cantro" (digitado errado no cadastro de teste). Corrigir manualmente no Supabase ou via interface de edição.



2. **Migração incompleta de owners/tenants para people:** As tabelas `owners` e `tenants` ainda existem no banco. Os módulos `/proprietarios` e `/inquilinos` ainda funcionam mas não são mais exibidos no menu. A migração de dados foi feita via SQL mas as páginas de contratos e imóveis ainda podem usar as colunas legadas `owner_id` e `tenant_id` em algumas queries. **Verificar se todas as queries usam `people_owner_id` e `people_tenant_id`.**



3. **Editor de cláusulas — renumeração parcial:** Alguns títulos de cláusulas vindos das funções legadas têm formato misto (ex: "CLÁUSULA SÉTIMA — DO PRAZO", "ITEM 04 —"). O regex de limpeza em `renumerarClausulas()` pode não capturar todos os formatos. Verificar e ajustar o regex se necessário.



4. **PDF do editor de cláusulas vs PDF direto:** Existem dois caminhos para gerar PDF:

   - **Botão "Baixar PDF"** → abre editor → `generatePDFComClausulas()` (genérico)

   - As funções originais (`generatePDF`, `generateServicosPDF`, etc.) ainda existem mas não são chamadas pelo fluxo atual

   - O PDF via editor tem cabeçalho/partes mais simples que os PDFs originais

   - **Decisão pendente:** unificar os dois caminhos ou manter os dois



5. **Contrato de Compra e Venda:** modelo foi atualizado para "Compra e Venda de Bem Móvel" mas o sistema é imobiliário. Verificar se o modelo correto foi aplicado ou se precisa ajuste.



#### ⚠️ Melhorias pendentes



1. **Contadores do dashboard:** mostram dados corretos mas não atualizam em tempo real — precisaria de `realtime` do Supabase ou refresh manual.



2. **Pagamentos:** a marcação automática de "atrasado" roda no `useEffect` do cliente, não no servidor — se o usuário não abrir a página, cobranças antigas não são marcadas como atrasadas automaticamente.



3. **Upload de fotos nas vistorias:** o checklist aceita observações mas não fotos ainda (o campo existe no modelo mas não foi implementado na UI).



4. **Assinatura digital:** contratos têm linhas de assinatura manual mas não integração com plataforma de assinatura digital (DocuSign, D4Sign, etc.).



5. **Notificações:** alertas de lead sem atendimento e pagamentos em atraso existem na UI mas não há envio de e-mail ou push notification.



6. **Monetização:** sem implementação de planos/pagamento (Stripe/Pagar.me não integrado).



7. **Multi-tenant real:** todos os dados são isolados por `user_id`, mas não há conceito de "imobiliária" com múltiplos usuários sob o mesmo CNPJ.



---



### 8. Próximos Passos Sugeridos



#### Prioridade Alta



#### Prioridade Média



#### Prioridade Baixa