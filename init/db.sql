-- 1. Cleanup (Optional: use only if you want to reset the database from scratch)
-- DROP TABLE IF EXISTS interactions;
-- DROP TABLE IF EXISTS leads;
-- DROP TYPE IF EXISTS lead_status;
-- DROP TYPE IF EXISTS lead_source;

-- 2. Security Activation (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Standardized Types (Enums)
-- This ensures data integrity by allowing only specific values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('New', 'In Progress', 'Qualified', 'Lost', 'Converted');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
        CREATE TYPE lead_source AS ENUM ('Instagram', 'WhatsApp', 'Website', 'Referral', 'Other');
    END IF;
END $$;

-- 4. Leads Table (The Core)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE, -- Prevents duplicate emails
    status lead_status DEFAULT 'New',
    source lead_source DEFAULT 'Other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Interactions Table (History/Logs)
-- Essential for a professional CRM to track conversations
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    notes TEXT NOT NULL,
    contact_method VARCHAR(20) DEFAULT 'WhatsApp', -- WhatsApp, Call, Meeting, etc.
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Performance Indices
-- Speeds up searches when you have thousands of records
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
