-- Customizable dashboard (docs/dashboard-revamp.md). A per-stack, owner-set layout
-- describing which dashboard panels show, in what order, at what width. NULL = use the
-- code-side DEFAULT_LAYOUT, so every existing stack renders unchanged until edited.
ALTER TABLE crews ADD COLUMN IF NOT EXISTS dashboard_config jsonb;
