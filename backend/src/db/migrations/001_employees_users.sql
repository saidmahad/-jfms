-- ============================================================
-- JFMS core: employees + users
-- ============================================================

CREATE TABLE employees (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name   TEXT    NOT NULL,
  phone       TEXT,
  position    TEXT    NOT NULL DEFAULT 'Fuel Attendant'
              CHECK (position IN ('Administrator', 'Manager', 'Fuel Attendant', 'Accountant', 'Supervisor')),
  salary      REAL    NOT NULL DEFAULT 0 CHECK (salary >= 0),
  status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hire_date   TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_employees_status ON employees (status);
CREATE INDEX idx_employees_position ON employees (position);

CREATE TABLE users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT    NOT NULL UNIQUE,
  email        TEXT    NOT NULL UNIQUE,
  password     TEXT    NOT NULL,
  role         TEXT    NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'ATTENDANT')),
  status       TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  employee_id  INTEGER REFERENCES employees (id) ON DELETE SET NULL,
  last_login   TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_employee ON users (employee_id);

CREATE TRIGGER trg_employees_updated_at AFTER UPDATE ON employees
BEGIN
  UPDATE employees SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_users_updated_at AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
