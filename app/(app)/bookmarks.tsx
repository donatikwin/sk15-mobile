import { Colors } from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Bookmark, Clock, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SavedNews {
  id: number;
  title: string;
  excerpt: string;
  image_url: string | null;
  created_at: string;
  categories: { name: string };
}

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<SavedNews[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem("bookmarks");
      if (saved) setBookmarks(JSON.parse(saved));
      else setBookmarks([]);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // Перезагружаем при каждом открытии вкладки
  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, []),
  );

  const removeBookmark = async (id: number) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem("bookmarks", JSON.stringify(updated));
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Избранное</Text>
        <Text style={s.headerSub}>
          {bookmarks.length > 0
            ? `${bookmarks.length} сохранённых статей`
            : "Сохраняйте интересные новости"}
        </Text>
      </View>

      {bookmarks.length === 0 && !loading ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Bookmark size={36} color={Colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>Пока пусто</Text>
          <Text style={s.emptySub}>
            Нажмите на закладку в любой статье{"\n"}чтобы сохранить её здесь
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push("/(app)")}
          >
            <Text style={s.emptyBtnText}>Перейти к новостям</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadBookmarks}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/article/${item.id}`)}
              activeOpacity={0.85}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.cardImage} />
              ) : (
                <View style={[s.cardImage, s.cardPlaceholder]}>
                  <Text style={{ fontSize: 28 }}>📰</Text>
                </View>
              )}
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.categories?.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => removeBookmark(item.id)}
                  >
                    <Trash2 size={15} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={s.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.excerpt ? (
                  <Text style={s.cardExcerpt} numberOfLines={2}>
                    {item.excerpt}
                  </Text>
                ) : null}
                <View style={s.cardFooter}>
                  <Clock size={11} color={Colors.textMuted} />
                  <Text style={s.dateText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: "#0d1b2a",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerSub: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  emptySub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  cardImage: { width: "100%", height: 160 },
  cardPlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 14 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: Colors.primary, fontSize: 11, fontWeight: "600" },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${Colors.error}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 5,
  },
  cardExcerpt: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 12, color: Colors.textMuted },
});
