-- Fix Habits Module Schema
-- Convert habits and habit_logs to use INTEGER IDs with proper schema

-- Step 1: Drop old tables if they exist (backup data first!)
-- WARNING: This will delete all existing habit data
-- If you have data, export it first!

-- Drop dependent tables first
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS habit_folders CASCADE;
DROP TABLE IF EXISTS habits CASCADE;

-- Step 2: Create habits table with INTEGER ID
CREATE TABLE habits (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    target_days JSONB,
    days_of_week JSONB,
    color TEXT,
    icon TEXT,
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    origin TEXT DEFAULT 'user',
    xp INTEGER DEFAULT 10,
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_from TIMESTAMPTZ,
    frozen_to TIMESTAMPTZ,
    folder_id INTEGER REFERENCES habit_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create habit_logs table with INTEGER ID
CREATE TABLE habit_logs (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create habit_folders table with INTEGER ID
CREATE TABLE habit_folders (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES habit_folders(id) ON DELETE CASCADE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_folders ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies for habits
CREATE POLICY "Users can view their own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create RLS Policies for habit_logs
CREATE POLICY "Users can view their own habit_logs" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own habit_logs" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habit_logs" ON habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habit_logs" ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create RLS Policies for habit_folders
CREATE POLICY "Users can view their own habit_folders" ON habit_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own habit_folders" ON habit_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habit_folders" ON habit_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habit_folders" ON habit_folders FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Create indexes for performance
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_folder_id ON habits(folder_id);
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(date);
CREATE INDEX idx_habit_folders_user_id ON habit_folders(user_id);
CREATE INDEX idx_habit_folders_parent_id ON habit_folders(parent_id);

