// ============================================================
// COMPLETE TYPE DEFINITIONS — Social Platform v2
// ============================================================

export type MediaType = 'image' | 'video' | 'document' | 'audio'
export type PostType = 'tweet' | 'reel' | 'story' | 'thread'
export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
export type GroupRole = 'member' | 'moderator' | 'admin'

// ----------------------------------------------------------------
// PROFILE
// ----------------------------------------------------------------
export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  cover_url?: string
  bio?: string
  website?: string
  is_verified: boolean
  created_at: string
  updated_at?: string
  // computed
  followers_count?: number
  following_count?: number
  posts_count?: number
  is_following?: boolean
  is_blocked?: boolean
  is_online?: boolean
  last_seen?: string
}

// ----------------------------------------------------------------
// POST
// ----------------------------------------------------------------
export interface Post {
  id: string
  user_id: string
  group_id?: string
  parent_post_id?: string
  content: string
  post_type: PostType
  is_pinned: boolean
  is_reel: boolean
  view_count: number
  location?: string
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
  media_files?: MediaFile[]
  comments?: Comment[]
  post_reactions?: PostReaction[]
  reposts?: Repost[]
  // computed
  reactions_count?: number
  comments_count?: number
  reposts_count?: number
  is_liked?: boolean
  is_bookmarked?: boolean
  is_reposted?: boolean
}

// ----------------------------------------------------------------
// MEDIA FILE
// ----------------------------------------------------------------
export interface MediaFile {
  id: string
  post_id: string
  url: string
  type: MediaType
  created_at: string
}

// ----------------------------------------------------------------
// COMMENT
// ----------------------------------------------------------------
export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id?: string
  content: string
  created_at: string
  updated_at: string
  profiles?: Profile
  replies?: Comment[]
  reactions_count?: number
  is_liked?: boolean
}

// ----------------------------------------------------------------
// REACTIONS
// ----------------------------------------------------------------
export interface PostReaction {
  id: string
  post_id: string
  user_id: string
  type: ReactionType
  created_at: string
  profiles?: Profile
}

export interface CommentReaction {
  id: string
  comment_id: string
  user_id: string
  type: string
  created_at: string
}

// ----------------------------------------------------------------
// FOLLOWER
// ----------------------------------------------------------------
export interface Follower {
  follower_id: string
  following_id: string
  created_at: string
  profiles?: Profile
}

// ----------------------------------------------------------------
// STORY
// ----------------------------------------------------------------
export interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption?: string
  bg_color: string
  expires_at: string
  created_at: string
  profiles?: Profile
  story_views?: StoryView[]
  views_count?: number
  is_viewed?: boolean
}

export interface StoryView {
  story_id: string
  viewer_id: string
  viewed_at: string
  profiles?: Profile
}

export interface StoryGroup {
  profile: Profile
  stories: Story[]
  hasUnviewed: boolean
}

export interface StoryHighlight {
  id: string
  user_id: string
  title: string
  cover_url?: string
  created_at: string
  stories?: Story[]
}

// ----------------------------------------------------------------
// BOOKMARK
// ----------------------------------------------------------------
export interface Bookmark {
  user_id: string
  post_id: string
  created_at: string
  posts?: Post
}

// ----------------------------------------------------------------
// HASHTAG
// ----------------------------------------------------------------
export interface Hashtag {
  id: string
  name: string
  post_count: number
  created_at: string
}

// ----------------------------------------------------------------
// REPOST
// ----------------------------------------------------------------
export interface Repost {
  id: string
  user_id: string
  post_id: string
  quote_content?: string
  created_at: string
  profiles?: Profile
  posts?: Post
}

// ----------------------------------------------------------------
// CHAT & MESSAGES
// ----------------------------------------------------------------
export interface Chat {
  id: string
  is_group: boolean
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  // joined
  chat_participants?: ChatParticipant[]
  messages?: Message[]
  last_message?: Message
  unread_count?: number
}

export interface ChatParticipant {
  chat_id: string
  user_id: string
  is_admin: boolean
  last_read_at: string
  joined_at: string
  profiles?: Profile
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content?: string
  media_url?: string
  media_type?: string
  reply_to?: string
  is_read: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
  reply_message?: Message
  message_reactions?: MessageReaction[]
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  profiles?: Profile
}

// ----------------------------------------------------------------
// NOTIFICATION
// ----------------------------------------------------------------
export interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: NotificationType
  post_id?: string
  is_read: boolean
  created_at: string
  profiles?: Profile
  posts?: Post
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'repost'
  | 'message'
  | 'story_view'
  | 'channel_post'

// ----------------------------------------------------------------
// USER PRESENCE
// ----------------------------------------------------------------
export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
}

// ----------------------------------------------------------------
// CHANNEL (Telegram-style broadcast)
// ----------------------------------------------------------------
export interface Channel {
  id: string
  name: string
  description?: string
  avatar_url?: string
  cover_url?: string
  owner_id: string
  is_public: boolean
  subscriber_count: number
  created_at: string
  profiles?: Profile
  is_subscribed?: boolean
}

export interface ChannelPost {
  id: string
  channel_id: string
  content?: string
  media_url?: string
  media_type?: string
  view_count: number
  created_at: string
  channels?: Channel
}

// ----------------------------------------------------------------
// BLOCK
// ----------------------------------------------------------------
export interface Block {
  blocker_id: string
  blocked_id: string
  created_at: string
}

// ----------------------------------------------------------------
// GROUP
// ----------------------------------------------------------------
export interface Group {
  id: string
  name: string
  description?: string
  avatar_url?: string
  cover_url?: string
  is_private: boolean
  created_by: string
  created_at: string
  updated_at: string
  profiles?: Profile
  member_count?: number
  is_member?: boolean
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
  profiles?: Profile
}
