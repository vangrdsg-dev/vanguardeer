CREATE TABLE audit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  business_name TEXT,
  industry TEXT,
  website TEXT,
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  keyword TEXT,
  notes TEXT,
  utm_data TEXT,
  form_time TEXT,
  source TEXT DEFAULT 'homepage'
);

CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  session_id TEXT,
  messages TEXT,
  email TEXT
);
