-- =============================================================================
-- CRM SaaS — Database Initialization Script
-- Multi-tenant architecture: every table is scoped to a workspace.
-- Run order: extensions → enums → tables → functions/triggers → indexes
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Enables uuid_generate_v4()


-- =============================================================================
-- 2. ENUMS
-- Restricts column values to a controlled set, preventing bad data at the DB level.
-- =============================================================================

DO $$
BEGIN
    -- Lead lifecycle stage
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('New', 'In Progress', 'Qualified', 'Lost', 'Converted');
    END IF;

    -- Where the lead came from
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
        CREATE TYPE lead_source AS ENUM ('Instagram', 'WhatsApp', 'Website', 'Referral', 'Other');
    END IF;

    -- Workspace subscription tier
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('Bronze', 'Silver', 'Gold');
    END IF;

    -- User permission level inside a workspace
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('Owner', 'Manager', 'Employee');
    END IF;

    -- Invitation lifecycle
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_status') THEN
        CREATE TYPE inv_status AS ENUM ('Pending', 'Accepted', 'Expired');
    END IF;

    -- How the user contacted the lead
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_method') THEN
        CREATE TYPE contact_method AS ENUM ('WhatsApp', 'Email', 'Phone', 'In-Person', 'Other');
    END IF;

    -- Contract lifecycle
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE contract_status AS ENUM ('Active', 'Completed', 'Cancelled');
    END IF;
END $$;


-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- Workspace: represents one company/account (the top-level tenant).
-- Every other record belongs to a workspace.
CREATE TABLE IF NOT EXISTS workspaces (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    plan        plan_type NOT NULL DEFAULT 'Bronze',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User: a person with access to a workspace.
-- The first user created for a workspace is the Owner.
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'Owner',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead: a potential customer being tracked by the workspace.
-- assigned_to points to the user responsible for this lead.
CREATE TABLE IF NOT EXISTS leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(100),
    status              lead_status NOT NULL DEFAULT 'New',
    source              lead_source NOT NULL DEFAULT 'Other',
    next_contact_date   TIMESTAMP WITH TIME ZONE,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  -- kept fresh by trg_leads_updated_at
);

-- Invitation: a token-based invite sent to bring a new user into a workspace.
-- Only one pending invite per email per workspace is allowed (see partial unique index below).
CREATE TABLE IF NOT EXISTS invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    token           VARCHAR(255) UNIQUE NOT NULL,
    role            user_role NOT NULL DEFAULT 'Employee',
    status          inv_status NOT NULL DEFAULT 'Pending',
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interaction: a log entry for every contact attempt with a lead.
-- Builds the communication history shown in the lead detail view.
CREATE TABLE IF NOT EXISTS interactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT NOT NULL,
    contact_method  contact_method NOT NULL DEFAULT 'WhatsApp',
    recorded_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract: created when a lead is converted into a paying customer.
-- workspace_id is denormalized here to make revenue aggregation queries faster.
CREATE TABLE IF NOT EXISTS contracts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,  -- employee who closed the deal
    contract_value  DECIMAL(12, 2) NOT NULL,
    status          contract_status NOT NULL DEFAULT 'Active',
    signed_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- =============================================================================

-- Automatically refreshes updated_at on every UPDATE to the leads table.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 5. INDEXES
-- =============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_workspace_id   ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);

-- Leads — compound index covers the most common dashboard query: leads per workspace filtered by status
CREATE INDEX IF NOT EXISTS idx_leads_workspace_id       ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to        ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_status   ON leads(workspace_id, status);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_workspace_id   ON contracts(workspace_id);

-- Invitations — token lookup (accept flow) + email lookup (duplicate check)
CREATE INDEX IF NOT EXISTS idx_invitations_token        ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email        ON invitations(email);

-- Prevents sending more than one pending invite to the same email in the same workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_no_duplicate_pending
    ON invitations(workspace_id, email)
    WHERE status = 'Pending';
