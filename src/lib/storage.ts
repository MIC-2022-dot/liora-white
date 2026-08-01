import { supabase } from "@/integrations/supabase/client";

const signedCache = new Map<string, { url: string; expires: number }>();

/** Uploads a file and returns the storage path (`bucket/path` is not included). */
export async function uploadTo(bucket: string, path: string, file: File | Blob) {
  const contentType = file instanceof File ? file.type : (file as Blob).type;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, contentType ? { upsert: true, contentType } : { upsert: true });
  if (error) throw error;
  return path;
}

/** Returns a cached signed URL for a private object. */
export async function signedUrl(bucket: string, path: string | null | undefined, ttl = 3600) {
  if (!path) return null;
  const key = `${bucket}:${path}`;
  const hit = signedCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error || !data) return null;
  signedCache.set(key, { url: data.signedUrl, expires: Date.now() + (ttl - 60) * 1000 });
  return data.signedUrl;
}

export function fileExt(file: File, fallback = "bin") {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : fallback;
}
