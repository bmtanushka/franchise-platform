-- Franchise-interest leads: a new selectable "service" for the corporate
-- (franchisor) site's chat agent, reusing the existing leads/service_types
-- infrastructure rather than a new table. See agent/app/question_sets.py
-- for the question flow and web/src/lib/db/leads.ts for why every existing
-- "customer leads" query excludes this key. service_types is no longer a
-- fixed set of 5 as migration 001's comment says.
insert into service_types (key, name)
values ('franchise_interest', 'Franchise Opportunity');
