import React, { useCallback, useRef, useEffect, useState } from 'react'
import { View, FlatList, Text, StyleSheet, RefreshControl, Platform, Image, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { Smile, Leaf, Sparkles } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useApp } from '@/providers/AppProvider'
import { PublicationCard } from '@/components/PublicationCard'
import { EmptyState } from '@/components/EmptyState'
import { Publication } from '@/types'
import { supabase } from '@/lib/supabase'

export default function Index() {
  const { approvedPublications, isLoaded, colors, t, textScale } = useApp()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current
  const breatheAnim = useRef(new Animated.Value(0.5)).current

  // ✅ Debug réel : vérifier que Supabase est bien chargé dans l'app
  useEffect(() => {
    console.log('Seranova: Supabase URL:', supabase?.url)
    console.log('Seranova: approvedPublications count:', approvedPublications?.length)
  }, [approvedPublications])

  useEffect(() => {
    if (isLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start()
    }
  }, [isLoaded, fadeAnim, slideAnim])

  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0.5, duration: 4000, useNativeDriver: true }),
      ])
    )
    breathing.start()
    return () => breathing.stop()
  }, [breatheAnim])

  const handleReport = useCallback((id: string) => {
    router.push({ pathname: '/report' as any, params: { publicationId: id } })
  }, [router])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 600)
  }, [])

  const renderItem = useCallback(({ item }: { item: Publication }) => {
    console.log('Seranova: rendering publication:', item.id)
    return (
      <PublicationCard
        publication={item}
        showReportButton
        showReactions
        onReport={handleReport}
      />
    )
  }, [handleReport])

  const renderHeader = useCallback(() => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <LinearGradient
        colors={[colors.surfaceLight, colors.background]}
        style={styles.header}
      >
        <Animated.View
          style={[
            styles.breatheOrb,
            {
              opacity: breatheAnim,
              backgroundColor: colors.glow,
              transform: [
                {
                  scale: breatheAnim.interpolate({
                    inputRange: [0.5, 1],
                    outputRange: [0.9, 1.1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        />
        <View style={styles.headerDecorLeft} pointerEvents="none">
          <Leaf size={100} color={colors.primary} />
        </View>
        <View style={styles.headerDecorRight} pointerEvents="none">
          <Sparkles size={50} color={colors.accent} />
        </View>
        <View style={styles.headerLogoRow}>
          <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
          <View>
            <Text style={[styles.welcomeLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
              {t.welcomeTo}
            </Text>
            <Text style={[styles.appName, { color: colors.primary, fontSize: 26 * textScale }]}>
              {t.appName}
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
          {t.positiveSpace}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{t.algorithmFree}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{t.noAds}</Text>
          </View>
        </View>
        <View style={[styles.glowLine, { backgroundColor: colors.border }]} />
      </LinearGradient>
    </Animated.View>
  ), [fadeAnim, slideAnim, breatheAnim, colors, t, textScale])

  const renderEmpty = useCallback(() => (
    <EmptyState
      icon={<Smile size={48} color={colors.primary} />}
      title={t.noPublications}
      message={t.noPublicationsMsg}
    />
  ), [colors, t])

  const keyExtractor = useCallback((item: Publication) => item.id, [])

  if (!isLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Leaf size={32} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t.loading}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={approvedPublications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16 },
  listContent: { paddingBottom: 20 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, overflow: 'hidden' },
  breatheOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -40, top: -40 },
  headerDecorLeft: { position: 'absolute', right: -20, top: -15, opacity: 0.06, transform: [{ rotate: '-20deg' }] },
  headerDecorRight: { position: 'absolute', left: 10, bottom: 10, opacity: 0.04, transform: [{ rotate: '15deg' }] },
  headerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerLogo: { width: 48, height: 48, resizeMode: 'contain' },
  welcomeLabel: { marginBottom: 2 },
  appName: { fontWeight: '800' as const },
  subtitle: { lineHeight: 20 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '500' as const },
  glowLine: { height: 1, marginTop: 16, opacity: 0.6 },
})