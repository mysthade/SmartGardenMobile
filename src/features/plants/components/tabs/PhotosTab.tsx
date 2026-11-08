import { memo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AttachmentDto } from '@smart-garden/types';
import type { ThemeTokens } from '@/src/theme/tokens';
import { api, newIdempotencyKey } from '@/src/lib/api';

interface PhotosTabProps {
  plantId: string;
  theme: ThemeTokens;
}

const TAKE_PHOTO_ASPECT = [4, 3];

function PhotosTabInner({ plantId, theme }: PhotosTabProps) {
  const queryClient = useQueryClient();

  const [photos, setPhotos] = useState<AttachmentDto[]>([]);
  const [localUris, setLocalUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const createUploadMutation = useMutation({
    mutationFn: async (localUri: string) => {
      const idempotencyKey = newIdempotencyKey('photo');
      const { attachment, uploadUrl } = await api.createUploadUrl(
        {
          plantId,
          mimeType: 'image/jpeg',
          originalFileName: 'photo.jpg',
        },
        idempotencyKey,
      );
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: localUri,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
      return api.confirmAttachment(attachment.id);
    },
    onSuccess: (confirmedAttachment) => {
      setPhotos((prev) => [confirmedAttachment, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
    },
    onError: () => {
      Alert.alert('Помилка', 'Не вдалося завантажити фото');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      api.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] });
    },
  });

  const handlePickPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Доступ заборонено',
          'Будь ласка, надайте доступ до фото, щоб додати знімок.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: TAKE_PHOTO_ASPECT,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setLocalUris((prev) => [...prev, result.assets[0].uri]);
        void createUploadMutation.mutateAsync(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося вибрати фото з галереї');
    }
  }, [createUploadMutation]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Доступ заборонено',
          'Будь ласка, надайте доступ до камери, щоб зняти знімок.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: TAKE_PHOTO_ASPECT,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setLocalUris((prev) => [...prev, result.assets[0].uri]);
        void createUploadMutation.mutateAsync(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося зробити знімок камерою');
    }
  }, [createUploadMutation]);

  const handleDeletePhoto = useCallback(
    (attachmentId: string) => {
      setPhotos((prev) => prev.filter((p) => p.id !== attachmentId));
      void deleteMutation.mutateAsync(attachmentId);
    },
    [deleteMutation],
  );

  const isUploading = uploading || createUploadMutation.isPending;

  const allItems = [
    ...photos.map((p) => ({ kind: 'confirmed' as const, data: p })),
    ...localUris.map((uri) => ({ kind: 'local' as const, data: uri })),
  ];

  const styles = createStyles(theme);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Фотографії рослини</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePickPhoto}
            disabled={isUploading}
            opacity={isUploading ? 0.5 : 1}
          >
            <ImageIcon size={20} color={theme.ac} />
            <Text style={styles.actionBtnText}>Галерея</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleTakePhoto}
            disabled={isUploading}
            opacity={isUploading ? 0.5 : 1}
          >
            <Camera size={20} color={theme.ac} />
            <Text style={styles.actionBtnText}>Камера</Text>
          </TouchableOpacity>
        </View>
      </View>

      {allItems.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Фото ще немає</Text>
          <Text style={styles.emptySubtitle}>
            Додайте перше знімок, натиснувши «Галерея» або «Камера».
          </Text>
        </View>
      )}

      {allItems.length > 0 && (
        <View style={styles.grid}>
          {allItems.map((item, index) => {
            const isLocal = item.kind === 'local';
            const uri = isLocal
              ? item.data
              : (item.data.downloadUrl ?? item.data.storageKey);
            const isPending = isLocal || item.data.status === 'PENDING';
            const itemId = isLocal ? `local-${index}` : item.data.id;

            return (
              <Pressable
                key={itemId}
                style={styles.photoCard}
                onLongPress={() => {
                  if (!isLocal && item.data.id) {
                    Alert.alert(
                      'Видалити фото?',
                      'Цю дію неможливо відмінити.',
                      [
                        { text: 'Скасувати', style: 'cancel' },
                        {
                          text: 'Видалити',
                          style: 'destructive',
                          onPress: () => handleDeletePhoto(item.data.id),
                        },
                      ],
                    );
                  }
                }}
              >
                <Image
                  source={{ uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                {isPending && (
                  <View style={styles.pendingBadge}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                )}
                {!isLocal && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(item.data.id);
                    }}
                  >
                    <Trash2 size={16} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {isUploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color={theme.ac} />
          <Text style={styles.uploadingText}>Завантаження фото…</Text>
        </View>
      )}
    </ScrollView>
  );
}

export const PhotosTab = memo(PhotosTabInner);

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 24,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    toolbarTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.tx,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.ac,
      borderRadius: 10,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.tx,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.mu,
      textAlign: 'center',
      marginTop: 4,
      paddingHorizontal: 24,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    photoCard: {
      width: 112,
      height: 112,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: theme.bd,
      position: 'relative',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    pendingBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 8,
      padding: 6,
    },
    deleteBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    uploadingText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.tx,
    },
  });
}
