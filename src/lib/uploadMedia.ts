import { createClient } from './supabase/client'

export async function uploadMedia(
  file: File,
  bucket: 'posts' | 'avatars' | 'stories' | 'chat-media',
  folder?: string
): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const filename = `${folder ? folder + '/' : ''}${Date.now()}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(filename, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error || !data) return null
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return publicUrl
}
