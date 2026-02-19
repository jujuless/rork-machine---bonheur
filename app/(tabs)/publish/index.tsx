import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Send, Camera, CheckCircle, X, Video } from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';
import { useApp } from '@/providers/AppProvider';

const SUPABASE_URL = 'https://bfhtygvwmntcrdjyhdvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j4gif7kSrdaxyPOhW0qsuQ_0EnBNwqU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function PublishScreen() {
  const { addPublication, colors, t, textScale } = useApp();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const confirmFade = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (showConfirmation) {
      Animated.parallel([
        Animated.timing(confirmFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(confirmScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    } else {
      confirmFade.setValue(0);
      confirmScale.setValue(0.9);
    }
  }, [showConfirmation]);

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      });
    }
  }, []);

  const uploadToSupabase = async (uri: string, type: 'image' | 'video') => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const ext = type === 'video' ? 'mp4' : 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';

    const { error } = await supabase.storage
      .from('video') // ✅ BON BUCKET
      .upload(fileName, blob, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('video').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = useCallback(async () => {
    if (!text.trim() && !media) {
      Alert.alert(t.contentRequired, t.contentRequiredMsg);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let mediaUrl: string | undefined;

      if (media) {
        mediaUrl = await uploadToSupabase(media.uri, media.type);
      }

      addPublication(text.trim(), mediaUrl);

      setText('');
      setMedia(null);
      setShowConfirmation(true);
    } catch (e) {
      console.log('UPLOAD ERROR:', e);
      Alert.alert('Erreur', "Upload impossible (vérifie bucket + policies Supabase)");
    }
  }, [text, media]);

  const canSubmit = !!(text.trim() || media);

  if (showConfirmation) {
    return (
      <View style={[styles.confirmContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.confirmCard, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: confirmFade,
          transform: [{ scale: confirmScale }],
        }]}>
          <CheckCircle size={56} color={colors.success} />
          <Text style={[styles.confirmTitle, { color: colors.text, fontSize: 20 * textScale }]}>
            {t.publicationSent}
          </Text>
          <Pressable
            style={[styles.againButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowConfirmation(false)}
          >
            <Text style={{ color: colors.background }}>{t.publishAgain}</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {t.shareHappiness}
        </Text>

        {!media ? (
          <Pressable style={[styles.photoArea, { borderColor: colors.border }]} onPress={pickMedia}>
            <Camera size={28} color={colors.primary} />
            <Text style={{ color: colors.primary, marginTop: 8 }}>
              {t.addPhoto} / Vidéo
            </Text>
          </Pressable>
        ) : (
          <View style={styles.previewWrap}>
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.videoPreview}>
                <Video size={32} color="white" />
                <Text style={{ color: 'white', marginTop: 6 }}>Vidéo sélectionnée</Text>
              </View>
            )}
            <Pressable style={styles.removeBtn} onPress={() => setMedia(null)}>
              <X size={18} color="white" />
            </Pressable>
          </View>
        )}

        <TextInput
          style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
          placeholder={t.writeMessage}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />

        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Send size={18} color={colors.background} />
          <Text style={{ color: colors.background }}>{t.publishBtn}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  photoArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  videoPreview: {
    height: 220,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
  },
  submitBtnDisabled: { opacity: 0.4 },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmTitle: {
    fontWeight: '700',
    marginVertical: 16,
  },
  againButton: {
    padding: 14,
    borderRadius: 12,
  },
});
