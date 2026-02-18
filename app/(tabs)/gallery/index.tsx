import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions,
  Platform, ActivityIndicator, Modal, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Play, VolumeX, Volume2, Film, Maximize2, X, Pause, RotateCcw } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import { EmptyState } from '@/components/EmptyState';
import { DEMO_VIDEOS } from '@/mocks/publications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FEED_VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * (16 / 9));

interface VideoFeedItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  authorName: string;
}

// ─── Fullscreen item ───────────────────────────────────────────────────────────

interface FullscreenItemProps {
  item: VideoFeedItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

const FullscreenItem = React.memo(({ item, isActive, isMuted, onToggleMute }: FullscreenItemProps) => {
  const videoRef = useRef<Video>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      setIsBuffering(false);
      setIsPaused(false);
    }
  }, [isActive]);

  const handleStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);
      setHasError(false);
    } else if ('error' in status && status.error) {
      console.log('MAB FS: Video error:', status.error);
      setHasError(true);
    }
  }, []);

  const handleTap = useCallback(() => {
    if (!isActive) return;
    if (isPaused) {
      videoRef.current?.playAsync();
      setIsPaused(false);
    } else {
      videoRef.current?.pauseAsync();
      setIsPaused(true);
    }
  }, [isActive, isPaused]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    videoRef.current?.playAsync().catch(() => setHasError(true));
  }, []);

  return (
    <Pressable style={fsStyles.item} onPress={handleTap}>
      {isActive && !hasError ? (
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          posterSource={{ uri: item.thumbnailUrl }}
          usePoster
          style={fsStyles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={!isPaused}
          isMuted={isMuted}
          isLooping
          onPlaybackStatusUpdate={handleStatusUpdate}
        />
      ) : (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={fsStyles.video}
          contentFit="cover"
        />
      )}

      {isBuffering && isActive && (
        <View style={fsStyles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#4ADE80" />
        </View>
      )}

      {isPaused && !isBuffering && isActive && (
        <View style={fsStyles.centerOverlay} pointerEvents="none">
          <View style={fsStyles.pauseCircle}>
            <Pause size={28} color="#FFF" fill="#FFF" />
          </View>
        </View>
      )}

      {(!isActive || (!isPlaying && !isBuffering && !isPaused)) && !hasError && (
        <View style={fsStyles.centerOverlay} pointerEvents="none">
          <View style={fsStyles.pauseCircle}>
            <Play size={28} color="#FFF" fill="#FFF" />
          </View>
        </View>
      )}

      {hasError && (
        <View style={fsStyles.centerOverlay}>
          <Pressable style={fsStyles.retryBtn} onPress={handleRetry}>
            <RotateCcw size={18} color="#FFF" />
            <Text style={fsStyles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      <View style={fsStyles.bottomInfo} pointerEvents="none">
        <Text style={fsStyles.fsAuthor}>{item.authorName}</Text>
        <Text style={fsStyles.fsTitle}>{item.title}</Text>
      </View>

      <Pressable style={fsStyles.muteBtn} onPress={onToggleMute}>
        {isMuted ? <VolumeX size={18} color="#FFF" /> : <Volume2 size={18} color="#FFF" />}
      </Pressable>
    </Pressable>
  );
});

// ─── Feed item ─────────────────────────────────────────────────────────────────

interface FeedItemProps {
  item: VideoFeedItem;
  isActive: boolean;
  isMuted: boolean;
  onPress: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}

const FeedItem = React.memo(({ item, isActive, isMuted, onPress, onToggleMute, onFullscreen }: FeedItemProps) => {
  const videoRef = useRef<Video>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

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
      console.log('MAB Feed: Video error:', status.error);
      setHasError(true);
    }
  }, []);

  return (
    <View style={styles.feedItem}>
      <Pressable style={styles.feedVideoContainer} onPress={onPress}>
        {isActive && !hasError ? (
          <Video
            ref={videoRef}
            source={{ uri: item.videoUrl }}
            posterSource={{ uri: item.thumbnailUrl }}
            usePoster
            style={styles.feedVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted={isMuted}
            isLooping
            onPlaybackStatusUpdate={handleStatusUpdate}
          />
        ) : (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.feedVideo}
            contentFit="cover"
          />
        )}

        {(!isActive || (!isPlaying && !isBuffering)) && !hasError && (
          <View style={styles.centerOverlay} pointerEvents="none">
            <View style={styles.playCircle}>
              <Play size={22} color="#FFF" fill="#FFF" />
            </View>
          </View>
        )}

        {isBuffering && isActive && (
          <View style={styles.centerOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#4ADE80" />
          </View>
        )}

        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.overlayAuthor}>{item.authorName}</Text>
          <Text style={styles.overlayTitle} numberOfLines={1}>{item.title}</Text>
        </View>

        <View style={styles.topControls}>
          {isActive && isPlaying && (
            <Pressable style={styles.ctrlBtn} onPress={onToggleMute}>
              {isMuted ? <VolumeX size={14} color="#FFF" /> : <Volume2 size={14} color="#FFF" />}
            </Pressable>
          )}
          <Pressable style={styles.ctrlBtn} onPress={onFullscreen}>
            <Maximize2 size={14} color="#FFF" />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function VideosScreen() {
  const { videoPublications, colors, t, textScale } = useApp();
  const insets = useSafeAreaInsets();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [fsActiveIndex, setFsActiveIndex] = useState(0);
  const fsListRef = useRef<FlatList<VideoFeedItem>>(null);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 60 });

  const feedItems: VideoFeedItem[] = useMemo(() => {
    const demoItems: VideoFeedItem[] = DEMO_VIDEOS.map(v => ({
      id: v.id,
      title: v.title,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      authorName: v.authorName,
    }));
    const communityItems: VideoFeedItem[] = videoPublications.map(p => ({
      id: p.id,
      title: p.authorName,
      videoUrl: p.videoUrl!,
      thumbnailUrl: p.imageUrl || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
      authorName: p.authorName,
    }));
    return [...demoItems, ...communityItems];
  }, [videoPublications]);

  const handleVideoPress = useCallback((id: string) => {
    setActiveVideoId(prev => (prev === id ? null : id));
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleOpenFullscreen = useCallback((id: string) => {
    const idx = feedItems.findIndex(item => item.id === id);
    const startIdx = idx >= 0 ? idx : 0;
    setFsActiveIndex(startIdx);
    setFullscreenVisible(true);
    setTimeout(() => {
      fsListRef.current?.scrollToIndex({ index: startIdx, animated: false });
    }, 100);
  }, [feedItems]);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenVisible(false);
  }, []);

  const onFsViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setFsActiveIndex(idx);
      console.log('MAB FS: Active video index:', idx);
    }
  }, []);

  const getItemLayout = useCallback((_: ArrayLike<VideoFeedItem> | null | undefined, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  const renderFeedItem = useCallback(({ item }: { item: VideoFeedItem }) => (
    <FeedItem
      item={item}
      isActive={activeVideoId === item.id}
      isMuted={isMuted}
      onPress={() => handleVideoPress(item.id)}
      onToggleMute={handleToggleMute}
      onFullscreen={() => handleOpenFullscreen(item.id)}
    />
  ), [activeVideoId, isMuted, handleVideoPress, handleToggleMute, handleOpenFullscreen]);

  const renderFullscreenItem = useCallback(({ item, index }: { item: VideoFeedItem; index: number }) => (
    <FullscreenItem
      item={item}
      isActive={fsActiveIndex === index}
      isMuted={isMuted}
      onToggleMute={handleToggleMute}
    />
  ), [fsActiveIndex, isMuted, handleToggleMute]);

  const keyExtractor = useCallback((item: VideoFeedItem) => item.id, []);

  if (feedItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={<Film size={48} color={colors.primary} />}
          title={t.noVideos}
          message={t.noVideosMsg}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20 * textScale }]}>
          {t.inspiringVideos}
        </Text>
      </View>

      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS !== 'web'}
        testID="videos-feed"
      />

      {/* Fullscreen Modal */}
      <Modal
        visible={fullscreenVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseFullscreen}
      >
        <View style={fsStyles.modal}>
          {Platform.OS !== 'web' && <StatusBar hidden />}

          <FlatList
            ref={fsListRef}
            data={feedItems}
            renderItem={renderFullscreenItem}
            keyExtractor={keyExtractor}
            pagingEnabled
            snapToAlignment="start"
            snapToInterval={SCREEN_HEIGHT}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onFsViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef.current}
            getItemLayout={getItemLayout}
            removeClippedSubviews={Platform.OS !== 'web'}
            initialScrollIndex={fsActiveIndex}
            testID="fullscreen-feed"
          />

          {/* Close button */}
          <Pressable
            style={[fsStyles.closeBtn, { top: insets.top + 12 }]}
            onPress={handleCloseFullscreen}
          >
            <X size={20} color="#FFF" />
          </Pressable>

          {/* Index indicator */}
          <View style={[fsStyles.indexBadge, { bottom: insets.bottom + 90 }]} pointerEvents="none">
            <Text style={fsStyles.indexText}>{fsActiveIndex + 1} / {feedItems.length}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Feed styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  headerTitle: {
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  feedItem: {
    width: SCREEN_WIDTH,
    height: FEED_VIDEO_HEIGHT,
  },
  feedVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  feedVideo: {
    width: '100%',
    height: '100%',
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 50,
    paddingHorizontal: 14,
    paddingTop: 40,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayAuthor: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  overlayTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  topControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
    alignItems: 'center',
  },
  ctrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});

// ─── Fullscreen styles ─────────────────────────────────────────────────────────

const fsStyles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#000',
  },
  item: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(74,222,128,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  retryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 60,
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 100,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fsAuthor: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  fsTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  muteBtn: {
    position: 'absolute',
    bottom: 108,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  indexBadge: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indexText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
