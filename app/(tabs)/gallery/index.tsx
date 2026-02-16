import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions,
  Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Play, VolumeX, Volume2, Film, Leaf, Sparkles, RotateCcw } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import { EmptyState } from '@/components/EmptyState';
import { DEMO_VIDEOS } from '@/mocks/publications';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 420);

interface VideoFeedItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  authorName: string;
}

interface VideoCardProps {
  item: VideoFeedItem;
  isActive: boolean;
  onPress: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const VideoCard = React.memo(({
  item,
  isActive,
  onPress,
  isMuted,
  onToggleMute,
}: VideoCardProps) => {
  const { colors, t, textScale } = useApp();
  const videoRef = useRef<Video>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [isActive]);

  const handleStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);
      setHasError(false);
    } else if ('error' in status && status.error) {
      console.log('MAB: Video playback error:', status.error);
      setHasError(true);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.playAsync().catch(() => setHasError(true));
    }
  }, []);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.card, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      transform: [{ scale: scaleAnim }],
    }]}>
      <View style={styles.videoWrapper}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.videoContainer}
        >
          {isActive && !hasError ? (
            <Video
              ref={videoRef}
              source={{ uri: item.videoUrl }}
              posterSource={{ uri: item.thumbnailUrl }}
              usePoster
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isMuted={isMuted}
              isLooping
              onPlaybackStatusUpdate={handleStatusUpdate}
            />
          ) : (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.video}
              contentFit="cover"
              transition={200}
            />
          )}

          <View style={styles.videoOverlay} pointerEvents="none">
            {(!isActive || !isPlaying) && !isBuffering && !hasError ? (
              <View style={[styles.playIconCircle, { borderColor: `${colors.primary}40` }]}>
                <Play size={26} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            ) : null}
            {isBuffering && isActive ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : null}
          </View>

          {hasError ? (
            <View style={styles.errorOverlay}>
              <Text style={[styles.errorText, { color: colors.danger, fontSize: 13 * textScale }]}>
                {t.videoUnavailable}
              </Text>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={handleRetry}
              >
                <RotateCcw size={14} color={colors.background} />
                <Text style={[styles.retryText, { color: colors.background }]}>{t.retryVideo}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.bottomGradient}>
            <Text style={styles.overlayAuthor}>{item.authorName}</Text>
            <Text style={styles.overlayTitle} numberOfLines={1}>{item.title}</Text>
          </View>
        </Pressable>

        {isActive && isPlaying ? (
          <Pressable style={[styles.muteBtn, { borderColor: `${colors.primary}30` }]} onPress={onToggleMute}>
            {isMuted ? (
              <VolumeX size={16} color="#FFFFFF" />
            ) : (
              <Volume2 size={16} color="#FFFFFF" />
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.footerDescription, { color: colors.textSecondary, fontSize: 14 * textScale }]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </Animated.View>
  );
});

export default function VideosScreen() {
  const { videoPublications, colors, t, textScale } = useApp();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const feedItems: VideoFeedItem[] = useMemo(() => {
    const demoItems: VideoFeedItem[] = DEMO_VIDEOS.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      authorName: v.authorName,
    }));

    const communityItems: VideoFeedItem[] = videoPublications.map(p => ({
      id: p.id,
      title: p.authorName,
      description: p.text,
      videoUrl: p.videoUrl!,
      thumbnailUrl: p.imageUrl || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
      authorName: p.authorName,
    }));

    return [...demoItems, ...communityItems];
  }, [videoPublications]);

  const handleVideoPress = useCallback((id: string) => {
    setActiveVideoId(prev => prev === id ? null : id);
    console.log('MAB: Video toggled:', id);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const renderItem = useCallback(({ item }: { item: VideoFeedItem }) => (
    <VideoCard
      item={item}
      isActive={activeVideoId === item.id}
      onPress={() => handleVideoPress(item.id)}
      isMuted={isMuted}
      onToggleMute={handleToggleMute}
    />
  ), [activeVideoId, isMuted, handleVideoPress, handleToggleMute]);

  const keyExtractor = useCallback((item: VideoFeedItem) => item.id, []);

  if (feedItems.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={<Film size={48} color={colors.primary} />}
          title={t.noVideos}
          message={t.noVideosMsg}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerDecorLeft} pointerEvents="none">
          <Leaf size={60} color={colors.primary} />
        </View>
        <View style={styles.headerDecorRight} pointerEvents="none">
          <Sparkles size={30} color={colors.accent} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 22 * textScale }]}>{t.inspiringVideos}</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary, fontSize: 13 * textScale }]}>{t.videosSub}</Text>
      </View>
      <FlatList
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        removeClippedSubviews={Platform.OS !== 'web'}
        testID="videos-feed"
      />
    </View>
  );
}

const Separator = React.memo(() => <View style={styles.separator} />);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  headerDecorLeft: {
    position: 'absolute',
    right: -5,
    top: -5,
    opacity: 0.06,
    transform: [{ rotate: '-15deg' }],
  },
  headerDecorRight: {
    position: 'absolute',
    left: 10,
    bottom: 5,
    opacity: 0.04,
  },
  headerTitle: {
    fontWeight: '700' as const,
  },
  headerSub: {
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 18,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  videoWrapper: {
    position: 'relative',
  },
  videoContainer: {
    width: '100%',
    height: VIDEO_HEIGHT,
    backgroundColor: '#050A07',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
    borderWidth: 2,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    gap: 12,
  },
  errorText: {
    fontWeight: '500' as const,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayAuthor: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  overlayTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  muteBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerDescription: {
    lineHeight: 20,
  },
});
