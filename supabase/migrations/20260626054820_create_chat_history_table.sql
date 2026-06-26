/*
# Create chat history table for AI weather assistant

1. New Tables
- `chat_messages`
  - `id` (uuid, primary key)
  - `role` (text, either 'user' or 'assistant')
  - `content` (text, the message content)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `chat_messages`.
- Allow anon + authenticated CRUD since this is a single-tenant app without auth.
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat" ON chat_messages;
CREATE POLICY "anon_update_chat" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);