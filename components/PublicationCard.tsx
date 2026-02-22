import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
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
  const isPhotoOnly = !publication.text && !!publication.imageUrl;
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

        {showSafetyBadge && ai && dangerCfg && (
          <View style={[styles.safetyBar, { backgroundColor: dangerCfg.bg }]}>
            {ai.dangerLevel === 'critical' ? (
              <ShieldOff size={12} color={dangerCfg.color} />
            ) : (
              <ShieldAlert size={12} color={dangerCfg.color} />
            )}
            <Text style={[styles.safetyBarText, { color: dangerCfg.color }]}>
              Nocivité {ai.score}/100 — {dangerCfg.label}
            </Text>
            <View style={[styles.safetyScoreDot, { backgroundColor: dangerCfg.color }]} />
          </View>
        )}

        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: colors.text, fontSize: 15 * textScale }]}>
                {publication.authorName}
              </Text>
              {publication.status === 'approved' && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.successLight }]}>
                  <ShieldCheck size={10} color={colors.success} />
                </View>
              )}
            </View>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>{timeAgo(publication.createdAt)}</Text>
          </View>
          {showStatus && (
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <statusConfig.Icon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          )}
        </View>

        {publication.text ? (
          <Text style={[styles.contentText, { color: colors.text, fontSize: 15 * textScale }]}>
            {publication.text}
          </Text>
        ) : null}

        {publication.imageUrl ? (
          <View style={[styles.imageWrap, { borderColor: colors.border }]}>
            <Image
              source={{ uri: publication.imageUrl }}
              style={[styles.contentImage, isPhotoOnly ? styles.contentImageLarge : undefined]}
              contentFit="cover"
              transition={300}
            />
          </View>
        ) : null}

        {showReactions && publication.status === 'approved' ? (
          <View style={[styles.reactionsRow, { borderTopColor: colors.border }]}>
            {REACTION_CONFIG.map(({ type, emoji }) => {
              const isActive = pubReactions.includes(type);
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.reactionBtn,
                    {
                      backgroundColor: isActive ? colors.primaryLight : 'transparent',
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleReaction(type)}
                  testID={`reaction-${type}`}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {hasActions ? (
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            {showReportButton && !showUserActions && !showModeratorActions ? (
              <Pressable
                style={styles.reportButton}
                onPress={() => onReport?.(publication.id)}
                hitSlop={8}
                testID="report-button"
              >
                <Flag size={15} color={colors.textMuted} />
                <Text style={[styles.reportText, { color: colors.textMuted }]}>{t.report}</Text>
              </Pressable>
            ) : null}

            {showUserActions ? (
              <View style={styles.userActions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => onEdit?.(publication)}
                  hitSlop={8}
                  testID="edit-button"
                >
                  <Pencil size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t.modify}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.dangerLight }]}
                  onPress={() => onDelete?.(publication.id)}
                  hitSlop={8}
                  testID="delete-button"
                >
                  <Trash2 size={14} color={colors.danger} />
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>{t.deleteBtn}</Text>
                </Pressable>
              </View>
            ) : null}

            {showModeratorActions && publication.status === 'pending' ? (
              <View style={styles.moderatorActions}>
                <Pressable
                  style={[styles.modBtn, { backgroundColor: colors.success }]}
                  onPress={handleApprove}
                  testID="approve-button"
                >
                  <Check size={16} color={colors.white} />
                  <Text style={styles.modBtnText}>{t.approved}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modBtn, { backgroundColor: colors.danger }]}
                  onPress={handleReject}
                  testID="reject-button"
                >
                  <X size={16} color={colors.white} />
                  <Text style={styles.modBtnText}>{t.rejected}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
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
  safetyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  safetyBarText: { fontSize: 12, fontWeight: '600' as const, flex: 1 },
  safetyScoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leafDecor: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    opacity: 0.04,
    transform: [{ rotate: '-30deg' }],
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: { fontWeight: '600' as const },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestamp: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  contentText: { lineHeight: 23, marginBottom: 12 },
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
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    marginBottom: 4,
  },
  reactionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 18 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  reportText: { fontSize: 12 },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' as const },
  moderatorActions: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
