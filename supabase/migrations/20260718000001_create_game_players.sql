-- Ensure games table has the columns needed for the new schema
ALTER TABLE games ADD COLUMN IF NOT EXISTS played_at DATE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS largest_army UUID REFERENCES players(id);
ALTER TABLE games ADD COLUMN IF NOT EXISTS longest_road UUID REFERENCES players(id);

-- Create junction table linking games to players with per-game stats
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  victory_points INTEGER NOT NULL DEFAULT 0,
  placement INTEGER NOT NULL,
  placement_points NUMERIC(4,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id ON game_players(player_id);
