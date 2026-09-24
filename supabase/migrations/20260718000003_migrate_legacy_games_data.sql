-- Backfill game_players from legacy array columns on games.
-- This is a no-op if the array columns are already gone or empty.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'players'
  ) THEN
    INSERT INTO game_players (game_id, player_id, victory_points, placement, placement_points)
    SELECT
      g.id,
      u.player_id,
      u.score,
      u.placement,
      pp.points
    FROM games g
    CROSS JOIN LATERAL unnest(g.players, g.scores, g.placements) WITH ORDINALITY AS u(player_id, score, placement, ord)
    CROSS JOIN LATERAL (
      SELECT (compute_placement_points(g.scores))[u.ord] AS points
    ) pp
    ON CONFLICT (game_id, player_id) DO NOTHING;
  END IF;
END $$;
