-- Browser AirShare: PIN-gated rooms, presence and WebRTC signaling.
-- File bytes never touch D1; only connection metadata is stored briefly.

CREATE TABLE IF NOT EXISTS airshare_peers (
  room_id TEXT NOT NULL,
  peer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (room_id, peer_id)
);

CREATE INDEX IF NOT EXISTS idx_airshare_peers_room_seen
  ON airshare_peers (room_id, last_seen);

CREATE TABLE IF NOT EXISTS airshare_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  from_peer TEXT NOT NULL,
  to_peer TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_airshare_signals_to
  ON airshare_signals (room_id, to_peer, id);

CREATE TABLE IF NOT EXISTS airshare_join_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_airshare_join_ip
  ON airshare_join_attempts (ip_hash, attempted_at);
