import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions,
  Platform, ActivityIndicator, Modal, RefreshControl, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Play, Film, ImageIcon, X, RotateCcw, Grid2x2, List,
  AlertCircle, RefreshCw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/providers/AppProvider';
import { useMediaFeed, MediaItem } from '@/hooks/useMediaFeed';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_COLS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 4) / GRID_COLS;

type ViewMode = 'grid' | 'list';

interface VideoCardProps {
  item: MediaItem;
  onPress: () => void;
}

const VideoCard = React.memo(({ item, onPress }: VideoCardProps) => {
  return (
    <Pressable style={listStyles.card} onPress={onPress}>
      <View style={listStyles.videoThumb}>
        <View style={listStyles.videoIconBg}>
          <Play size={28} color="#FFF" fill="#FFF" />
        </View>
        <View style={listStyles.videoBadge}>
          <Film size={11} color="#FFF" />
          <Text style={listStyles.videoBadgeText}>Vidéo</Text>
        </View>
      </View>
      <MediaMeta item={item} />
    </Pressable>
  );
});

interface ImageCardProps {
  item: MediaItem;
  onPress: () => void;
}

const ImageCard = React.memo(({ item, onPress }: ImageCardProps) => {
  return (
    <Pressable style={listStyles.card} onPress={onPress}>
      <Image
        source={{ uri: item.file_path }}
        style={listStyles.cardImage}
        contentFit="cover"
      />
      <MediaMeta item={item} />
    </Pressable>
  );
});

function MediaMeta({ item }: { item: MediaItem }) {
  const date = new Date(item.created_at);
  const label = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  const statusColor = item.status === 'approved' ? '#4ADE80' : item.status === 'rejected' ? '#EF4444' : '#FBBF24';
  const statusLabel = item.status === 'approved' ? 'Approuvé' : item.status === 'rejected' ? 'Refusé' : 'En attente';
  return (
    <View style={listStyles.meta}>
      <View style={listStyles.metaLeft}>
        <Text style={listStyles.metaDate}>{label}</Text>
        <View style={[listStyles.statusPill, { backgroundColor: statusColor + '20' }]}>
          <View style={[listStyles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[listStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={[listStyles.typePill, { backgroundColor: item.media_type === 'video' ? '#1E1B4B' : '#0C1A2E' }]}>
        {item.media_type === 'video'
          ? <Film size={11} color="#818CF8" />
          : <ImageIcon size={11} color="#38BDF8" />}
        <Text style={[listStyles.typeText, { color: item.media_type === 'video' ? '#818CF8' : '#38BDF8' }]}>
          {item.media_type === 'video' ? 'Vidéo' : 'Image'}
        </Text>
      </View>
    </View>
  );
}

interface FullscreenVideoProps {
  item: MediaItem;
  onClose: () => void;
}

function FullscreenVideo({ item, onClose }: FullscreenVideoProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      setHasError(false);
    } else if ('error' in status && status.error) {
      setHasError(true);
    }
  }, []);

  return (
    <View style={fsStyles.container}>
      {Platform.OS !== 'web' && <StatusBar hidden />}
      {!hasError ? (
        <Video
          ref={videoRef}
          source={{ uri: item.file_path }}
          style={fsStyles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls
          onPlaybackStatusUpdate={handleStatus}
        />
      ) : (
        <View style={fsStyles.errorWrap}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={fsStyles.errorText}>Impossible de lire cette vidéo</Text>
          <Pressable style={fsStyles.retryBtn} onPress={() => { setHasError(false); videoRef.current?.playAsync(); }}>
            <RotateCcw size={16} color="#FFF" />
            <Text style={fsStyles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      )}
      {isBuffering && !hasError && (
        <View style={fsStyles.bufferingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#4ADE80" />
        </View>
      )}
      <Pressable style={[fsStyles.closeBtn, { top: insets.top + 12 }]} onPress={onClose}>
        <X size={20} color="#FFF" />
      </Pressable>
    </View>
  );
}

interface FullscreenImageProps {
  item: MediaItem;
  onClose: () => void;
}

function FullscreenImage({ item, onClose }: FullscreenImageProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={fsStyles.container}>
      {Platform.OS !== 'web' && <StatusBar hidden />}
      <Image
        source={{ uri: item.file_path }}
        style={fsStyles.video}
        contentFit="contain"
      />
      <Pressable style={[fsStyles.closeBtn, { top: insets.top + 12 }]} onPress={onClose}>
        <X size={20} color="#FFF" />
      </Pressable>
    </View>
  );
}

export default function GalleryScreen() {
  const { colors, textScale } = useApp();
  const { items, isLoading, error, refresh } = useMediaFeed();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

  const images = useMemo(() => items.filter(i => i.media_type === 'image'), [items]);
  const videos = useMemo(() => items.filter(i => i.media_type === 'video'), [items]);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  const displayed = useMemo(() => {
    if (filter === 'image') return images;
    if (filter === 'video') return videos;
    return items;
  }, [filter, items, images, videos]);

  const handleOpen = useCallback((item: MediaItem) => {
    setActiveItem(item);
  }, []);

  const handleClose = useCallback(() => {
    setActiveItem(null);
  }, []);

  const renderGridItem = useCallback(({ item }: { item: MediaItem }) => (
    <Pressable style={gridStyles.cell} onPress={() => handleOpen(item)}>
      {item.media_type === 'image' ? (
        <Image source={{ uri: item.file_path }} style={gridStyles.thumb} contentFit="cover" />
      ) : (
        <View style={[gridStyles.thumb, { backgroundColor: '#0D0D1A', justifyContent: 'center', alignItems: 'center' }]}>
          <Play size={22} color="#FFF" fill="#FFF" />
        </View>
      )}
      <View style={gridStyles.typeOverlay}>
        {item.media_type === 'video'
          ? <Film size={10} color="#FFF" />
          : <ImageIcon size={10} color="#FFF" />}
      </View>
      <View style={[gridStyles.statusDot, {
        backgroundColor: item.status === 'approved' ? '#4ADE80' : item.status === 'rejected' ? '#EF4444' : '#FBBF24',
      }]} />
    </Pressable>
  ), [handleOpen]);

  const renderListItem = useCallback(({ item }: { item: MediaItem }) => {
    if (item.media_type === 'video') {
      return <VideoCard item={item} onPress={() => handleOpen(item)} />;
    }
    return <ImageCard item={item} onPress={() => handleOpen(item)} />;
  }, [handleOpen]);

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  const renderHeader = useCallback(() => (
    <View style={[headerStyles.wrap, { backgroundColor: colors.background }]}>
      <View style={headerStyles.titleRow}>
        <Text style={[headerStyles.title, { color: colors.text, fontSize: 22 * textScale }]}>Médiathèque</Text>
        <View style={headerStyles.controls}>
          <Pressable
            style={[headerStyles.modeBtn, viewMode === 'grid' && { backgroundColor: colors.primary + '30' }]}
            onPress={() => setViewMode('grid')}
          >
            <Grid2x2 size={18} color={viewMode === 'grid' ? colors.primary : colors.textMuted} />
          </Pressable>
          <Pressable
            style={[headerStyles.modeBtn, viewMode === 'list' && { backgroundColor: colors.primary + '30' }]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={headerStyles.stats}>
        <View style={[headerStyles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[headerStyles.statNum, { color: colors.text }]}>{items.length}</Text>
          <Text style={[headerStyles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
        <View style={[headerStyles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ImageIcon size={14} color="#38BDF8" />
          <Text style={[headerStyles.statNum, { color: '#38BDF8' }]}>{images.length}</Text>
          <Text style={[headerStyles.statLabel, { color: colors.textMuted }]}>Images</Text>
        </View>
        <View style={[headerStyles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Film size={14} color="#818CF8" />
          <Text style={[headerStyles.statNum, { color: '#818CF8' }]}>{videos.length}</Text>
          <Text style={[headerStyles.statLabel, { color: colors.textMuted }]}>Vidéos</Text>
        </View>
      </View>

      <View style={headerStyles.filters}>
        {(['all', 'image', 'video'] as const).map(f => (
          <Pressable
            key={f}
            style={[headerStyles.filterBtn, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[headerStyles.filterText, { color: filter === f ? colors.background : colors.textSecondary }]}>
              {f === 'all' ? 'Tout' : f === 'image' ? 'Images' : 'Vidéos'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  ), [colors, textScale, viewMode, filter, items.length, images.length, videos.length]);

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement des médias…</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AlertCircle size={44} color={colors.danger} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Erreur de chargement</Text>
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{error}</Text>
        <Pressable style={[styles.reloadBtn, { backgroundColor: colors.primary }]} onPress={refresh}>
          <RefreshCw size={16} color={colors.background} />
          <Text style={[styles.reloadBtnText, { color: colors.background }]}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!isLoading && displayed.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.center}>
          {filter === 'video'
            ? <Film size={48} color={colors.textMuted} />
            : <ImageIcon size={48} color={colors.textMuted} />}
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun média</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
            Les médias uploadés par les utilisateurs apparaîtront ici.
          </Text>
          <Pressable style={[styles.reloadBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={refresh}>
            <RefreshCw size={16} color={colors.textSecondary} />
            <Text style={[styles.reloadBtnText, { color: colors.textSecondary }]}>Actualiser</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {viewMode === 'grid' ? (
        <FlatList
          data={displayed}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={GRID_COLS}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          testID="gallery-grid"
        />
      ) : (
        <FlatList
          data={displayed}
          renderItem={renderListItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listPadding}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          testID="gallery-list"
        />
      )}

      <Modal
        visible={!!activeItem && activeItem.media_type === 'video'}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {activeItem && activeItem.media_type === 'video' && (
          <FullscreenVideo item={activeItem} onClose={handleClose} />
        )}
      </Modal>

      <Modal
        visible={!!activeItem && activeItem.media_type === 'image'}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {activeItem && activeItem.media_type === 'image' && (
          <FullscreenImage item={activeItem} onClose={handleClose} />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 15, marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 8 },
  errorMsg: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 8 },
  emptyMsg: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  reloadBtnText: { fontSize: 14, fontWeight: '600' as const },
  listPadding: { paddingHorizontal: 14, paddingBottom: 32 },
});

const headerStyles = StyleSheet.create({
  wrap: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '800' as const, letterSpacing: 0.2 },
  controls: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stats: { flexDirection: 'row', gap: 10 },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNum: { fontSize: 16, fontWeight: '700' as const },
  statLabel: { fontSize: 11 },
  filters: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  filterText: { fontSize: 13, fontWeight: '600' as const },
});

const gridStyles = StyleSheet.create({
  cell: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    margin: 0.5,
    position: 'relative',
    backgroundColor: '#111',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  typeOverlay: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 5,
    padding: 3,
  },
  statusDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.4)',
  },
});

const listStyles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  videoThumb: {
    width: '100%',
    height: 180,
    backgroundColor: '#0D0D1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoBadgeText: { color: '#FFF', fontSize: 11 },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#161616',
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaDate: { color: '#6B7280', fontSize: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: { fontSize: 11, fontWeight: '600' as const },
});

const fsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 32,
  },
  errorText: { color: '#9CA3AF', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  retryText: { color: '#FFF', fontSize: 14, fontWeight: '600' as const },
});
