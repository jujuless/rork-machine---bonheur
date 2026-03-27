import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://bfhtygvwmntcrdjyhdvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j4gif7kSrdaxyPOhW0qsuQ_0EnBNwqU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEVICE_USER_KEY = 'seranova_device_user_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let _cachedDeviceUserId: string | null = null;

export async function getDeviceUserId(): Promise<string> {
  if (_cachedDeviceUserId) return _cachedDeviceUserId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_USER_KEY);
    if (stored) {
      _cachedDeviceUserId = stored;
      return stored;
    }
    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_USER_KEY, newId);
    _cachedDeviceUserId = newId;
    console.log('Seranova: Created device user ID:', newId);
    return newId;
  } catch (e) {
    console.log('Seranova: Failed to get device user ID, using fallback:', e);
    const fallback = generateUUID();
    _cachedDeviceUserId = fallback;
    return fallback;
  }
}
