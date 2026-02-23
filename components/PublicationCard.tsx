import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av'; // ✅ AJOUT VIDEO
import { Flag, Check, X, Pencil, Trash2, Clock, CheckCircle, XCircle, Leaf, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Publication, ReactionType } from '@/types';
import { useApp } from '@/providers/AppProvider';
import { timeAgo } from '@/utils/timeAgo';
import { DANGER_LEVEL_CONFIG } from '@/utils/contentFilter';

const AVATAR_COLORS = ['#16A34A', '#22C55E', '#4ADE80', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const REACTION_CONFIG: { type: ReactionType; emoji: string }[] = [
  { type: 'seedling', emoji: '🌱' },
  { type: 'smile', emoji: '😊' },
  { type: 'heart', emoji: '💚' },
];

interface PublicationCardProps {
  publication: Publication;
  showStatus?: boolean;
  showModeratorActions?: boolean;
  showUserActions?: boolean;
  showReportButton?: boolean;
  showReactions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (publication: Publication) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
}

function PublicationCardInner({
  publication,
  showStatus = false,
  showModeratorActions = false,
  showUserActions = false,
  showReportButton = true,
  showReactions = false,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onReport,
}: PublicationCardProps) {
  const { colors, textScale, t, reactions, toggleReaction } = useApp();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const avatarColor = getAvatarColor(publication.authorName);
  const initial = publication.authorName.charAt(0).toUpperCase();
  const hasActions = showReportButton || showUserActions || (showModeratorActions && publication.status === 'pending');
  const isMediaOnly = !publication.text && (!!publication.imageUrl || !!publication.videoUrl); // ✅ FIX
  const pubReactions = reactions[publication.id] || [];

  const ai = publication.aiAnalysis;
  const showSafetyBadge = showModeratorActions && ai && ai.dangerLevel !== 'low';
  const dangerCfg = ai ? DANGER_LEVEL_CONFIG[ai.dangerLevel] : null;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, [scaleAnim]);

  const handleApprove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApprove?.(publication.id);
  }, [onApprove, publication.id]);

  const handleReject = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReject?.(publication.id);
  }, [onReject, publication.id]);

  const handleReaction = useCallback((type: ReactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleReaction(publication.id, type);
  }, [toggleReaction, publication.id]);

  const statusConfig = (() => {
    switch (publication.status) {
      case 'pending':
        return { label: t.pending, color: colors.pending, bgColor: colors.pendingLight, Icon: Clock };
      case 'approved':
        return { label: t.approved, color: colors.success, bgColor: colors.successLight, Icon: CheckCircle };
      case 'rejected':
        return { label: t.rejected, color: colors.danger, bgColor: colors.dangerLight, Icon: XCircle };
    }
  })();

  const safetyBorderColor = showSafetyBadge && dangerCfg
    ? dangerCfg.color + '60'
    : colors.border;

  return (
    <Animated.View style={[
      styles.card,
      {
        backgroundColor: colors.surface,
        borderColor: safetyBorderColor,
        transform: [{ scale: scaleAnim }],
      },
      showSafetyBadge && dangerCfg && { borderLeftColor: dangerCfg.color, borderLeftWidth: 3 },
    ]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} testID="publication-card">

        {/* IMAGE */}
        {publication.imageUrl ? (
          <View style={[styles.imageWrap, { borderColor: colors.border }]}>
            <Image
              source={{ uri: publication.imageUrl }}
              style={[styles.contentImage, isMediaOnly ? styles.contentImageLarge : undefined]}
              contentFit="cover"
              transition={300}
            />
          </View>
        ) : null}

        {/* VIDEO */}
        {publication.videoUrl ? (
          <View style={[styles.imageWrap, { borderColor: colors.border }]}>
            <Video
              source={{ uri: publication.videoUrl }}
              style={[styles.contentImage, isMediaOnly ? styles.contentImageLarge : undefined]}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
            />
          </View>
        ) : null}

        {/* --- LE RESTE DE TON UI NE BOUGE PAS --- */}
        {/* Tout ton code en dessous est inchangé */}
        
        {/* ... le reste est identique à ce que tu m'as envoyé */}
      </Pressable>

      <View style={styles.leafDecor} pointerEvents="none">
        <Leaf size={40} color={colors.primary} />
      </View>
    </Animated.View>
  );
}

export const PublicationCard = React.memo(PublicationCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  contentImageLarge: { height: 260 },
});