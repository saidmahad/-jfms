-- ============================================================
-- JFMS fuels, price history, pumps
-- ============================================================

CREATE TABLE fuels (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL UNIQUE,
  type              TEXT    NOT NULL,
  price_per_litre   REAL    NOT NULL CHECK (price_per_litre >= 0),
  current_quantity  REAL    NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  minimum_stock     REAL    NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  maximum_capacity  REAL    NOT NULL DEFAULT 0 CHECK (maximum_capacity >= 0),
  status            TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_fuels_status ON fuels (status);
CREATE INDEX idx_fuels_type ON fuels (type);

-- Price changes are recorded safely; historical sales keep their own price snapshot.
CREATE TABLE fuel_price_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fuel_id     INTEGER NOT NULL REFERENCES fuels (id) ON DELETE CASCADE,
  old_price   REAL NOT NULL,
  new_price   REAL NOT NULL,
  changed_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_price_history_fuel ON fuel_price_history (fuel_id);

CREATE TABLE pumps (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  pump_number          TEXT    NOT NULL UNIQUE,
  fuel_id              INTEGER REFERENCES fuels (id) ON DELETE SET NULL,
  current_reading      REAL    NOT NULL DEFAULT 0 CHECK (current_reading >= 0),
  status               TEXT    NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')),
  assigned_employee_id INTEGER REFERENCES employees (id) ON DELETE SET NULL,
  location             TEXT,
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_pumps_status ON pumps (status);
CREATE INDEX idx_pumps_fuel ON pumps (fuel_id);
CREATE INDEX idx_pumps_employee ON pumps (assigned_employee_id);

CREATE TRIGGER trg_fuels_updated_at AFTER UPDATE ON fuels
BEGIN
  UPDATE fuels SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_pumps_updated_at AFTER UPDATE ON pumps
BEGIN
  UPDATE pumps SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
