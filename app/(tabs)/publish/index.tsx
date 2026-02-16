import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Send, Camera, CheckCircle, X, Leaf, Sparkles } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import { INSPIRING_IMAGES_FOR_PUBLISH } from '@/mocks/publications';

export default function PublishScreen() {
  const { addPublication, colors, t, textScale } = useApp();
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmFade = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (showConfirmation) {
      Animated.parallel([
        Animated.timing(confirmFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(confirmScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    } else {
      confirmFade.setValue(0);
      confirmScale.setValue(0.9);
    }
  }, [showConfirmation, confirmFade, confirmScale]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('MAB: Image picker error:', error);
      Alert.alert(t.error, "Impossible de sélectionner l'image.");
    }
  }, [t]);

  const handleSelectPreset = useCallback((url: string) => {
    setSelectedImage(prev => prev === url ? null : url);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!text.trim() && !selectedImage) {
      Alert.alert(t.contentRequired, t.contentRequiredMsg);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addPublication(text.trim(), selectedImage || undefined);
    setText('');
    setSelectedImage(null);
    setShowConfirmation(true);
    console.log('MAB: Publication submitted for review');
  }, [text, selectedImage, addPublication, t]);

  const handlePublishAgain = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  const canSubmit = !!(text.trim() || selectedImage);

  if (showConfirmation) {
    return (
      <View style={[styles.confirmContainer, { backgroundColor: colors.background }]}>
        <View style={styles.confirmLeafDecor} pointerEvents="none">
          <Leaf size={100} color={colors.primary} />
        </View>
        <View style={styles.confirmSparkle} pointerEvents="none">
          <Sparkles size={40} color={colors.accent} />
        </View>
        <Animated.View style={[styles.confirmCard, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: confirmFade,
          transform: [{ scale: confirmScale }],
        }]}>
          <View style={styles.confirmIconWrap}>
            <CheckCircle size={56} color={colors.success} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.text, fontSize: 22 * textScale }]}>
            {t.publicationSent}
          </Text>
          <Text style={[styles.confirmMessage, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
            {t.publicationSentMsg}
          </Text>
          <Pressable
            style={[styles.againButton, { backgroundColor: colors.primary }]}
            onPress={handlePublishAgain}
            testID="publish-again"
          >
            <Text style={[styles.againButtonText, { color: colors.background }]}>{t.publishAgain}</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.heading, { color: colors.text, fontSize: 24 * textScale }]}>
          {t.shareHappiness}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary, fontSize: 13 * textScale }]}>
          {t.verifiedByMod}
        </Text>

        {!selectedImage ? (
          <Pressable
            style={[styles.photoArea, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
            onPress={handlePickImage}
            testID="photo-area"
          >
            <View style={[styles.photoIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Camera size={28} color={colors.primary} />
            </View>
            <Text style={[styles.photoAreaTitle, { color: colors.primary }]}>{t.addPhoto}</Text>
            <Text style={[styles.photoAreaHint, { color: colors.textMuted }]}>{t.selectFromGallery}</Text>
          </Pressable>
        ) : (
          <View style={[styles.previewWrap, { borderColor: colors.border }]}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              contentFit="cover"
              transition={200}
            />
            <Pressable style={styles.removeBtn} onPress={handleRemoveImage}>
              <X size={18} color={colors.white} />
            </Pressable>
          </View>
        )}

        <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>{t.inspiringImages}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetList}
        >
          {INSPIRING_IMAGES_FOR_PUBLISH.map((img) => (
            <Pressable
              key={img.id}
              style={[
                styles.presetItem,
                { borderColor: selectedImage === img.url ? colors.primary : colors.border },
              ]}
              onPress={() => handleSelectPreset(img.url)}
            >
              <Image
                source={{ uri: img.url }}
                style={styles.presetImage}
                contentFit="cover"
              />
              <Text style={[styles.presetItemLabel, { color: colors.textSecondary }]}>{img.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.inputLabel, { color: colors.text, fontSize: 15 * textScale }]}>
          {t.yourMessage} {selectedImage ? t.optional : ''}
        </Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text, fontSize: 15 * textScale }]}
            placeholder={t.writeMessage}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
            testID="publish-text-input"
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>{text.length}/500</Text>
        </View>

        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="submit-publication"
        >
          <Send size={18} color={colors.background} />
          <Text style={[styles.submitBtnText, { color: colors.background }]}>{t.publishBtn}</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heading: {
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subheading: {
    marginBottom: 24,
    lineHeight: 18,
  },
  photoArea: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 36,
    alignItems: 'center',
    marginBottom: 20,
  },
  photoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoAreaTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  photoAreaHint: {
    fontSize: 13,
  },
  previewWrap: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  presetLabel: {
    fontSize: 13,
    marginBottom: 12,
  },
  presetList: {
    paddingBottom: 4,
  },
  presetItem: {
    marginRight: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
  },
  presetImage: {
    width: 90,
    height: 70,
    borderRadius: 12,
  },
  presetItemLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  inputLabel: {
    fontWeight: '600' as const,
    marginTop: 24,
    marginBottom: 10,
  },
  inputWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  textInput: {
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmLeafDecor: {
    position: 'absolute',
    right: 20,
    top: 120,
    opacity: 0.05,
    transform: [{ rotate: '30deg' }],
  },
  confirmSparkle: {
    position: 'absolute',
    left: 30,
    top: 200,
    opacity: 0.04,
  },
  confirmCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
  },
  confirmIconWrap: {
    marginBottom: 20,
  },
  confirmTitle: {
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  confirmMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  againButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  againButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomSpacer: {
    height: 40,
  },
});
