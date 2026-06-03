import { API_URL } from "@/constants/api";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import {
  Bell,
  BellOff,
  Bookmark,
  Camera,
  ChevronRight,
  Edit2,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
}

interface UserComment {
  id: number;
  content: string;
  created_at: string;
  news: { id: number; title: string } | null;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, login, token } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [commentsModal, setCommentsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (user) loadProfile();
    checkNotificationStatus();
  }, [user]);

  const loadProfile = async () => {
    try {
      const [profileRes, commentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${user?.id}`),
        axios.get(`${API_URL}/api/users/${user?.id}/comments`),
      ]);
      if (profileRes.data.success) {
        setProfile(profileRes.data.data);
        setEditForm({
          name: profileRes.data.data.name || "",
          phone: profileRes.data.data.phone || "",
        });
      }
      if (commentsRes.data.success) setComments(commentsRes.data.data);
      const saved = await AsyncStorage.getItem("bookmarks");
      if (saved) setBookmarksCount(JSON.parse(saved).length);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === "granted");
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      Alert.alert("Отключить уведомления?", "Вы не будете получать новости", [
        { text: "Отмена", style: "cancel" },
        {
          text: "Отключить",
          style: "destructive",
          onPress: () => setNotificationsEnabled(false),
        },
      ]);
    } else {
      if (!Device.isDevice) {
        Alert.alert(
          "Ошибка",
          "Уведомления работают только на реальном устройстве",
        );
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        setNotificationsEnabled(true);
        // Тестовое уведомление
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🏙 SK-15",
            body: "Уведомления включены! Вы будете получать свежие новости.",
          },
          trigger: null,
        });
        Alert.alert("✅ Готово", "Уведомления включены!");
      } else {
        Alert.alert(
          "Нет разрешения",
          "Разрешите уведомления в настройках телефона",
        );
      }
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Нет доступа", "Разрешите доступ к галерее");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: `avatar_${user?.id}.jpg`,
      } as any);
      formData.append("user_id", String(user?.id));

      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setProfile((p) => (p ? { ...p, avatar_url: res.data.url } : null));
        if (token) await login(token, { ...user!, avatar_url: res.data.url });
        Alert.alert("✅ Готово", "Фото профиля обновлено!");
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось загрузить фото");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert("Ошибка", "Введите имя");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/users/${user?.id}`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
      });
      if (res.data.success) {
        setProfile((p) => (p ? { ...p, ...res.data.data } : null));
        if (token) await login(token, { ...user!, ...res.data.data });
        setEditModal(false);
        Alert.alert("✅ Сохранено", "Профиль обновлён");
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Выйти?", "Вы уверены что хотите выйти?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const MenuItem = ({
    icon: Icon,
    label,
    sub,
    onPress,
    danger,
    color,
    badge,
    right,
  }: any) => (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          s.menuIcon,
          {
            backgroundColor: danger
              ? `${Colors.error}12`
              : `${color || Colors.primary}12`,
          },
        ]}
      >
        <Icon
          size={18}
          color={danger ? Colors.error : color || Colors.primary}
        />
      </View>
      <View style={s.menuText}>
        <Text style={[s.menuLabel, danger && { color: Colors.error }]}>
          {label}
        </Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {right || <ChevronRight size={16} color={Colors.textMuted} />}
    </TouchableOpacity>
  );

  if (loading)
    return (
      <View
        style={[
          s.container,
          {
            paddingTop: insets.top,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Профиль</Text>

          <View style={s.avatarSection}>
            {/* Аватар с возможностью загрузки */}
            <TouchableOpacity
              style={s.avatarWrap}
              onPress={pickAvatar}
              disabled={uploadingAvatar}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={s.avatarImg}
                />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(profile?.name || user?.name)?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
              )}
              <View style={s.cameraBtn}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <View style={s.userInfo}>
              <View style={s.nameRow}>
                <Text style={s.userName}>{profile?.name || user?.name}</Text>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => setEditModal(true)}
                >
                  <Edit2 size={14} color={Colors.accent} />
                </TouchableOpacity>
              </View>
              <Text style={s.userEmail}>{profile?.email || user?.email}</Text>
              {(profile?.role || user?.role) === "admin" && (
                <View style={s.adminBadge}>
                  <Shield size={11} color={Colors.accent} />
                  <Text style={s.adminText}>Администратор</Text>
                </View>
              )}
            </View>
          </View>

          {/* Статистика */}
          <View style={s.stats}>
            {[
              { label: "Комментарии", value: String(comments.length) },
              { label: "Избранное", value: String(bookmarksCount) },
              {
                label: "Роль",
                value:
                  (profile?.role || user?.role) === "admin" ? "Админ" : "Юзер",
              },
            ].map((stat, i) => (
              <View key={i} style={[s.statItem, i < 2 && s.statDivider]}>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.body}>
          {/* Аккаунт */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Аккаунт</Text>
            <View style={s.card}>
              <MenuItem
                icon={User}
                label="Имя"
                sub={profile?.name || "Не указано"}
                onPress={() => setEditModal(true)}
              />
              <View style={s.separator} />
              <MenuItem icon={Mail} label="Email" sub={profile?.email} />
              <View style={s.separator} />
              <MenuItem
                icon={Phone}
                label="Телефон"
                sub={profile?.phone || "Не указан"}
                color={Colors.accent}
                onPress={() => setEditModal(true)}
              />
            </View>
          </View>

          {/* Контент */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Контент</Text>
            <View style={s.card}>
              <MenuItem
                icon={Bookmark}
                label="Избранное"
                sub="Сохранённые статьи"
                badge={bookmarksCount > 0 ? bookmarksCount : undefined}
                onPress={() => router.push("/(app)/bookmarks")}
              />
              <View style={s.separator} />
              <MenuItem
                icon={MessageSquare}
                label="Мои комментарии"
                sub={`${comments.length} комментариев`}
                badge={comments.length > 0 ? comments.length : undefined}
                onPress={() => setCommentsModal(true)}
              />
            </View>
          </View>

          {/* Настройки */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Настройки</Text>
            <View style={s.card}>
              <MenuItem
                icon={notificationsEnabled ? Bell : BellOff}
                label="Уведомления"
                sub={notificationsEnabled ? "Включены" : "Выключены"}
                color="#f59e0b"
                right={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={toggleNotifications}
                    trackColor={{
                      false: "#e5e7eb",
                      true: `${Colors.primary}60`,
                    }}
                    thumbColor={
                      notificationsEnabled ? Colors.primary : "#9ca3af"
                    }
                  />
                }
              />
              <View style={s.separator} />
              <MenuItem
                icon={Settings}
                label="О приложении"
                sub="SK-15 · Версия 1.0.0"
                color="#6b7280"
                onPress={() =>
                  Alert.alert(
                    "SK-15",
                    "Новости Северного Казахстана\nВерсия 1.0.1\n\n© 2026 Петропавловск",
                  )
                }
              />
            </View>
          </View>

          {/* Выход */}
          <View style={s.section}>
            <View style={s.card}>
              <MenuItem
                icon={LogOut}
                label="Выйти из аккаунта"
                onPress={handleLogout}
                danger
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal — редактирование */}
      <Modal
        visible={editModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Редактировать профиль</Text>
            <TouchableOpacity
              onPress={() => setEditModal(false)}
              style={s.modalClose}
            >
              <X size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            <View style={s.field}>
              <Text style={s.fieldLabel}>Имя</Text>
              <View style={s.fieldInput}>
                <User size={16} color={Colors.textMuted} />
                <TextInput
                  style={s.input}
                  value={editForm.name}
                  onChangeText={(t) => setEditForm((p) => ({ ...p, name: t }))}
                  placeholder="Ваше имя"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Номер телефона</Text>
              <View style={s.fieldInput}>
                <Phone size={16} color={Colors.textMuted} />
                <TextInput
                  style={s.input}
                  value={editForm.phone}
                  onChangeText={(t) => setEditForm((p) => ({ ...p, phone: t }))}
                  placeholder="+7 777 123 45 67"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={s.saveBtnText}>Сохранить</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal — комментарии */}
      <Modal
        visible={commentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Мои комментарии</Text>
            <TouchableOpacity
              onPress={() => setCommentsModal(false)}
              style={s.modalClose}
            >
              <X size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {comments.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 48 }}>💬</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: Colors.text }}
              >
                Пока нет комментариев
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                Оставьте комментарий к любой статье
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {comments.map((comment) => (
                <TouchableOpacity
                  key={comment.id}
                  style={s.commentCard}
                  onPress={() => {
                    setCommentsModal(false);
                    router.push(`/article/${comment.news?.id}`);
                  }}
                >
                  <Text style={s.commentNewsTitle} numberOfLines={1}>
                    📰 {comment.news?.title || "Статья"}
                  </Text>
                  <Text style={s.commentText} numberOfLines={3}>
                    {comment.content}
                  </Text>
                  <Text style={s.commentDate}>
                    {formatDate(comment.created_at)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: "#0d1b2a",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  cameraBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0d1b2a",
  },

  userInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  userName: { color: "#fff", fontSize: 18, fontWeight: "700" },
  editBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: `${Colors.accent}25`,
    alignItems: "center",
    justifyContent: "center",
  },
  userEmail: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: `${Colors.accent}20`,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  adminText: { color: Colors.accent, fontSize: 11, fontWeight: "600" },

  stats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11 },

  body: { padding: 16, gap: 8 },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 56 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#fff",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { padding: 20 },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  fieldInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  commentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  commentNewsTitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginBottom: 6,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  commentDate: { fontSize: 11, color: Colors.textMuted },
});
