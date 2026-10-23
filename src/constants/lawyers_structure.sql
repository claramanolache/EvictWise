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
