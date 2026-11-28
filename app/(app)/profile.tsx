import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react-native';
import { passwordSchema } from '@smart-garden/validation';
import { PasswordStrengthMeter } from '@/src/components/auth';
import { useAuth } from '@/src/features/auth/auth-context';
import { normalizeImageMimeType, readUriAsBlob } from '@/src/features/plants/lib/photo-upload';
import { api, resolveAssetUrl } from '@/src/lib/api';
import { formatApiError } from '@/src/lib/api-errors';
import { useTheme } from '@/src/theme/theme-context';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  // Profile & Avatar state
  const [name, setName] = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change via email confirmation state
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeNotice, setCodeNotice] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const avatarUri = resolveAssetUrl(user?.avatarUrl);

  const uploadPickedAsset = async (uri: string, assetMime?: string | null) => {
    setUploadingAvatar(true);
    try {
      const blob = await readUriAsBlob(uri);
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Максимальний розмір аватара — 5 МБ');
      }
      const mimeType = normalizeImageMimeType(blob.type || assetMime, uri);
      const { uploadUrl, storageKey } = await api.createAvatarUploadUrl({
        mimeType,
        size: blob.size,
      });
      const resolvedUrl = resolveAssetUrl(uploadUrl) ?? uploadUrl;
      const putRes = await fetch(resolvedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });
      if (!putRes.ok) {
        throw new Error('Не вдалося завантажити аватар у сховище');
      }
      const updatedUser = await api.confirmAvatar(storageKey);
      setUser(updatedUser);
      Alert.alert('Готово', 'Аватарку оновлено');
    } catch (error) {
      Alert.alert('Помилка', formatApiError(error, 'Не вдалося оновити аватарку'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Доступ заборонено', 'Надайте доступ до галереї для вибору аватарки.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await uploadPickedAsset(res.assets[0].uri, res.assets[0].mimeType);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося вибрати зображення');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Доступ заборонено', 'Надайте доступ до камери для створення фото.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await uploadPickedAsset(res.assets[0].uri, res.assets[0].mimeType);
      }
    } catch {
      Alert.alert('Помилка', 'Не вдалося зробити фото');
    }
  };

  const handleDeleteAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updated = await api.deleteAvatar();
      setUser(updated);
      Alert.alert('Готово', 'Аватарку видалено');
    } catch (error) {
      Alert.alert('Помилка', formatApiError(error, 'Не вдалося видалити аватарку'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Помилка', 'Ім’я має містити щонайменше 2 символи');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile({ name: trimmed });
      setUser(updated);
      Alert.alert('Збережено', 'Профіль оновлено');
    } catch (error) {
      Alert.alert('Помилка', formatApiError(error, 'Не вдалося оновити профіль'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendPasswordCode = async () => {
    if (!user?.email) return;
    setSendingCode(true);
    setCodeNotice(null);
    try {
      const res = await api.forgotPassword(user.email);
      setCodeSent(true);
      setCodeNotice(res.message);
    } catch (error) {
      Alert.alert('Помилка', formatApiError(error, 'Не вдалося надіслати код на пошту'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    const cleanCode = emailCode.trim();
    if (cleanCode.length < 6) {
      Alert.alert('Помилка', 'Введіть код підтвердження з пошти');
      return;
    }
    const parsedPass = passwordSchema.safeParse(newPassword);
    if (!parsedPass.success) {
      Alert.alert('Помилка', parsedPass.error.issues[0]?.message ?? 'Некоректний пароль');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Помилка', 'Паролі не збігаються');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.resetPassword(cleanCode, newPassword);
      Alert.alert('Успіх', res.message, [
        {
          text: 'Увійти з новим паролем',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Помилка', formatApiError(error, 'Не вдалося змінити пароль'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: theme.pn, borderColor: theme.bd }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color={theme.tx} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: theme.tx }]}>Профіль та безпека</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabsWrap, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
          <Pressable
            onPress={() => setTab('profile')}
            style={[styles.tabBtn, tab === 'profile' && { backgroundColor: theme.ac }]}
          >
            <User size={16} color={tab === 'profile' ? '#fff' : theme.mu} />
            <Text style={[styles.tabText, { color: tab === 'profile' ? '#fff' : theme.tx }]}>
              Профіль і аватар
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('password')}
            style={[styles.tabBtn, tab === 'password' && { backgroundColor: theme.ac }]}
          >
            <KeyRound size={16} color={tab === 'password' ? '#fff' : theme.mu} />
            <Text style={[styles.tabText, { color: tab === 'password' ? '#fff' : theme.tx }]}>
              Зміна пароля
            </Text>
          </Pressable>
        </View>

        {tab === 'profile' ? (
          <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            {/* Avatar Section */}
            <View style={styles.avatarCenter}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee', borderColor: theme.ac },
                ]}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="large" color={theme.ac} />
                ) : avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <User size={40} color={theme.ac} />
                )}
              </View>

              <View style={styles.avatarActions}>
                <Pressable
                  disabled={uploadingAvatar}
                  onPress={handlePickGallery}
                  style={[styles.smallBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}
                >
                  <ImageIcon size={15} color={theme.ac} />
                  <Text style={[styles.smallBtnText, { color: theme.tx }]}>Галерея</Text>
                </Pressable>
                <Pressable
                  disabled={uploadingAvatar}
                  onPress={handleTakePhoto}
                  style={[styles.smallBtn, { borderColor: theme.bd, backgroundColor: theme.bg }]}
                >
                  <Camera size={15} color={theme.ac} />
                  <Text style={[styles.smallBtnText, { color: theme.tx }]}>Камера</Text>
                </Pressable>
                {avatarUri ? (
                  <Pressable
                    disabled={uploadingAvatar}
                    onPress={handleDeleteAvatar}
                    style={[styles.smallBtn, { borderColor: theme.danger, backgroundColor: theme.bg }]}
                  >
                    <Trash2 size={15} color={theme.danger} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Name */}
            <Text style={[styles.label, { color: theme.tx }]}>Ім’я</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ваше ім’я"
              placeholderTextColor={theme.mu}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            />

            {/* Email status */}
            <View style={styles.emailRow}>
              <Mail size={16} color={theme.mu} />
              <Text style={[styles.emailText, { color: theme.mu }]}>{user?.email}</Text>
              {user?.emailVerifiedAt ? (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={13} color="#1F6B3B" />
                  <Text style={styles.verifiedText}>Підтверджено</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              disabled={savingProfile}
              onPress={handleSaveProfile}
              style={[styles.primaryBtn, { backgroundColor: theme.ac }]}
            >
              {savingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Зберегти зміни</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.pn, borderColor: theme.bd }]}>
            <Text style={[styles.cardTitle, { color: theme.tx }]}>
              Зміна пароля з підтвердженням пошти
            </Text>
            <Text style={[styles.hintText, { color: theme.mu }]}>
              Для безпеки ми надішлемо одноразовий код підтвердження на {user?.email}.
            </Text>

            <Pressable
              disabled={sendingCode}
              onPress={handleSendPasswordCode}
              style={[styles.secondaryBtn, { borderColor: theme.ac, backgroundColor: theme.bg }]}
            >
              {sendingCode ? (
                <ActivityIndicator color={theme.ac} />
              ) : (
                <>
                  <Mail size={17} color={theme.ac} />
                  <Text style={[styles.secondaryBtnText, { color: theme.ac }]}>
                    {codeSent ? 'Надіслати код повторно' : 'Надіслати код на пошту'}
                  </Text>
                </>
              )}
            </Pressable>

            {codeNotice ? (
              <View style={[styles.noticeBox, { backgroundColor: theme.name === 'dark' ? '#17251c' : '#eaf6ee' }]}>
                <Text style={[styles.noticeText, { color: theme.ac }]}>{codeNotice}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: theme.tx }]}>Код підтвердження з пошти</Text>
            <TextInput
              value={emailCode}
              onChangeText={setEmailCode}
              placeholder="Наприклад: 123456"
              placeholderTextColor={theme.mu}
              keyboardType="number-pad"
              autoCapitalize="none"
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            />

            <Text style={[styles.label, { color: theme.tx }]}>Новий пароль</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Щонайменше 8 символів"
              placeholderTextColor={theme.mu}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            />
            <PasswordStrengthMeter password={newPassword} />

            <Text style={[styles.label, { color: theme.tx, marginTop: 10 }]}>Повторіть новий пароль</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Повторіть пароль"
              placeholderTextColor={theme.mu}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.input, { color: theme.tx, borderColor: theme.bd, backgroundColor: theme.bg }]}
            />

            <Pressable
              disabled={changingPassword}
              onPress={handleConfirmPasswordChange}
              style={[styles.primaryBtn, { backgroundColor: theme.ac, marginTop: 16 }]}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <KeyRound size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Підтвердити і змінити пароль</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 19, fontWeight: '700' },
  tabsWrap: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  hintText: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  avatarCenter: { alignItems: 'center', marginBottom: 18 },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarActions: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallBtnText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  emailText: { fontSize: 13, fontWeight: '500' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eaf6ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#1F6B3B' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  noticeBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  noticeText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});

