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
  Send, Camera, X, Video, Bot, Zap, Target, TrendingUp, Eye,
  CheckCircle, AlertCircle, ChevronRight, RefreshCw,
} from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';
import { useApp } from '@/providers/AppProvider';
import { generateAIAnalysis } from '@/providers/AppProvider';
import { AIAnalysisResult, AIGrade } from '@/types';

const SUPABASE_URL = 'https://bfhtygvwmntcrdjyhdvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j4gif7kSrdaxyPOhW0qsuQ_0EnBNwqU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Step = 'form' | 'analyzing' | 'result' | 'done';

const GRADE_CONFIG: Record<AIGrade, { label: string; color: string; bg: string }> = {
  excellent: { label: 'Excellent', color: '#4ADE80', bg: '#052E16' },
  good: { label: 'Bon', color: '#60A5FA', bg: '#0C1A2E' },
  average: { label: 'Moyen', color: '#FBBF24', bg: '#231A04' },
  poor: { label: 'À améliorer', color: '#F87171', bg: '#2A0808' },
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 1200, useNativeDriver: false }).start();
  }, [score]);

  return (
    <View style={scoreRingStyles.wrap}>
      <View style={[scoreRingStyles.ring, { borderColor: color + '30' }]}>
        <View style={[scoreRingStyles.ringInner, { borderColor: color }]} />
        <View style={scoreRingStyles.scoreCenter}>
          <Animated.Text style={[scoreRingStyles.scoreNum, { color }]}>
            {score}
          </Animated.Text>
          <Text style={scoreRingStyles.scoreLabel}>/100</Text>
        </View>
      </View>
    </View>
  );
}

const scoreRingStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringInner: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  scoreCenter: { alignItems: 'center' },
  scoreNum: { fontSize: 30, fontWeight: '800' as const },
  scoreLabel: { fontSize: 11, color: '#6B7280', marginTop: -2 },
});

function MetricBar({ label, value, max = 10, color }: { label: string; value: number; max?: number; color: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animVal, { toValue: value / max, duration: 900, useNativeDriver: false }).start();
  }, [value, max]);

  return (
    <View style={metricStyles.row}>
      <Text style={metricStyles.label}>{label}</Text>
      <View style={metricStyles.barBg}>
        <Animated.View style={[metricStyles.barFill, { backgroundColor: color, width: animVal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={[metricStyles.val, { color }]}>{value}/{max}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontSize: 12, color: '#9CA3AF', width: 70 },
  barBg: { flex: 1, height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  val: { fontSize: 12, fontWeight: '700' as const, width: 32, textAlign: 'right' },
});

export default function PublishScreen() {
  const { addPublication, colors, t, textScale } = useApp();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'analyzing') {
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

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
    }
  }, []);

  const uploadToSupabase = async (uri: string, type: 'image' | 'video') => {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = type === 'video' ? 'mp4' : 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';
    const { error } = await supabase.storage.from('videos').upload(fileName, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAnalyze = useCallback(async () => {
    if (!text.trim() && !media) {
      Alert.alert(t.contentRequired, t.contentRequiredMsg);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('analyzing');

    await new Promise(res => setTimeout(res, 2200));

    const result = generateAIAnalysis(text, !!media, media?.type === 'video');
    setAnalysis(result);
    setStep('result');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [text, media, t]);

  const handlePublish = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      let mediaUrl: string | undefined;
      if (media) {
        try {
          mediaUrl = await uploadToSupabase(media.uri, media.type);
        } catch (e) {
          console.log('Seranova: Upload failed, publishing without media URL:', e);
        }
      }
      addPublication(text.trim(), mediaUrl, media?.type === 'video', analysis ?? undefined);
      setStep('done');
    } catch (e) {
      console.log('Seranova: Publish error:', e);
      Alert.alert('Erreur', 'Impossible de publier. Réessayez.');
    }
  }, [text, media, analysis, addPublication]);

  const handleReset = useCallback(() => {
    setText('');
    setMedia(null);
    setAnalysis(null);
    setStep('form');
  }, []);

  if (step === 'analyzing') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.analyzingCard, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.botIconWrap}>
            <Bot size={36} color="#818CF8" />
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

  if (step === 'result' && analysis) {
    const gradeCfg = GRADE_CONFIG[analysis.grade];
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.resultHeader, { backgroundColor: gradeCfg.bg, borderColor: gradeCfg.color + '40' }]}>
            <View style={styles.resultHeaderTop}>
              <View style={[styles.botBadge, { backgroundColor: '#1E1B4B' }]}>
                <Bot size={14} color="#818CF8" />
                <Text style={styles.botBadgeText}>{t.aiAnalysisTitle}</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: gradeCfg.color + '20' }]}>
                <Text style={[styles.gradeBadgeText, { color: gradeCfg.color }]}>{gradeCfg.label}</Text>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <ScoreRing score={analysis.score} color={gradeCfg.color} />
              <View style={styles.scoreInfo}>
                <Text style={[styles.scoreInfoTitle, { color: gradeCfg.color }]}>{t.aiScore}</Text>
                <View style={styles.pillRow}>
                  <View style={[styles.pill, { backgroundColor: analysis.hook ? '#052E16' : '#2A0808' }]}>
                    {analysis.hook
                      ? <CheckCircle size={11} color="#4ADE80" />
                      : <AlertCircle size={11} color="#F87171" />}
                    <Text style={[styles.pillText, { color: analysis.hook ? '#4ADE80' : '#F87171' }]}>
                      {analysis.hook ? t.aiHook : t.aiNoHook}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: analysis.callToAction ? '#052E16' : '#2A0808' }]}>
                    {analysis.callToAction
                      ? <CheckCircle size={11} color="#4ADE80" />
                      : <AlertCircle size={11} color="#F87171" />}
                    <Text style={[styles.pillText, { color: analysis.callToAction ? '#4ADE80' : '#F87171' }]}>
                      {analysis.callToAction ? t.aiCTA : t.aiNoCTA}
                    </Text>
                  </View>
                </View>
                <View style={[styles.retentionWrap, { backgroundColor: colors.surface }]}>
                  <Eye size={13} color={colors.textMuted} />
                  <Text style={[styles.retentionText, { color: colors.textSecondary }]}>
                    {t.aiRetention} : <Text style={{ color: gradeCfg.color, fontWeight: '700' }}>{analysis.estimatedRetention}%</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.metricsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Métriques MAB</Text>
            <MetricBar label={t.aiClarity} value={analysis.clarity} color="#60A5FA" />
            <MetricBar label={t.aiStructure} value={analysis.structure} color="#818CF8" />
            <MetricBar label="Rétention" value={Math.round(analysis.estimatedRetention / 10)} color="#4ADE80" />
          </View>

          <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.feedbackCardHeader}>
              <Target size={16} color="#FBBF24" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.aiFeedbacks}</Text>
            </View>
            {analysis.feedbacks.map((fb, i) => (
              <View key={i} style={[styles.feedbackItem, { borderLeftColor: '#FBBF2440' }]}>
                <View style={[styles.feedbackDot, { backgroundColor: '#FBBF24' }]} />
                <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{fb}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={[styles.publishBtn, { backgroundColor: gradeCfg.color }]}
              onPress={handlePublish}
            >
              <Send size={18} color="#000" />
              <Text style={styles.publishBtnText}>{t.publishBtn}</Text>
            </Pressable>
            <Pressable style={[styles.retryBtn, { borderColor: colors.border }]} onPress={() => setStep('form')}>
              <RefreshCw size={16} color={colors.textSecondary} />
              <Text style={[styles.retryBtnText, { color: colors.textSecondary }]}>Modifier le contenu</Text>
            </Pressable>
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    );
  }

  if (step === 'done') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.doneCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.doneIconWrap, { backgroundColor: '#052E16' }]}>
            <CheckCircle size={48} color="#4ADE80" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>{t.publicationSent}</Text>
          <Text style={[styles.doneDesc, { color: colors.textSecondary }]}>{t.publicationSentMsg}</Text>
          {analysis && (
            <View style={[styles.doneSummary, { backgroundColor: GRADE_CONFIG[analysis.grade].bg }]}>
              <TrendingUp size={14} color={GRADE_CONFIG[analysis.grade].color} />
              <Text style={[styles.doneSummaryText, { color: GRADE_CONFIG[analysis.grade].color }]}>
                Score MAB : {analysis.score}/100 — {GRADE_CONFIG[analysis.grade].label}
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
          <View style={[styles.aiHint, { backgroundColor: '#1E1B4B', borderColor: '#4338CA40' }]}>
            <Bot size={13} color="#818CF8" />
            <Text style={styles.aiHintText}>Analyse IA automatique après soumission</Text>
          </View>
        </View>

        {!media ? (
          <Pressable style={[styles.photoArea, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={pickMedia}>
            <View style={[styles.photoAreaIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Camera size={26} color={colors.primary} />
            </View>
            <Text style={[styles.photoAreaLabel, { color: colors.text }]}>{t.addPhoto}</Text>
            <Text style={[styles.photoAreaSub, { color: colors.textMuted }]}>Photo, vidéo, Reels, TikTok...</Text>
          </Pressable>
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
                  <Text style={styles.videoBadgeText}>Pipeline IA activé</Text>
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

        <View style={[styles.mabHint, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.mabHintLabel, { color: colors.textMuted }]}>SCORE MAB — À optimiser</Text>
          <View style={styles.mabPillRow}>
            {['Clarté', 'Action', 'Progression', 'Sens'].map(p => (
              <View key={p} style={[styles.mabPill, { borderColor: colors.border }]}>
                <Text style={[styles.mabPillText, { color: colors.textMuted }]}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !text.trim() && !media && styles.submitBtnDisabled]}
          onPress={handleAnalyze}
          disabled={!text.trim() && !media}
        >
          <Bot size={18} color={colors.background} />
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
  heading: { fontWeight: '700' as const },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  aiHintText: { fontSize: 12, color: '#818CF8', fontWeight: '500' as const },

  photoArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  photoAreaIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  photoAreaLabel: { fontSize: 15, fontWeight: '600' as const },
  photoAreaSub: { fontSize: 12 },

  previewWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  previewImage: { width: '100%', height: 220 },
  videoPreview: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  videoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewLabel: { color: 'white', fontSize: 14, fontWeight: '500' as const },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  videoBadgeText: { color: '#818CF8', fontSize: 11, fontWeight: '600' as const },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },

  textInput: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
    lineHeight: 22,
  },

  mabHint: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  mabHintLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  mabPillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const },
  mabPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  mabPillText: { fontSize: 11, fontWeight: '500' as const },

  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 17,
    borderRadius: 16,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700' as const },

  analyzingCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  botIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  analyzingTitle: { fontSize: 20, fontWeight: '700' as const },
  analyzingDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  analyzingDots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  resultHeader: {
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  resultHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  botBadgeText: { fontSize: 12, color: '#818CF8', fontWeight: '600' as const },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  gradeBadgeText: { fontSize: 13, fontWeight: '700' as const },
  scoreRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  scoreInfo: { flex: 1, gap: 10 },
  scoreInfoTitle: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: { fontSize: 10, fontWeight: '600' as const },
  retentionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  retentionText: { fontSize: 12 },

  metricsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  feedbackCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  feedbackCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  feedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  feedbackText: { fontSize: 13, lineHeight: 20, flex: 1 },

  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  publishBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  publishBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#000' },
  retryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14, fontWeight: '500' as const },

  doneCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  doneIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  doneTitle: { fontSize: 22, fontWeight: '800' as const },
  doneDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  doneSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  doneSummaryText: { fontSize: 13, fontWeight: '600' as const },

  bottomSpacer: { height: 40 },
});
