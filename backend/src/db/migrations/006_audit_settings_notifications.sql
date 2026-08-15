-- ============================================================
-- JFMS audit logs, settings, notifications
-- ============================================================

CREATE TABLE audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
  action      TEXT    NOT NULL,
  module      TEXT    NOT NULL,
  record_id   INTEGER,
  old_values  TEXT,
  new_values  TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_audit_module ON audit_logs (module);
CREATE INDEX idx_audit_user ON audit_logs (user_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('low_stock', 'critical_stock', 'sale', 'login', 'error', 'admin', 'system')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications (created_at);
