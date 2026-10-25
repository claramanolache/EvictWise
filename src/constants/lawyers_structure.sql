-- SQLite schema. Contact details are supplied data, not independently verified.
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    description TEXT NOT NULL,
    language_assistance_notes TEXT
);

CREATE TABLE IF NOT EXISTS organization_counties (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    county TEXT NOT NULL,
    PRIMARY KEY (organization_id, county)
);
CREATE TABLE IF NOT EXISTS organization_services (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    PRIMARY KEY (organization_id, service)
);
CREATE TABLE IF NOT EXISTS organization_representation_levels (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    representation_level TEXT NOT NULL,
    PRIMARY KEY (organization_id, representation_level)
);
CREATE TABLE IF NOT EXISTS organization_case_stages (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    case_stage TEXT NOT NULL,
    PRIMARY KEY (organization_id, case_stage)
);
CREATE TABLE IF NOT EXISTS organization_languages (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    PRIMARY KEY (organization_id, language)
);

-- Address-matched coordinates; separate table supports existing databases without ALTER TABLE.
CREATE TABLE IF NOT EXISTS organization_coordinates (
    organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
    source TEXT NOT NULL
);

-- Fabricated demo prices ONLY. Never use this table as a source of actual fees.
CREATE TABLE IF NOT EXISTS organization_test_prices (
    organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    consultation_usd REAL NOT NULL CHECK(consultation_usd >= 0),
    fabricated_for_testing INTEGER NOT NULL DEFAULT 1 CHECK(fabricated_for_testing = 1)
);
