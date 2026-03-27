import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase, getDeviceUserId } from '@/lib/supabase';

export interface UploadResult {
  publicUrl: string;
  filePath: string;
  mediaType: 'image' | 'video';
}

interface UseUploadMediaReturn {
  upload: (uri: string, mediaType: 'image' | 'video') => Promise<UploadResult>;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export function useUploadMedia(): UseUploadMediaReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsUploading(false);
  }, []);

  const upload = useCallback(async (uri: string, mediaType: 'image' | 'video'): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    console.log('Seranova: Starting upload — type:', mediaType, 'uri:', uri.slice(0, 60));

    try {
      const userId = await getDeviceUserId();
      const ext = mediaType === 'video' ? 'mp4' : 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

      let fileData: ArrayBuffer | Blob;

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        fileData = await response.blob();
      } else {
        const response = await fetch(uri);
        fileData = await response.arrayBuffer();
      }

      console.log('Seranova: Uploading to bucket "media", path:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, fileData, { contentType, upsert: false });

      if (uploadError) {
        console.log('Seranova: Storage upload error:', uploadError.message);
        throw new Error(`Upload échoué : ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('Seranova: Upload success, public URL:', publicUrl.slice(0, 80));

      const { error: insertError } = await supabase
        .from('media_items')
        .insert({
          user_id: userId,
          file_path: publicUrl,
          media_type: mediaType,
          status: 'pending',
        });

      if (insertError) {
        console.log('Seranova: media_items insert error:', insertError.message);
        throw new Error(`Enregistrement échoué : ${insertError.message}`);
      }

      console.log('Seranova: media_items row inserted — user_id:', userId);
      return { publicUrl, filePath: fileName, mediaType };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      console.log('Seranova: useUploadMedia error:', msg);
      setError(msg);
      throw e;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error, reset };
}
