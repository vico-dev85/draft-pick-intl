import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, COMPRESSION_OPTIONS);
}

export async function uploadPlayerPhoto(
  userId: string,
  entityId: string,
  file: File
): Promise<string | null> {
  const fileName = `${userId}/${entityId}-${Date.now()}.webp`;
  const { error } = await supabase.storage
    .from("player-photos")
    .upload(fileName, file, { cacheControl: "3600", upsert: true });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("player-photos")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
