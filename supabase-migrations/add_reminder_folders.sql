-- Add reminder_folders table for organizing reminders
CREATE TABLE IF NOT EXISTS reminder_folders (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES reminder_folders(id) ON DELETE CASCADE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add folder_id column to reminders table
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES reminder_folders(id) ON DELETE SET NULL;

-- Enable RLS for reminder_folders
ALTER TABLE reminder_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminder_folders
CREATE POLICY "Users can view their own reminder folders" ON reminder_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reminder folders" ON reminder_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reminder folders" ON reminder_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminder folders" ON reminder_folders FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminder_folders_user_id ON reminder_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_folders_parent_id ON reminder_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_reminders_folder_id ON reminders(folder_id);

