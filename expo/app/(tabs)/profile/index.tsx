import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { User as UserIcon, FileText, Clock, CheckCircle, XCircle, Leaf, Sparkles, Camera, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { PublicationCard } from '@/components/PublicationCard';
import { EmptyState } from '@/components/EmptyState';
import { Publication } from '@/types';
import { AVATAR_PRESETS } from '@/mocks/publications';

export default function ProfileScreen() {
  const { currentUser, userPublications, editPublication, deletePublication, colors, t, textScale, updateProfile } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileBio, setProfileBio] = useState(currentUser.bio);
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatarUrl);

  const pendingCount = userPublications.filter(p => p.status === 'pending').length;
  const approvedCount = userPublications.filter(p => p.status === 'approved').length;
  const rejectedCount = userPublications.filter(p => p.status === 'rejected').length;

  const handleEdit = useCallback((pub: Publication) => {
    setEditingId(pub.id);
    setEditText(pub.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const pub = userPublications.find(p => p.id === editingId);
    if (editText.trim() || pub?.imageUrl) {
      editPublication(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(t.modified, t.modifiedMsg);
    }
  }, [editingId, editText, editPublication, userPublications, t]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      t.deleteConfirmTitle,
      t.deleteConfirmMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deleteBtn,
          style: 'destructive',
          onPress: () => {
            deletePublication(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, [deletePublication, t]);

  const handleOpenEditProfile = useCallback(() => {
    setProfileName(currentUser.name);
    setProfileBio(currentUser.bio);
    setProfileAvatar(currentUser.avatarUrl);
    setShowEditProfile(true);
  }, [currentUser]);

  const handleSaveProfile = useCallback(() => {
    if (!profileName.trim()) {
      Alert.alert(t.error, t.contentRequired);
      return;
    }
    updateProfile({
      name: profileName.trim(),
      bio: profileBio.trim(),
      avatarUrl: profileAvatar,
    });
    setShowEditProfile(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [profileName, profileBio, profileAvatar, updateProfile, t]);

  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setProfileAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log('MAB: Avatar picker error:', error);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: Publication }) => (
    <PublicationCard
      publication={item}
      showStatus
      showUserActions
      showReportButton={false}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ), [handleEdit, handleDelete]);

  const editingPublication = userPublications.find(p => p.id === editingId);
  const canSaveEdit = !!(editText.trim() || editingPublication?.imageUrl);

  const renderHeader = useCallback(() => (
    <View>
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.profileLeafDecor} pointerEvents="none">
          <Leaf size={70} color={colors.primary} />
        </View>
        <View style={styles.profileSparkle} pointerEvents="none">
          <Sparkles size={24} color={colors.accent} />
        </View>
        <View style={styles.avatarContainer}>
          {currentUser.avatarUrl ? (
            <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
              <UserIcon size={36} color={colors.background} />
            </View>
          )}
          <View style={[styles.leafBadge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
            <Leaf size={12} color={colors.background} />
          </View>
        </View>
        <Text style={[styles.userName, { color: colors.text, fontSize: 22 * textScale }]}>{currentUser.name}</Text>
        {currentUser.bio ? (
          <Text style={[styles.userBio, { color: colors.textSecondary, fontSize: 13 * textScale }]}>{currentUser.bio}</Text>
        ) : null}
        <Text style={[styles.userSub, { color: colors.textMuted, fontSize: 12 * textScale }]}>{t.memberOf}</Text>

        <Pressable
          style={[styles.editProfileBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
          onPress={handleOpenEditProfile}
          testID="edit-profile-btn"
        >
          <Pencil size={14} color={colors.primary} />
          <Text style={[styles.editProfileText, { color: colors.primary }]}>{t.editProfile}</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <FileText size={18} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.primary }]}>{userPublications.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.total}</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.pendingLight, borderColor: colors.border }]}>
          <Clock size={18} color={colors.pending} />
          <Text style={[styles.statNumber, { color: colors.pending }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.pending}</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.successLight, borderColor: colors.border }]}>
          <CheckCircle size={18} color={colors.success} />
          <Text style={[styles.statNumber, { color: colors.success }]}>{approvedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.approved}</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.dangerLight, borderColor: colors.border }]}>
          <XCircle size={18} color={colors.danger} />
          <Text style={[styles.statNumber, { color: colors.danger }]}>{rejectedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.rejected}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * textScale }]}>{t.myPublications}</Text>
    </View>
  ), [currentUser, userPublications.length, pendingCount, approvedCount, rejectedCount, colors, t, textScale, handleOpenEditProfile]);

  const renderEmpty = useCallback(() => (
    <EmptyState
      icon={<FileText size={48} color={colors.textMuted} />}
      title={t.noUserPubs}
      message={t.noUserPubsMsg}
    />
  ), [colors, t]);

  const keyExtractor = useCallback((item: Publication) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={userPublications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {editingId ? (
        <View style={styles.editOverlay}>
          <Pressable style={[styles.editBackdrop, { backgroundColor: colors.overlay }]} onPress={handleCancelEdit} />
          <View style={[styles.editModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.text }]}>{t.modifyPublication}</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
              autoFocus
              placeholder={editingPublication?.imageUrl ? t.photoMessage : ''}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.editActions}>
              <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]} onPress={handleCancelEdit}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }, !canSaveEdit && styles.saveBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={!canSaveEdit}
              >
                <Text style={[styles.saveBtnText, { color: colors.background }]}>{t.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {showEditProfile ? (
        <View style={styles.editOverlay}>
          <Pressable style={[styles.editBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setShowEditProfile(false)} />
          <View style={[styles.profileModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.editTitle, { color: colors.text }]}>{t.editProfile}</Text>

              <View style={styles.avatarEditSection}>
                <Pressable onPress={handlePickAvatar} style={styles.avatarEditWrap}>
                  {profileAvatar ? (
                    <Image source={{ uri: profileAvatar }} style={styles.avatarEditImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarEditPlaceholder, { backgroundColor: colors.primary }]}>
                      <UserIcon size={28} color={colors.background} />
                    </View>
                  )}
                  <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
                    <Camera size={14} color={colors.background} />
                  </View>
                </Pressable>
              </View>

              <Text style={[styles.avatarPresetsLabel, { color: colors.textSecondary }]}>{t.chooseAvatar}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarPresetsList}>
                {AVATAR_PRESETS.map((url, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setProfileAvatar(url)}
                    style={[
                      styles.avatarPresetItem,
                      { borderColor: profileAvatar === url ? colors.primary : colors.border },
                    ]}
                  >
                    <Image source={{ uri: url }} style={styles.avatarPresetImage} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>{t.name}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                value={profileName}
                onChangeText={setProfileName}
                maxLength={30}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>{t.bio}</Text>
              <TextInput
                style={[styles.fieldInput, styles.bioInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                value={profileBio}
                onChangeText={setProfileBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={150}
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.editActions}>
                <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]} onPress={() => setShowEditProfile(false)}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t.cancel}</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile}>
                  <Text style={[styles.saveBtnText, { color: colors.background }]}>{t.save}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  profileLeafDecor: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.06,
    transform: [{ rotate: '-25deg' }],
  },
  profileSparkle: {
    position: 'absolute',
    left: 16,
    top: 16,
    opacity: 0.05,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  leafBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userName: {
    fontWeight: '700' as const,
  },
  userBio: {
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  userSub: {
    marginTop: 4,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
  },
  sectionTitle: {
    fontWeight: '700' as const,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  editBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editModal: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
  },
  profileModal: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  editInput: {
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
    borderWidth: 1,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  avatarEditSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarEditWrap: {
    position: 'relative',
  },
  avatarEditImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEditPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPresetsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  avatarPresetsList: {
    gap: 8,
    paddingBottom: 16,
  },
  avatarPresetItem: {
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarPresetImage: {
    width: 48,
    height: 48,
    borderRadius: 22,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  bioInput: {
    minHeight: 70,
  },
});
