-- Initialize PostgreSQL with pgvector extension
-- This runs automatically on first container start

-- Create extension for vector search (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types for status fields
CREATE TYPE IF NOT EXISTS knowledge_status AS ENUM ('draft', 'validated', 'published', 'archived');
CREATE TYPE IF NOT EXISTS flight_status AS ENUM ('scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled');
CREATE TYPE IF NOT EXISTS booking_status AS ENUM ('pending', 'confirmed', 'paid', 'cancelled', 'refunded');
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('user', 'partner', 'admin', 'superadmin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE '✅ Database initialized with pgvector and custom types';
END $$;
