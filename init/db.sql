-- 1. EXTENSIONS
-- Required for generating random UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOM TYPES (ENUMS)
-- These prevent invalid data from being inserted into status or source columns
DO $$ 
BEGIN
    -- Existing Enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('New', 'In Progress', 'Qualified', 'Lost', 'Converted');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
        CREATE TYPE lead_source AS ENUM ('Instagram', 'WhatsApp', 'Website', 'Referral', 'Other');
    END IF;

    -- Enums for SaaS Plans and Roles
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('Bronze', 'Silver', 'Gold');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('Owner', 'Manager', 'Employee');
    END IF;
END $$;

-- 3. USERS TABLE
-- Stores account information, plans, and hierarchy
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, 
    
    -- SaaS and Hierarchy fields
    plan plan_type DEFAULT 'Bronze',
    role user_role DEFAULT 'Owner',
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who is the boss?
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. LEADS TABLE
-- Stores potential customer information linked to a user
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    status lead_status DEFAULT 'New',
    source lead_source DEFAULT 'Other',
    
    -- Scheduling and Quick Notes
    next_contact_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. INTERACTIONS TABLE
-- History of communication between users and leads
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), 
    notes TEXT NOT NULL,
    contact_method VARCHAR(20) DEFAULT 'WhatsApp',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CONTRACTS TABLE 
-- Tracks financial value of converted leads (Idea 2)
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- The employee who closed the deal
    contract_value DECIMAL(12, 2) NOT NULL, -- Supports up to 9,999,999,999.99
    status VARCHAR(20) DEFAULT 'Active',
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PERFORMANCE INDICES
-- Optimize search speed for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
-- Indices for SaaS queries
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);