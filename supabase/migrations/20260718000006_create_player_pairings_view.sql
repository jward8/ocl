-- Pairwise matchup history derived from game_players
CREATE OR REPLACE VIEW player_pairings AS
SELECT
  gp1.player_id AS player_a_id,
  gp2.player_id AS player_b_id,
  COUNT(*)::INTEGER AS games_together
FROM game_players gp1
JOIN game_players gp2
  ON gp1.game_id = gp2.game_id
 AND gp1.player_id < gp2.player_id
GROUP BY gp1.player_id, gp2.player_id;
