-- ============================================================================
-- Migration 007: second site_templates option — the real Luna Verde
-- franchisee HTML build (like the corporate site, raw HTML not JSX),
-- selectable per-franchisee alongside the existing "standard" template.
-- ============================================================================

insert into site_templates (name, component_key, is_custom)
values ('Luna Verde Franchisee', 'luna-verde-franchisee', false);
