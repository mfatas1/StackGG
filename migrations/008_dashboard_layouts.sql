-- Per-user personal dashboard layouts (docs/competitive-casual-revamp.md).
-- Each signed-in user gets their own layout per stack. The owner-controlled public default
-- stays in crews.dashboard_config (migration 007); a row here overrides it for one user.
-- Signed-out visitors and members without a row see the public default.
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  crew_id    uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config     jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);
