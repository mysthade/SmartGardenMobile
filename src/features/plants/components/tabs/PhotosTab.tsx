import { memo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react-native';
import type { AttachmentDto } from '@smart-garden/types';
import { api, newIdempotencyKey, ApiClientError } from '@/src/lib/api';
import type { ThemeTokens } from '@/src/theme/tokens';

interface PhotosTabProps {
  plantId: string;
  theme: ThemeTokens;
}

const MAX_PHOTOS_PER_PLANT = 2;

function PhotosTabInner({ plantId, theme }: PhotosTabProps) {
  const queryClient = useQueryClient();

  const {
    data: attachments = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['plant-attachments', plantId],
    queryFn: () => api.listPlantAttachments(plantId),
    staleTime: 30_000,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [source, setSource] = useState<'camera' | 'gallery' | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canAdd = attachments.length < MAX_PHOTOS_PER_PLANT;

  // Upload mutation (create presigned URL → PUT file → confirm)
  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Не вдалося прочитати вибраний файл');
      const blob = await response.blob();
      const size = blob.size;
      const maxSize = 10 * 1024 * 1024;
      if (size > maxSize) {
        throw new Error('Файл занадто великий (максимум 10 МБ)');
      }
      const mimeType = blob.type || 'image/jpeg';
      const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
      const originalFileName = `roslina-${Date.now()}${ext}`;

      const { attachment, uploadUrl } = await api.createUploadUrl(
        { originalFileName, mimeType, size, plantId },
        newIdempotencyKey('plant-photo')
      );

      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });

      await api.confirmAttachment(attachment.id);
    },
    onSuccess: async () => {
      setLocalPhotoUri(null);
      setSource(null);
      setIsAddModalOpen(false);
      setUploading(false);
      await queryClient.invalidateQueries({ queryKey: ['plant-attachments', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
    },
    onError: (err) => {
      setUploading(false);
      const msg = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : 'Не вдалося завантажити фото';
      Alert.alert('Помилка', msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => api.deleteAttachment(attachmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plant-attachments', plantId] });
      await queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.message : 'Не вдалося видалити фото';
      Alert.alert('Помилка', msg);
    },
  });

  const handleOpenCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Доступ заборонено', 'Будь ласка, надайте доступ до камери для створення знімка.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setSource('camera');
        setLocalPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося зробити фото');
    }
  };

  const handleOpenGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Доступ заборонено', 'Будь ласка, надайте доступ до фото для вибрания зображення.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setSource('gallery');
        setLocalPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося вибрати фото');
    }
  };

  const handleCancelPick = useCallback(() => {
    setLocalPhotoUri(null);
    setSource(null);
  }, []);

  const handleUploadPick = useCallback(() => {
    if (!localPhotoUri) return;
    setUploading(true);
    void uploadMutation.mutate(localPhotoUri);
  }, [localPhotoUri, uploadMutation]);

  const handleDeletePhoto = (attachmentId: string) => {
    Alert.alert(
      'Видалити фото?',
      'Цю фотографію буде безповоротно видалено.',
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Видалити', style: 'destructive', onPress: () => void deleteMutation.mutate(attachmentId) },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.ac} />
        <Text style={[styles.loadingText, { color: theme.mu }]}>Завантаження фотографій...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.tx }]}>
          Фотографії {attachments.length > 0 ? `(${attachments.length} з ${MAX_PHOTOS_PER_PLANT})` : ''}
        </Text>
      </View>

      {!isLoading && attachments.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Camera size={44} color={theme.mu} />
          <Text style={[styles.emptyTitle, { color: theme.tx }]}>Фотографій ще немає</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mu }]}>
            Додайте знімки рослини, щоб відстежувати її зростання. Максимум {MAX_PHOTOS_PER_PLANT} фото на рослину.
          </Text>
          {canAdd ? (
            <Pressable onPress={() => setIsAddModalOpen(true)} style={styles.emptyActionBtn}>
              <Plus size={16} color="#ffffff" />
              <Text style={styles.emptyActionText}>Додати фото</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!isLoading && attachments.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} colors={[theme.ac]} />
          }
        >
          <View style={styles.grid}>
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.photoCard}>
                {attachment.downloadUrl ? (
                  <Image source={{ uri: attachment.downloadUrl }} style={styles.photoImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: theme.bg }]}>
                    <ImageIcon size={28} color={theme.mu} />
                  </View>
                )}
                <Pressable
                  onPress={() => handleDeletePhoto(attachment.id)}
                  disabled={deleteMutation.isPending}
                  style={[styles.deleteOverlay, deleteMutation.isPending && styles.deleteOverlayDisabled]}
                >
                  <Trash2 size={18} color="#ffffff" />
                </Pressable>
                <Text style={[styles.photoStatus, { color: theme.mu }]}>
                  {attachment.status === 'CONFIRMED' ? 'Завантажено' : attachment.status === 'PENDING' ? 'Завантажується...' : 'Помилка'}
                </Text>
              </View>
            ))}
          </View>
          {canAdd ? (
            <Pressable onPress={() => setIsAddModalOpen(true)} style={styles.addBarBtn}>
              <Plus size={16} color={theme.ac} />
              <Text style={[styles.addBarText, { color: theme.ac }]}>Додати ще одне фото</Text>
            </Pressable>
          ) : (
            <View style={styles.limitBar}>
              <Text style={[styles.limitText, { color: theme.mu }]}>
                Досягнуто ліміту — максимум {MAX_PHOTOS_PER_PLANT} фото на одну рослину.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}

      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCancelPick}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.tx }]}>Додати фотографію</Text>
              <Pressable hitSlop={10} onPress={handleCancelPick}>
                <X size={20} color={theme.mu} />
              </Pressable>
            </View>

            {source ? (
              <>
                <View style={styles.pickPreviewWrap}>
                  {localPhotoUri ? (
                    <Image source={{ uri: localPhotoUri }} style={styles.pickPreviewImage} resizeMode="cover" />
                  ) : null}
                  <Pressable onPress={handleCancelPick} style={styles.pickCancelBtn}>
                    <X size={20} color={theme.mu} />
                  </Pressable>
                </View>
                <Text style={[styles.pickSourceLabel, { color: theme.mu }]}>
                  Джерело: {source === 'camera' ? 'Камера' : 'Галерея'}
                </Text>
                <View style={styles.modalFooter}>
                  <Pressable onPress={handleCancelPick} style={styles.modalCancelBtn}>
                    <Text style={[styles.modalCancelText, { color: theme.mu }]}>Скасувати</Text>
                  </Pressable>
                  <Pressable
                    disabled={uploading || uploadMutation.isPending}
                    onPress={handleUploadPick}
                    style={[styles.modalSaveBtn, { backgroundColor: theme.ac }]}
                  >
                    {uploading || uploadMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={16} color="#ffffff" />
                        <Text style={styles.modalSaveText}>Завантажити</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.pickTitle, { color: theme.tx }]}>Оберіть джерело знімка</Text>
                <View style={styles.sourceRow}>
                  <Pressable onPress={handleOpenCamera} style={styles.sourceBtn}>
                    <Camera size={24} color={theme.ac} />
                    <Text style={[styles.sourceText, { color: theme.tx }]}>Камера</Text>
                  </Pressable>
                  <Pressable onPress={handleOpenGallery} style={styles.sourceBtn}>
                    <ImageIcon size={24} color={theme.ac} />
                    <Text style={[styles.sourceText, { color: theme.tx }]}>Галерея</Text>
                  </Pressable>
                </View>
                <Text style={[styles.sourceHint, { color: theme.mu }]}>
                  Фото буде прикріплено до цієї рослини. Ліміт: {MAX_PHOTOS_PER_PLANT} знімки.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export const PhotosTab = memo(PhotosTabInner);

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  headerRow: { paddingHorizontal: 16, paddingVertical: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#D97706',
  },
  emptyActionText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#00000022',
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  deleteOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOverlayDisabled: { opacity: 0.5 },
  photoStatus: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  addBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  addBarText: { fontSize: 14, fontWeight: '700' },
  limitBar: { alignItems: 'center', marginHorizontal: 16, marginTop: 8 },
  limitText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  refreshWrap: { alignSelf: 'center', padding: 4 },
  refreshText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalCard: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  pickPreviewWrap: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0000001a',
  },
  pickPreviewImage: { width: '100%', height: '100%' },
  pickCancelBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pickSourceLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  pickTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  sourceRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sourceText: { fontSize: 14, fontWeight: '700' },
  sourceHint: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  modalCancelText: { fontSize: 14, fontWeight: '700' },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalSaveText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
