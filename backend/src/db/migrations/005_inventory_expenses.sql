-- ============================================================
-- JFMS inventory transactions + expenses
-- ============================================================

CREATE TABLE inventory_transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fuel_id     INTEGER NOT NULL REFERENCES fuels (id) ON DELETE RESTRICT,
  supplier_id INTEGER REFERENCES suppliers (id) ON DELETE SET NULL,
  type        TEXT    NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return')),
  quantity    REAL    NOT NULL CHECK (quantity <> 0),
  reference   TEXT,
  notes       TEXT,
  created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_inv_tx_fuel ON inventory_transactions (fuel_id);
CREATE INDEX idx_inv_tx_type ON inventory_transactions (type);
CREATE INDEX idx_inv_tx_supplier ON inventory_transactions (supplier_id);
CREATE INDEX idx_inv_tx_created ON inventory_transactions (created_at);

CREATE TABLE expenses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER REFERENCES employees (id) ON DELETE SET NULL,
  category       TEXT    NOT NULL CHECK (category IN ('electricity', 'salaries', 'maintenance', 'transport', 'supplies', 'rent', 'other')),
  description    TEXT    NOT NULL,
  amount         REAL    NOT NULL CHECK (amount > 0),
  payment_method TEXT    NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'rfid', 'other')),
  expense_date   TEXT    NOT NULL,
  notes          TEXT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_expenses_date ON expenses (expense_date);
CREATE INDEX idx_expenses_category ON expenses (category);
CREATE INDEX idx_expenses_employee ON expenses (employee_id);

CREATE TRIGGER trg_expenses_updated_at AFTER UPDATE ON expenses
BEGIN
  UPDATE expenses SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
