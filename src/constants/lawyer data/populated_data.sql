-- User-supplied organization directory. Missing details are NULL or absent child rows.
-- Re-running updates these six organizations; unrelated organizations are preserved.

INSERT INTO organizations (id, name, website, phone, email, address, description, language_assistance_notes)
VALUES ('project-sentinel', 'Project Sentinel', 'https://www.housing.org/contact', '(800) 339-6043', 'info@housing.org', '1490 El Camino Real, Santa Clara, CA 95050', 'Provides counseling and fair housing services', 'Offers other language assistance through Language Services Associates')
ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, phone = excluded.phone, email = excluded.email, address = excluded.address, description = excluded.description, language_assistance_notes = excluded.language_assistance_notes;
DELETE FROM organization_counties WHERE organization_id = 'project-sentinel';
INSERT INTO organization_counties (organization_id, county) VALUES ('project-sentinel', 'San Mateo');
INSERT INTO organization_counties (organization_id, county) VALUES ('project-sentinel', 'Santa Clara');
INSERT INTO organization_counties (organization_id, county) VALUES ('project-sentinel', 'Sacramento');
INSERT INTO organization_counties (organization_id, county) VALUES ('project-sentinel', 'Stanislaus');
DELETE FROM organization_services WHERE organization_id = 'project-sentinel';
INSERT INTO organization_services (organization_id, service) VALUES ('project-sentinel', 'tenant counseling');
INSERT INTO organization_services (organization_id, service) VALUES ('project-sentinel', 'mediation');
INSERT INTO organization_services (organization_id, service) VALUES ('project-sentinel', 'fair housing');
DELETE FROM organization_representation_levels WHERE organization_id = 'project-sentinel';
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('project-sentinel', 'advice');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('project-sentinel', 'limited representation');
DELETE FROM organization_case_stages WHERE organization_id = 'project-sentinel';
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('project-sentinel', 'notice received');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('project-sentinel', 'court papers filed');
DELETE FROM organization_languages WHERE organization_id = 'project-sentinel';
INSERT INTO organization_languages (organization_id, language) VALUES ('project-sentinel', 'English');
INSERT INTO organization_languages (organization_id, language) VALUES ('project-sentinel', 'Spanish');

INSERT INTO organizations (id, name, website, phone, email, address, description, language_assistance_notes)
VALUES ('law-foundation-silicon-valley', 'Law Foundation of Silicon Valley', 'https://www.lawfoundation.org/', '(408) 293-4790', NULL, '4 North Second Street, Suite 1300, San Jose, CA 95113', 'Primary eviction-defense provider for Santa Clara County', 'Other, unlisted languages also offered')
ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, phone = excluded.phone, email = excluded.email, address = excluded.address, description = excluded.description, language_assistance_notes = excluded.language_assistance_notes;
DELETE FROM organization_counties WHERE organization_id = 'law-foundation-silicon-valley';
INSERT INTO organization_counties (organization_id, county) VALUES ('law-foundation-silicon-valley', 'Santa Clara');
DELETE FROM organization_services WHERE organization_id = 'law-foundation-silicon-valley';
INSERT INTO organization_services (organization_id, service) VALUES ('law-foundation-silicon-valley', 'eviction defense');
INSERT INTO organization_services (organization_id, service) VALUES ('law-foundation-silicon-valley', 'housing law');
INSERT INTO organization_services (organization_id, service) VALUES ('law-foundation-silicon-valley', 'full representation');
INSERT INTO organization_services (organization_id, service) VALUES ('law-foundation-silicon-valley', 'legal advice');
DELETE FROM organization_representation_levels WHERE organization_id = 'law-foundation-silicon-valley';
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('law-foundation-silicon-valley', 'advice');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('law-foundation-silicon-valley', 'full representation');
DELETE FROM organization_case_stages WHERE organization_id = 'law-foundation-silicon-valley';
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('law-foundation-silicon-valley', 'notice received');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('law-foundation-silicon-valley', 'lawsuit filed');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('law-foundation-silicon-valley', 'trial');
DELETE FROM organization_languages WHERE organization_id = 'law-foundation-silicon-valley';
INSERT INTO organization_languages (organization_id, language) VALUES ('law-foundation-silicon-valley', 'English');
INSERT INTO organization_languages (organization_id, language) VALUES ('law-foundation-silicon-valley', 'Spanish');
INSERT INTO organization_languages (organization_id, language) VALUES ('law-foundation-silicon-valley', 'Vietnamese');

INSERT INTO organizations (id, name, website, phone, email, address, description, language_assistance_notes)
VALUES ('bay-area-legal-aid', 'Bay Area Legal Aid', 'https://baylegal.org/', '800-551-5554', NULL, NULL, 'Large regional legal aid organization serving multiple Bay Area counties', NULL)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, phone = excluded.phone, email = excluded.email, address = excluded.address, description = excluded.description, language_assistance_notes = excluded.language_assistance_notes;
DELETE FROM organization_counties WHERE organization_id = 'bay-area-legal-aid';
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'Alameda');
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'Contra Costa');
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'Marin');
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'Napa');
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'San Francisco');
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'San Mateo');
INSERT INTO organization_counties (organization_id, county) VALUES ('bay-area-legal-aid', 'Santa Clara');
DELETE FROM organization_services WHERE organization_id = 'bay-area-legal-aid';
INSERT INTO organization_services (organization_id, service) VALUES ('bay-area-legal-aid', 'housing law');
INSERT INTO organization_services (organization_id, service) VALUES ('bay-area-legal-aid', 'eviction defense');
INSERT INTO organization_services (organization_id, service) VALUES ('bay-area-legal-aid', 'legal advice');
INSERT INTO organization_services (organization_id, service) VALUES ('bay-area-legal-aid', 'limited representation');
DELETE FROM organization_representation_levels WHERE organization_id = 'bay-area-legal-aid';
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('bay-area-legal-aid', 'advice');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('bay-area-legal-aid', 'limited representation');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('bay-area-legal-aid', 'full representation');
DELETE FROM organization_case_stages WHERE organization_id = 'bay-area-legal-aid';
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('bay-area-legal-aid', 'notice received');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('bay-area-legal-aid', 'lawsuit filed');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('bay-area-legal-aid', 'trial');
DELETE FROM organization_languages WHERE organization_id = 'bay-area-legal-aid';

INSERT INTO organizations (id, name, website, phone, email, address, description, language_assistance_notes)
VALUES ('eviction-defense-collaborative', 'Eviction Defense Collaborative', 'https://evictiondefense.org/', '(415) 947-0797', 'legal@evictiondefense.org', '976 Mission St. San Francisco, CA 94103', 'Major provider of San Francisco tenant defense services', NULL)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, phone = excluded.phone, email = excluded.email, address = excluded.address, description = excluded.description, language_assistance_notes = excluded.language_assistance_notes;
DELETE FROM organization_counties WHERE organization_id = 'eviction-defense-collaborative';
INSERT INTO organization_counties (organization_id, county) VALUES ('eviction-defense-collaborative', 'San Francisco');
DELETE FROM organization_services WHERE organization_id = 'eviction-defense-collaborative';
INSERT INTO organization_services (organization_id, service) VALUES ('eviction-defense-collaborative', 'eviction defense');
INSERT INTO organization_services (organization_id, service) VALUES ('eviction-defense-collaborative', 'full representation');
INSERT INTO organization_services (organization_id, service) VALUES ('eviction-defense-collaborative', 'tenant counseling');
INSERT INTO organization_services (organization_id, service) VALUES ('eviction-defense-collaborative', 'emergency assistance');
DELETE FROM organization_representation_levels WHERE organization_id = 'eviction-defense-collaborative';
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('eviction-defense-collaborative', 'advice');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('eviction-defense-collaborative', 'full representation');
DELETE FROM organization_case_stages WHERE organization_id = 'eviction-defense-collaborative';
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('eviction-defense-collaborative', 'notice received');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('eviction-defense-collaborative', 'lawsuit filed');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('eviction-defense-collaborative', 'trial');
DELETE FROM organization_languages WHERE organization_id = 'eviction-defense-collaborative';

INSERT INTO organizations (id, name, website, phone, email, address, description, language_assistance_notes)
VALUES ('legal-aid-san-mateo', 'Legal Aid Society of San Mateo County', 'https://www.legalaidsmc.org/', '(650) 558-0915', NULL, '330 Twin Dolphin Drive, Suite 123, Redwood City, CA 94065', 'Primary legal aid organization for San Mateo County residents', NULL)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, phone = excluded.phone, email = excluded.email, address = excluded.address, description = excluded.description, language_assistance_notes = excluded.language_assistance_notes;
DELETE FROM organization_counties WHERE organization_id = 'legal-aid-san-mateo';
INSERT INTO organization_counties (organization_id, county) VALUES ('legal-aid-san-mateo', 'San Mateo');
DELETE FROM organization_services WHERE organization_id = 'legal-aid-san-mateo';
INSERT INTO organization_services (organization_id, service) VALUES ('legal-aid-san-mateo', 'housing law');
INSERT INTO organization_services (organization_id, service) VALUES ('legal-aid-san-mateo', 'tenant counseling');
INSERT INTO organization_services (organization_id, service) VALUES ('legal-aid-san-mateo', 'legal advice');
DELETE FROM organization_representation_levels WHERE organization_id = 'legal-aid-san-mateo';
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('legal-aid-san-mateo', 'advice');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('legal-aid-san-mateo', 'limited representation');
DELETE FROM organization_case_stages WHERE organization_id = 'legal-aid-san-mateo';
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('legal-aid-san-mateo', 'notice received');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('legal-aid-san-mateo', 'lawsuit filed');
DELETE FROM organization_languages WHERE organization_id = 'legal-aid-san-mateo';

INSERT INTO organizations (id, name, website, phone, email, address, description, language_assistance_notes)
VALUES ('clsepa', 'Community Legal Services East Palo Alto', 'https://clsepa.org/', '650 326-6440', NULL, '1861 Bay Rd. East Palo Alto, CA 94303', 'Important provider for East Palo Alto and surrounding communities', NULL)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, phone = excluded.phone, email = excluded.email, address = excluded.address, description = excluded.description, language_assistance_notes = excluded.language_assistance_notes;
DELETE FROM organization_counties WHERE organization_id = 'clsepa';
INSERT INTO organization_counties (organization_id, county) VALUES ('clsepa', 'Santa Clara');
INSERT INTO organization_counties (organization_id, county) VALUES ('clsepa', 'San Mateo');
DELETE FROM organization_services WHERE organization_id = 'clsepa';
INSERT INTO organization_services (organization_id, service) VALUES ('clsepa', 'housing law');
INSERT INTO organization_services (organization_id, service) VALUES ('clsepa', 'eviction defense');
INSERT INTO organization_services (organization_id, service) VALUES ('clsepa', 'tenant counseling');
INSERT INTO organization_services (organization_id, service) VALUES ('clsepa', 'community advocacy');
DELETE FROM organization_representation_levels WHERE organization_id = 'clsepa';
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('clsepa', 'advice');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('clsepa', 'limited representation');
INSERT INTO organization_representation_levels (organization_id, representation_level) VALUES ('clsepa', 'full representation');
DELETE FROM organization_case_stages WHERE organization_id = 'clsepa';
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('clsepa', 'notice received');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('clsepa', 'lawsuit filed');
INSERT INTO organization_case_stages (organization_id, case_stage) VALUES ('clsepa', 'trial');
DELETE FROM organization_languages WHERE organization_id = 'clsepa';

-- US Census Public_AR_Current address-range geocodes, retrieved 2026-10-24.
-- Approximate office coordinates, not driving routes.
INSERT INTO organization_coordinates (organization_id, address, latitude, longitude, source) VALUES ('clsepa', '1861 Bay Rd. East Palo Alto, CA 94303', 37.47261466989, -122.132899165445, 'https://geocoding.geo.census.gov/geocoder/') ON CONFLICT(organization_id) DO UPDATE SET address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude, source = excluded.source;
INSERT INTO organization_coordinates (organization_id, address, latitude, longitude, source) VALUES ('eviction-defense-collaborative', '976 Mission St. San Francisco, CA 94103', 37.78129155347, -122.408405561559, 'https://geocoding.geo.census.gov/geocoder/') ON CONFLICT(organization_id) DO UPDATE SET address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude, source = excluded.source;
INSERT INTO organization_coordinates (organization_id, address, latitude, longitude, source) VALUES ('law-foundation-silicon-valley', '4 North Second Street, Suite 1300, San Jose, CA 95113', 37.336812912928, -121.889534019836, 'https://geocoding.geo.census.gov/geocoder/') ON CONFLICT(organization_id) DO UPDATE SET address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude, source = excluded.source;
INSERT INTO organization_coordinates (organization_id, address, latitude, longitude, source) VALUES ('legal-aid-san-mateo', '330 Twin Dolphin Drive, Suite 123, Redwood City, CA 94065', 37.521386329287, -122.2583861336, 'https://geocoding.geo.census.gov/geocoder/') ON CONFLICT(organization_id) DO UPDATE SET address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude, source = excluded.source;
INSERT INTO organization_coordinates (organization_id, address, latitude, longitude, source) VALUES ('project-sentinel', '1490 El Camino Real, Santa Clara, CA 95050', 37.352288995664, -121.953202452822, 'https://geocoding.geo.census.gov/geocoder/') ON CONFLICT(organization_id) DO UPDATE SET address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude, source = excluded.source;

-- FICTIONAL prices per consultation in USD, fabricated solely for testing ranking.
-- These values are not actual fees, estimates, or quotes from these organizations.
INSERT INTO organization_test_prices (organization_id, consultation_usd, fabricated_for_testing) VALUES
('project-sentinel', 25, 1),
('law-foundation-silicon-valley', 100, 1),
('bay-area-legal-aid', 40, 1),
('eviction-defense-collaborative', 150, 1),
('legal-aid-san-mateo', 75, 1),
('clsepa', 50, 1)
ON CONFLICT(organization_id) DO UPDATE SET consultation_usd = excluded.consultation_usd, fabricated_for_testing = 1;
