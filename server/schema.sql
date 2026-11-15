DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS evidence_status CASCADE;

CREATE TYPE user_role AS ENUM ('INSPECTOR', 'DCP', 'JUDGE');
CREATE TYPE evidence_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    badge_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    seizure_address TEXT NOT NULL,
    witness_name VARCHAR(255) NOT NULL,
    witness_contact VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status evidence_status DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    review_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    evidence_id UUID REFERENCES evidence(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    prev_hash CHAR(64),
    entry_hash CHAR(64) NOT NULL
);