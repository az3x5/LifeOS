-- Add islamic_bookmarks table for bookmarking Quran verses and Hadiths
CREATE TABLE IF NOT EXISTS islamic_bookmarks (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('quran', 'hadith', 'dua')),
    reference TEXT NOT NULL, -- e.g., '1:1' for Quran, 'bukhari:1' for Hadith
    title TEXT, -- e.g., 'Al-Fatihah 1:1', 'Sahih Bukhari #1'
    content TEXT, -- The actual verse/hadith text for quick display
    notes TEXT, -- User's personal notes
    tags JSONB, -- Array of tags for organization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, type, reference) -- Prevent duplicate bookmarks
);

-- Enable RLS for islamic_bookmarks
ALTER TABLE islamic_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for islamic_bookmarks
CREATE POLICY "Users can view their own islamic bookmarks"
    ON islamic_bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own islamic bookmarks"
    ON islamic_bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own islamic bookmarks"
    ON islamic_bookmarks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own islamic bookmarks"
    ON islamic_bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_islamic_bookmarks_user_type ON islamic_bookmarks(user_id, type);
CREATE INDEX IF NOT EXISTS idx_islamic_bookmarks_reference ON islamic_bookmarks(reference);

