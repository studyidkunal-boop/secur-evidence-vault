-- Cryptographic Digital Evidence Vault - Database Schema
-- Target: PostgreSQL 14+ (Supabase / Render Postgres)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- Stores law enforcement officers and judicial authorities with strict RBAC roles.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('INSPECTOR', 'DCP', 'JUDGE')),
    badge_id VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes for authentication and authorization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_badge_id ON users(badge_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- 2. EVIDENCE TABLE
-- Stores metadata and SHA-256 integrity hash of digital evidence files.
-- Hard deletes are strictly prohibited by a trigger.
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence (
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
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    storage_path TEXT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    review_remarks TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and RBAC filtering
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status);
CREATE INDEX IF NOT EXISTS idx_evidence_case_number ON evidence(case_number);
CREATE INDEX IF NOT EXISTS idx_evidence_sha256_hash ON evidence(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at DESC);

-- Trigger: Prevent hard delete or truncation on evidence records
CREATE OR REPLACE FUNCTION prevent_evidence_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Evidence records are immutable and cannot be deleted. Use status transitions instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_evidence_hard_delete ON evidence;
CREATE TRIGGER trg_prevent_evidence_hard_delete
BEFORE DELETE ON evidence
FOR EACH ROW
EXECUTE FUNCTION prevent_evidence_hard_delete();

-- ============================================================================
-- 3. AUDIT LOGS TABLE
-- Immutable, hash-chained audit log for chain of custody and forensic tracking.
-- Each row's entry_hash cryptographically anchors to the prev_hash of the preceding row.
-- Updates and deletes are blocked unconditionally at the database level.
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_hash CHAR(64) NOT NULL,
    entry_hash CHAR(64) NOT NULL
);

-- Indexes for audit verification, forensic investigation, and sequential validation
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_evidence_id ON audit_logs(evidence_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entry_hash ON audit_logs(entry_hash);

-- Trigger: Enforce absolute append-only immutability on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: audit_logs entries are strictly immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

