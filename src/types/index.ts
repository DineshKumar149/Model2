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
}

export interface Post {
  id: string
  user_id: string
  group_id?: string
  content: string
  is_pinned: boolean
  created_at: string
  profiles?: Profile
  media_files?: MediaFile[]
  _count?: {
    comments: number
    post_reactions: number
  }
}

export interface MediaFile {
  id: string
  post_id: string
  url: string
  type: 'image' | 'video' | 'document' | 'audio'
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id?: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content?: string
  media_url?: string
  created_at: string
  profiles?: Profile
}
