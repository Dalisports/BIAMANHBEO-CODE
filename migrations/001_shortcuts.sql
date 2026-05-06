CREATE TABLE IF NOT EXISTS shortcuts (
  id SERIAL PRIMARY KEY,
  position INTEGER NOT NULL CHECK (position BETWEEN 7 AND 9),
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shortcuts_position ON shortcuts(position);

-- Insert empty shortcuts if not exist
INSERT INTO shortcuts (position) VALUES (7), (8), (9)
ON CONFLICT (position) DO NOTHING;