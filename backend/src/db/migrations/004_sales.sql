-- ============================================================
-- JFMS sales + sale details
-- ============================================================

CREATE TABLE sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees (id) ON DELETE RESTRICT,
  pump_id        INTEGER NOT NULL REFERENCES pumps (id) ON DELETE RESTRICT,
  customer_id    INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  sale_date      TEXT    NOT NULL,
  total_amount   REAL    NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT    NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'rfid', 'other')),
  payment_status TEXT    NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_sales_date ON sales (sale_date);
CREATE INDEX idx_sales_employee ON sales (employee_id);
CREATE INDEX idx_sales_pump ON sales (pump_id);
CREATE INDEX idx_sales_customer ON sales (customer_id);
CREATE INDEX idx_sales_status ON sales (payment_status);
CREATE INDEX idx_sales_method ON sales (payment_method);

CREATE TABLE sale_details (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id         INTEGER NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  fuel_id         INTEGER NOT NULL REFERENCES fuels (id) ON DELETE RESTRICT,
  litres          REAL    NOT NULL CHECK (litres > 0),
  price_per_litre REAL    NOT NULL CHECK (price_per_litre >= 0),
  subtotal        REAL    NOT NULL CHECK (subtotal >= 0),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_sale_details_sale ON sale_details (sale_id);
CREATE INDEX idx_sale_details_fuel ON sale_details (fuel_id);

CREATE TRIGGER trg_sales_updated_at AFTER UPDATE ON sales
BEGIN
  UPDATE sales SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_sale_details_updated_at AFTER UPDATE ON sale_details
BEGIN
  UPDATE sale_details SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
