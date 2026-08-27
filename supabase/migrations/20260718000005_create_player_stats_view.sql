-- Player stats computed from game_players (source of truth)
CREATE OR REPLACE VIEW player_stats AS
SELECT
  p.id,
  p.name,
  COALESCE(COUNT(gp.id), 0)::INTEGER AS games_played,
  COALESCE(SUM(gp.placement_points), 0)::NUMERIC AS points,
  COALESCE(SUM(gp.victory_points), 0)::INTEGER AS victory_points,
  COALESCE(AVG(gp.placement), 0)::NUMERIC(4,2) AS average_placement,
  COALESCE(SUM(CASE WHEN gp.forfeited THEN 1 ELSE 0 END), 0)::INTEGER AS forfeits
FROM players p
LEFT JOIN game_players gp ON gp.player_id = p.id
GROUP BY p.id, p.name;
