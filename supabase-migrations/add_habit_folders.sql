-- Add habit_folders table for organizing habits
CREATE TABLE IF NOT EXISTS habit_folders (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES habit_folders(id) ON DELETE CASCADE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add folder_id column to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES habit_folders(id) ON DELETE SET NULL;

-- Enable RLS for habit_folders
ALTER TABLE habit_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own habit folders
CREATE POLICY habit_folders_select_policy ON habit_folders
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own habit folders
CREATE POLICY habit_folders_insert_policy ON habit_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own habit folders
CREATE POLICY habit_folders_update_policy ON habit_folders
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own habit folders
CREATE POLICY habit_folders_delete_policy ON habit_folders
    FOR DELETE USING (auth.uid() = user_id);

