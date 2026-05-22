-- ============================================================
-- SCHEMA V2 — Full Social Platform Extension
-- Run this in your Supabase SQL editor
-- ============================================================

-- ----------------------------------------------------------------
-- EXTEND existing tables
-- ----------------------------------------------------------------

-- Add post type + threading + view count to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'tweet';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_reel BOOLEAN DEFAULT FALSE;

-- Add reply + read + media type to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add is_admin to chat_participants
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ----------------------------------------------------------------
-- STORIES (Instagram/Snapchat — 24h disappearing)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  caption TEXT,
  bg_color TEXT DEFAULT '#000000',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS story_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_highlight_items (
  highlight_id UUID REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  PRIMARY KEY (highlight_id, story_id)
);

-- ----------------------------------------------------------------
-- BOOKMARKS / SAVES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ----------------------------------------------------------------
-- HASHTAGS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- ----------------------------------------------------------------
-- REPOSTS (Retweets + Quote Tweets)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reposts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  quote_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- ----------------------------------------------------------------
-- MESSAGE REACTIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- ----------------------------------------------------------------
-- USER PRESENCE (online/offline)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- CHANNELS (Telegram broadcast channels)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT TRUE,
  subscriber_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_subscriptions (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- BLOCKS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- ----------------------------------------------------------------
-- REPORTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id),
  target_post_id UUID REFERENCES posts(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- COMMENT REACTIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ----------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlight_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Stories viewable by everyone" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() = user_id);

-- Story views
CREATE POLICY "Story views viewable by story owner" ON story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
);
CREATE POLICY "Users can record story views" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Story highlights
CREATE POLICY "Highlights viewable by everyone" ON story_highlights FOR SELECT USING (true);
CREATE POLICY "Users can manage own highlights" ON story_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own highlights" ON story_highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON story_highlights FOR DELETE USING (auth.uid() = user_id);

-- Highlight items
CREATE POLICY "Highlight items viewable by everyone" ON story_highlight_items FOR SELECT USING (true);
CREATE POLICY "Users can manage highlight items" ON story_highlight_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM story_highlights WHERE id = highlight_id AND user_id = auth.uid())
);

-- Bookmarks
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Hashtags
CREATE POLICY "Hashtags viewable by everyone" ON hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hashtags" ON hashtags FOR INSERT WITH CHECK (true);

-- Post hashtags
CREATE POLICY "Post hashtags viewable by everyone" ON post_hashtags FOR SELECT USING (true);
CREATE POLICY "Users can add post hashtags" ON post_hashtags FOR INSERT WITH CHECK (true);

-- Reposts
CREATE POLICY "Reposts viewable by everyone" ON reposts FOR SELECT USING (true);
CREATE POLICY "Users can repost" ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON reposts FOR DELETE USING (auth.uid() = user_id);

-- Message reactions
CREATE POLICY "Message reactions viewable by chat participants" ON message_reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_id AND cp.user_id = auth.uid()
  )
);
CREATE POLICY "Users can react to messages" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- User presence
CREATE POLICY "Presence viewable by everyone" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update own presence" ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can set own presence" ON user_presence FOR UPDATE USING (auth.uid() = user_id);

-- Channels
CREATE POLICY "Public channels viewable by everyone" ON channels FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create channels" ON channels FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update channels" ON channels FOR UPDATE USING (auth.uid() = owner_id);

-- Channel subscriptions
CREATE POLICY "Subscriptions viewable by everyone" ON channel_subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can subscribe" ON channel_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsubscribe" ON channel_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Channel posts
CREATE POLICY "Channel posts viewable by everyone" ON channel_posts FOR SELECT USING (true);
CREATE POLICY "Channel owners can post" ON channel_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM channels WHERE id = channel_id AND owner_id = auth.uid())
);

-- Blocks
CREATE POLICY "Users can view own blocks" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON blocks FOR DELETE USING (auth.uid() = blocker_id);

-- Reports
CREATE POLICY "Reporters can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can report" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Comment reactions
CREATE POLICY "Comment reactions viewable by everyone" ON comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users can react to comments" ON comment_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove comment reactions" ON comment_reactions FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- ENABLE REALTIME on new tables
-- ----------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE story_views;
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE reposts;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_posts;

-- ----------------------------------------------------------------
-- STORAGE BUCKETS (Run these if using Supabase SQL)
-- Or create manually in Storage dashboard
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('channels', 'channels', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read posts" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Auth users can upload posts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read stories" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Auth users can upload stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);

CREATE POLICY "Chat media readable by participants" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can upload chat media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read channels" ON storage.objects FOR SELECT USING (bucket_id = 'channels');
CREATE POLICY "Auth users can upload channel media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'channels' AND auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------

-- Function to increment hashtag count
CREATE OR REPLACE FUNCTION increment_hashtag_count(hashtag_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO hashtags (name, post_count) VALUES (hashtag_name, 1)
  ON CONFLICT (name) DO UPDATE SET post_count = hashtags.post_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update user presence
CREATE OR REPLACE FUNCTION upsert_user_presence(p_user_id UUID, p_is_online BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen)
  VALUES (p_user_id, p_is_online, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET is_online = p_is_online, last_seen = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
