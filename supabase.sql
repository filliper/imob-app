-- Supabase database schema for ImobApp
-- Generated from HANDOFF.md

-- Table: people
CREATE TABLE people (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name TEXT NOT NULL,
    cpf TEXT,
    rg TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP
);

-- Table: properties
CREATE TABLE properties (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name TEXT,
    address TEXT,
    type TEXT, -- 'residential' | 'commercial'
    rent_value NUMERIC,
    people_owner_id uuid REFERENCES people(id), -- coluna nova (migração)
    owner_id uuid REFERENCES owners(id), -- coluna legada (manter por ora)
    created_at TIMESTAMP
);

-- Table: contracts
CREATE TABLE contracts (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    property_id uuid REFERENCES properties(id),
    people_tenant_id uuid REFERENCES people(id), -- coluna nova (migração)
    tenant_id uuid REFERENCES tenants(id), -- coluna legada (manter por ora)
    type TEXT, -- ver tipos abaixo
    start_date DATE,
    end_date DATE,
    value NUMERIC,
    indice_reajuste TEXT, -- 'IPCA' | 'IGP-M' | 'INPC'
    multa_rescisao TEXT, -- '1' | '2' | '3'
    fiador_nome TEXT,
    fiador_cpf TEXT,
    fiador_rg TEXT,
    fiador_endereco TEXT,
    comissao_valor NUMERIC,
    comissao_percentual NUMERIC,
    banco_nome TEXT,
    banco_agencia TEXT,
    banco_conta TEXT,
    banco_titular TEXT,
    sinal_valor NUMERIC,
    parcelas_quantidade INTEGER,
    parcelas_valor NUMERIC,
    servico_descricao TEXT,
    servico_prazo_inicio INTEGER,
    multa_atraso_pgto NUMERIC,
    multa_descumprimento NUMERIC,
    prazo_rescisao_dias INTEGER,
    pdf_url TEXT,
    created_at TIMESTAMP
);

-- Table: payments
CREATE TABLE payments (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    contract_id uuid REFERENCES contracts(id),
    due_date DATE,
    paid_date DATE,
    amount NUMERIC,
    status TEXT, -- 'pendente' | 'pago' | 'atrasado'
    notes TEXT,
    created_at TIMESTAMP
);

-- Table: inspections
CREATE TABLE inspections (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    property_id uuid REFERENCES properties(id),
    type TEXT, -- 'entrada' | 'saida'
    scheduled_date DATE,
    status TEXT, -- 'agendada' | 'concluida'
    checklist JSONB, -- array de { id, comodo, item, estado, observacao }
    created_at TIMESTAMP
);

-- Table: leads
CREATE TABLE leads (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    agent_id uuid REFERENCES agents(id),
    name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT, -- 'manual' | 'ZAP Imóveis' | 'OLX' | 'Instagram' etc
    interest TEXT,
    status TEXT, -- 'novo' | 'atendendo' | 'proposta' | 'fechado' | 'perdido'
    priority TEXT, -- 'alta' | 'normal' | 'baixa'
    notes TEXT,
    last_contact TIMESTAMP,
    created_at TIMESTAMP
);

-- Table: lead_activities
CREATE TABLE lead_activities (
    id uuid PRIMARY KEY,
    lead_id uuid REFERENCES leads(id),
    user_id uuid REFERENCES auth.users(id),
    type TEXT, -- 'Ligação' | 'WhatsApp' | 'E-mail' | 'Visita' | 'Proposta' | 'Anotação' | 'Status'
    description TEXT,
    created_at TIMESTAMP
);

-- Table: agents
CREATE TABLE agents (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name TEXT,
    email TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP
);

-- Table: user_profiles
CREATE TABLE user_profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    cpf TEXT,
    rg TEXT,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP
);

-- Note: The legacy tables 'owners' and 'tenants' are not included as they are being replaced by 'people'.
-- However, they are referenced in the current schema (properties.owner_id, contracts.tenant_id) for backward compatibility.
-- If you need to create them, they would be similar to 'people' but without the user_id and with different constraints.
-- Since the migration is in progress, we keep the columns in properties and contracts but the tables themselves may not exist.
-- Adjust as needed based on your migration state.