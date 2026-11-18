-- DocuForge CMS PostgreSQL initialization script
-- This runs only on first container creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create the database if running as superuser (handled by POSTGRES_DB env var)
-- Additional initialization can be added here

COMMENT ON DATABASE docuforge IS 'DocuForge CMS database';
