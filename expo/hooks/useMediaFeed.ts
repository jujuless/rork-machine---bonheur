import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface MediaItem {
  id: string;
  user_id: string;
  file_path: string;
  media_type: 'image' | 'video';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface UseMediaFeedReturn {
  items: MediaItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMediaFeed(): UseMediaFeedReturn {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log('Seranova: Fetching media_items feed...');
    try {
      const { data, error: fetchError } = await supabase
        .from('media_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.log('Seranova: media_items fetch error:', fetchError.message);
        setError(fetchError.message);
        return;
      }

      const rows = (data ?? []) as MediaItem[];
      console.log('Seranova: media_items fetched — count:', rows.length);
      setItems(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      console.log('Seranova: useMediaFeed unexpected error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { items, isLoading, error, refresh: fetchFeed };
}
