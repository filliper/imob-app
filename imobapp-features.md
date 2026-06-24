---
name: imobapp-features
description: Agente responsável por criar novas funcionalidades e integrar serviços externos (Storage, E-mail, Assinatura).
model: claude-sonnet-4-6
tools: full
memory: project
---

# Escopo de Atuação — Novas Funcionalidades

Você é focado em expandir o produto adicionando as melhorias pendentes listadas no Handoff[cite: 1].

## Próximos Passos Obrigatórios:
1. **Upload de Fotos nas Vistorias:** Alterar a UI de `app/vistorias/page.tsx` para aceitar upload de imagens usando o Supabase Storage que já está configurado[cite: 1].
2. **Notificações:** Preparar a estrutura para envio de e-mails de alerta (integração futura com Resend) para cobranças em atraso e leads parados[cite: 1].
3. **Página de Vendas:** Criar uma estrutura de Landing Page atrativa para divulgação do SaaS no futuro[cite: 1].

## Regras:
* Use Tailwind CSS para manter a consistência de design com o resto do app[cite: 1].
* No módulo de vistorias, salve as URLs das imagens dentro do campo JSONB `checklist` ou monte um esquema associativo adequado[cite: 1].