import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Send, Camera, X, Video, Bot, AlertTriangle, ShieldCheck,
  ShieldAlert, ShieldOff, ChevronRight, RefreshCw, Shield, Zap,
  Upload,
} from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import { generateAIAnalysis } from '@/providers/AppProvider';
import { AIAnalysisResult, AIGrade } from '@/types';
import { CATEGORY_LABELS, DANGER_LEVEL_CONFIG } from '@/utils/contentFilter';
import type { ToxicityCategory } from '@/utils/contentFilter';
import { useUploadMedia } from '@/hooks/useUploadMedia';

type Step = 'form' | 'analyzing' | 'uploading' | 'result' | 'done';

const GRADE_CONFIG: Record<AIGrade, { label: string; color: string; bg: string; borderColor: string }> = {
  safe: { label: 'Contenu sûr', color: '#4ADE80', bg: '#052E16', borderColor: '#16A34A' },
  warning: { label: 'Avertissement', color: '#FBBF24', bg: '#231A04', borderColor: '#D97706' },
  dangerous: { label: 'Contenu dangereux', color: '#FB923C', bg: '#2A1000', borderColor: '#EA580C' },
  critical: { label: 'Contenu critique', color: '#EF4444', bg: '#3A0000', borderColor: '#DC2626' },
};

function SafetyScoreRing({ score, grade }: { score: number; grade: AIGrade }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const cfg = GRADE_CONFIG[grade];

  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 1200, useNativeDriver: false }).start();
  }, [score]);

  const isSafe = grade === 'safe';

  return (
    <View style={ringStyles.wrap}>
      <View style={[ringStyles.ring, { borderColor: cfg.color + '30' }]}>
        <View style={[ringStyles.ringInner, { borderColor: cfg.color }]} />
        <View style={ringStyles.center}>
          {isSafe ? (
            <ShieldCheck size={28} color={cfg.color} />
          ) : (
            <ShieldAlert size={28} color={cfg.color} />
          )}
          <Animated.Text style={[ringStyles.score, { color: cfg.color }]}>
            {score}
          </Animated.Text>
          <Text style={ringStyles.scoreLabel}>/100</Text>
        </View>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringInner: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  center: { alignItems: 'center', gap: 2 },
  score: { fontSize: 26, fontWeight: '800' as const, marginTop: 2 },
  scoreLabel: { fontSize: 11, color: '#6B7280', marginTop: -3 },
});

export default function PublishScreen() {
  const { addPublication, colors, t, textScale } = useApp();
  const { upload, isUploading, error: uploadError, reset: resetUpload } = useUploadMedia();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'analyzing' || step === 'uploading') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [step, pulseAnim]);

  useEffect(() => {
    if (step === 'result' || step === 'done') {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [step]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia({ uri: result.assets[0].uri, type: 'image' });
    }
  }, []);

  const pickVideo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia({ uri: result.assets[0].uri, type: 'video' });
    }
  }, []);

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim() && !media) {
      Alert.alert(t.contentRequired, t.contentRequiredMsg);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('analyzing');

    await new Promise(res => setTimeout(res, 2000));

    const result = generateAIAnalysis(text, !!media, media?.type === 'video');
    setAnalysis(result);
    setStep('result');

    if (result.grade === 'safe') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (result.grade === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [text, media, t]);

  const handlePublish = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep('uploading');
      let mediaUrl: string | undefined;

      if (media) {
        try {
          const result = await upload(media.uri, media.type);
          mediaUrl = result.publicUrl;
          console.log('Seranova: Media uploaded and saved to media_items:', mediaUrl.slice(0, 80));
        } catch (e) {
          console.log('Seranova: Upload failed, continuing without media URL:', e);
          const errMsg = e instanceof Error ? e.message : 'Erreur upload';
          Alert.alert(
            'Erreur upload',
            `${errMsg}\n\nLa publication sera créée sans média.`,
            [{ text: 'Continuer', onPress: () => {} }]
          );
        }
      }

      addPublication(text.trim(), mediaUrl, media?.type === 'video', analysis ?? undefined);
      setStep('done');
    } catch (e) {
      console.log('Seranova: Publish error:', e);
      setStep('result');
      Alert.alert('Erreur', 'Impossible de publier. Réessayez.');
    }
  }, [text, media, analysis, addPublication, upload]);

  const handleReset = useCallback(() => {
    setText('');
    setMedia(null);
    setAnalysis(null);
    resetUpload();
    setStep('form');
  }, [resetUpload]);

  if (step === 'analyzing') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.analyzingCard, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.botIconWrap, { backgroundColor: '#1E1B4B' }]}>
            <Shield size={36} color="#818CF8" />
          </View>
          <Text style={[styles.analyzingTitle, { color: colors.text }]}>{t.aiAnalyzing}</Text>
          <Text style={[styles.analyzingDesc, { color: colors.textSecondary }]}>{t.aiAnalyzingDesc}</Text>
          <View style={styles.analyzingDots}>
            {[0, 1, 2].map(i => (
              <BounceDot key={i} delay={i * 200} color="#818CF8" />
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  if (step === 'uploading') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.analyzingCard, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.botIconWrap, { backgroundColor: '#0C1A2E' }]}>
            <Upload size={36} color="#38BDF8" />
          </View>
          <Text style={[styles.analyzingTitle, { color: colors.text }]}>Upload en cours…</Text>
          <Text style={[styles.analyzingDesc, { color: colors.textSecondary }]}>
            Envoi du fichier vers le serveur sécurisé
          </Text>
          <View style={styles.analyzingDots}>
            {[0, 1, 2].map(i => (
              <BounceDot key={i} delay={i * 200} color="#38BDF8" />
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  if (step === 'result' && analysis) {
    const gradeCfg = GRADE_CONFIG[analysis.grade];
    const dangerCfg = DANGER_LEVEL_CONFIG[analysis.dangerLevel];
    const isBlocked = analysis.recommendation === 'block';
    const isSafe = analysis.grade === 'safe';

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={[styles.resultHeader, { backgroundColor: gradeCfg.bg, borderColor: gradeCfg.borderColor + '50' }]}>
            <View style={styles.resultHeaderTop}>
              <View style={[styles.analysisBadge, { backgroundColor: '#1E1B4B' }]}>
                <Shield size={13} color="#818CF8" />
                <Text style={styles.analysisBadgeText}>{t.aiAnalysisTitle}</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: gradeCfg.color + '20', borderColor: gradeCfg.color + '40' }]}>
                <Text style={[styles.gradeBadgeText, { color: gradeCfg.color }]}>{gradeCfg.label}</Text>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <SafetyScoreRing score={analysis.score} grade={analysis.grade} />
              <View style={styles.scoreInfo}>
                <Text style={[styles.scoreInfoLabel, { color: colors.textMuted }]}>{t.aiScore}</Text>
                <View style={[styles.dangerLevelPill, { backgroundColor: dangerCfg.color + '20' }]}>
                  <Text style={[styles.dangerLevelText, { color: dangerCfg.color }]}>
                    Niveau {dangerCfg.label}
                  </Text>
                </View>
                <View style={[styles.recommendationPill, {
                  backgroundColor: isBlocked ? '#3A0000' : isSafe ? '#052E16' : '#231A04',
                }]}>
                  {isBlocked ? (
                    <ShieldOff size={12} color="#EF4444" />
                  ) : isSafe ? (
                    <ShieldCheck size={12} color="#4ADE80" />
                  ) : (
                    <ShieldAlert size={12} color="#FBBF24" />
                  )}
                  <Text style={[styles.recommendationText, {
                    color: isBlocked ? '#EF4444' : isSafe ? '#4ADE80' : '#FBBF24',
                  }]}>
                    {dangerCfg.recommendation}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {analysis.categories.length > 0 && (
            <View style={[styles.categoriesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Catégories détectées</Text>
              <View style={styles.categoriesGrid}>
                {analysis.categories.map((cat: ToxicityCategory) => {
                  const catCfg = CATEGORY_LABELS[cat];
                  return (
                    <View key={cat} style={[styles.categoryItem, { backgroundColor: catCfg.bg, borderColor: catCfg.color + '30' }]}>
                      <View style={[styles.categoryDot, { backgroundColor: catCfg.color }]} />
                      <Text style={[styles.categoryItemText, { color: catCfg.color }]}>{catCfg.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {isSafe && (
            <View style={[styles.safeCard, { backgroundColor: '#052E16', borderColor: '#16A34A40' }]}>
              <ShieldCheck size={22} color="#4ADE80" />
              <View style={styles.safeCardText}>
                <Text style={styles.safeCardTitle}>Contenu sûr</Text>
                <Text style={styles.safeCardDesc}>Aucun contenu problématique détecté. Votre message respecte les règles de la communauté.</Text>
              </View>
            </View>
          )}

          <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.feedbackCardHeader}>
              <Bot size={16} color="#818CF8" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.aiFeedbacks}</Text>
            </View>
            {analysis.feedbacks.map((fb, i) => (
              <View key={i} style={[styles.feedbackItem, { borderLeftColor: gradeCfg.color + '40' }]}>
                <View style={[styles.feedbackDot, { backgroundColor: gradeCfg.color }]} />
                <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{fb}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isBlocked ? (
              <>
                <View style={[styles.blockedBanner, { backgroundColor: '#3A0000', borderColor: '#DC262640' }]}>
                  <ShieldOff size={18} color="#EF4444" />
                  <Text style={styles.blockedBannerText}>
                    Ce contenu a été automatiquement bloqué. Veuillez modifier votre message avant de publier.
                  </Text>
                </View>
                <Pressable style={[styles.retryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setStep('form')}>
                  <RefreshCw size={16} color={colors.textSecondary} />
                  <Text style={[styles.retryBtnText, { color: colors.textSecondary }]}>Modifier le contenu</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.publishBtn, { backgroundColor: gradeCfg.color }, isUploading && styles.submitBtnDisabled]}
                  onPress={handlePublish}
                  disabled={isUploading}
                >
                  <Send size={18} color="#000" />
                  <Text style={styles.publishBtnText}>
                    {isUploading ? 'Upload...' : t.publishBtn}
                  </Text>
                </Pressable>
                <Pressable style={[styles.retryBtn, { borderColor: colors.border }]} onPress={() => setStep('form')}>
                  <RefreshCw size={16} color={colors.textSecondary} />
                  <Text style={[styles.retryBtnText, { color: colors.textSecondary }]}>Modifier le contenu</Text>
                </Pressable>
                {analysis.grade === 'warning' && (
                  <Text style={[styles.warningNote, { color: colors.textMuted }]}>
                    ⚠️ Ce contenu sera soumis à révision manuelle avant publication.
                  </Text>
                )}
              </>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    );
  }

  if (step === 'done') {
    const gradeCfg = analysis ? GRADE_CONFIG[analysis.grade] : GRADE_CONFIG.safe;
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.doneCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.doneIconWrap, { backgroundColor: '#052E16' }]}>
            <ShieldCheck size={48} color="#4ADE80" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>{t.publicationSent}</Text>
          <Text style={[styles.doneDesc, { color: colors.textSecondary }]}>{t.publicationSentMsg}</Text>
          {analysis && (
            <View style={[styles.doneSummary, { backgroundColor: gradeCfg.bg, borderColor: gradeCfg.borderColor + '40' }]}>
              <Shield size={14} color={gradeCfg.color} />
              <Text style={[styles.doneSummaryText, { color: gradeCfg.color }]}>
                Sécurité : {gradeCfg.label} — Score nocivité {analysis.score}/100
              </Text>
            </View>
          )}
          <Pressable style={[styles.publishBtn, { backgroundColor: colors.primary, marginTop: 20 }]} onPress={handleReset}>
            <Text style={[styles.publishBtnText, { color: colors.background }]}>{t.publishAgain}</Text>
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Text style={[styles.heading, { color: colors.text, fontSize: 22 * textScale }]}>
            {t.shareHappiness}
          </Text>
          <View style={[styles.safetyHint, { backgroundColor: '#1E1B4B', borderColor: '#4338CA40' }]}>
            <Shield size={13} color="#818CF8" />
            <Text style={styles.safetyHintText}>Analyse de sécurité automatique avant publication</Text>
          </View>
        </View>

        {!media ? (
          <View style={styles.mediaPickerRow}>
            <Pressable
              style={[styles.mediaPickerBtn, { borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
              onPress={pickImage}
            >
              <View style={[styles.mediaPickerIcon, { backgroundColor: colors.primaryLight }]}>
                <Camera size={22} color={colors.primary} />
              </View>
              <Text style={[styles.mediaPickerLabel, { color: colors.text }]}>Image</Text>
              <Text style={[styles.mediaPickerSub, { color: colors.textMuted }]}>JPG / PNG</Text>
            </Pressable>
            <Pressable
              style={[styles.mediaPickerBtn, { borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
              onPress={pickVideo}
            >
              <View style={[styles.mediaPickerIcon, { backgroundColor: '#1E1B4B' }]}>
                <Video size={22} color="#818CF8" />
              </View>
              <Text style={[styles.mediaPickerLabel, { color: colors.text }]}>Vidéo</Text>
              <Text style={[styles.mediaPickerSub, { color: colors.textMuted }]}>MP4 / MOV</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.previewWrap}>
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={[styles.videoPreview, { backgroundColor: '#0A0A0A' }]}>
                <View style={[styles.videoIconWrap, { backgroundColor: '#1E1B4B' }]}>
                  <Video size={28} color="#818CF8" />
                </View>
                <Text style={styles.videoPreviewLabel}>Vidéo sélectionnée</Text>
                <View style={[styles.videoBadge, { backgroundColor: '#818CF840' }]}>
                  <Zap size={11} color="#818CF8" />
                  <Text style={styles.videoBadgeText}>Analyse IA activée</Text>
                </View>
              </View>
            )}
            <Pressable style={styles.removeBtn} onPress={() => setMedia(null)}>
              <X size={18} color="white" />
            </Pressable>
          </View>
        )}

        <TextInput
          style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder={t.writeMessage}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />

        <View style={[styles.safetyInfo, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <AlertTriangle size={13} color={colors.textMuted} />
          <Text style={[styles.safetyInfoText, { color: colors.textMuted }]}>
            Les contenus haineux, violents, sexuels ou traumatisants sont automatiquement détectés et bloqués.
          </Text>
        </View>

        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !text.trim() && !media && styles.submitBtnDisabled]}
          onPress={handleAnalyze}
          disabled={!text.trim() && !media}
        >
          <Shield size={18} color={colors.background} />
          <Text style={[styles.submitBtnText, { color: colors.background }]}>Analyser & Publier</Text>
          <ChevronRight size={16} color={colors.background} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BounceDot({ delay, color }: { delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -8, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: anim }] }]} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  formHeader: { marginBottom: 20, gap: 10 },
  heading: { fontWeight: '800' as const, lineHeight: 30 },
  safetyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  safetyHintText: { color: '#818CF8', fontSize: 12, fontWeight: '500' as const },

  mediaPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mediaPickerBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  mediaPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPickerLabel: { fontSize: 14, fontWeight: '600' as const },
  mediaPickerSub: { fontSize: 11 },

  previewWrap: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 220, borderRadius: 16 },
  videoPreview: {
    height: 160,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  videoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewLabel: { color: '#9CA3AF', fontSize: 13 },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  videoBadgeText: { color: '#818CF8', fontSize: 12 },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },

  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 14,
    lineHeight: 22,
  },

  safetyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
  },
  safetyInfoText: { fontSize: 12, flex: 1, lineHeight: 17 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700' as const },

  analyzingCard: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
  },
  botIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  analyzingTitle: { fontSize: 20, fontWeight: '700' as const, textAlign: 'center' },
  analyzingDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  analyzingDots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  resultHeader: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  resultHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analysisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  analysisBadgeText: { color: '#818CF8', fontSize: 12, fontWeight: '600' as const },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  gradeBadgeText: { fontSize: 13, fontWeight: '700' as const },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreInfo: { flex: 1, gap: 8 },
  scoreInfoLabel: { fontSize: 11, fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  dangerLevelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dangerLevelText: { fontSize: 13, fontWeight: '700' as const },
  recommendationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  recommendationText: { fontSize: 12, fontWeight: '600' as const },

  categoriesCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' as const },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },
  categoryItemText: { fontSize: 13, fontWeight: '600' as const },

  safeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  safeCardText: { flex: 1, gap: 4 },
  safeCardTitle: { color: '#4ADE80', fontSize: 15, fontWeight: '700' as const },
  safeCardDesc: { color: '#86EFAC', fontSize: 13, lineHeight: 18 },

  feedbackCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  feedbackCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  feedbackDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  feedbackText: { fontSize: 13, lineHeight: 20, flex: 1 },

  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  blockedBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  publishBtnText: { color: '#000', fontSize: 16, fontWeight: '700' as const },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600' as const },
  warningNote: { fontSize: 12, textAlign: 'center', lineHeight: 17 },

  doneCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  doneIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  doneTitle: { fontSize: 22, fontWeight: '800' as const, textAlign: 'center' },
  doneDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  doneSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  doneSummaryText: { fontSize: 13, fontWeight: '600' as const },
  bottomSpacer: { height: 40 },
});
