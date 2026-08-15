-- ============================================================
-- JFMS customers + suppliers
-- ============================================================

CREATE TABLE customers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name      TEXT    NOT NULL,
  phone          TEXT,
  vehicle_number TEXT,
  vehicle_type   TEXT,
  rfid_id        TEXT    UNIQUE,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_name ON customers (full_name);

CREATE TABLE suppliers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_suppliers_status ON suppliers (status);

CREATE TRIGGER trg_customers_updated_at AFTER UPDATE ON customers
BEGIN
  UPDATE customers SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_suppliers_updated_at AFTER UPDATE ON suppliers
BEGIN
  UPDATE suppliers SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
