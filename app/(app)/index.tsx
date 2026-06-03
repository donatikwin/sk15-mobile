import { API_URL } from "@/constants/api";
import { Colors } from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { Clock, Eye, Heart, Search, TrendingUp } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CACHE_KEY = "news_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

interface Category {
  id: number;
  name: string;
  slug: string;
}
interface News {
  id: number;
  title: string;
  excerpt: string;
  image_url: string | null;
  source_name: string;
  created_at: string;
  views: number;
  likes_count: number;
  comments_count: number;
  categories: Category;
}

function formatDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 60) return `${diff} мин назад`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Skeleton компонент
function SkeletonCard() {
  const anim = new Animated.Value(0.3);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[sk.card, { opacity: anim }]}>
      <View style={sk.image} />
      <View style={sk.body}>
        <View style={sk.badge} />
        <View style={sk.titleL} />
        <View style={sk.titleS} />
        <View style={sk.meta} />
      </View>
    </Animated.View>
  );
}

function SkeletonHero() {
  const anim = new Animated.Value(0.3);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[sk.hero, { opacity: anim }]}>
      <View style={sk.heroInner}>
        <View style={sk.heroBadge} />
        <View style={sk.heroTitleL} />
        <View style={sk.heroTitleS} />
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<News[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/categories`)
      .then((r) => {
        if (r.data.success) setCategories(r.data.data);
      })
      .catch(() => {});
  }, []);

  const loadNews = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = `${CACHE_KEY}_${activeCategory || "all"}_${search}`;

      // Показываем кеш сразу если есть
      if (!forceRefresh) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            setNews(data);
            setLoading(false);
            // Если кеш свежий — не делаем запрос
            if (age < CACHE_TTL) {
              setRefreshing(false);
              return;
            }
          }
        } catch {}
      }

      // Грузим свежие данные в фоне
      try {
        const params: Record<string, string> = { limit: "30" };
        if (activeCategory) params.category = activeCategory;
        if (search) params.search = search;
        const r = await axios.get(`${API_URL}/api/news`, { params });
        if (r.data.success) {
          setNews(r.data.data);
          // Сохраняем в кеш
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: r.data.data,
              timestamp: Date.now(),
            }),
          );
        }
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, search],
  );

  useEffect(() => {
    setLoading(news.length === 0); // skeleton только если нет данных
    const t = setTimeout(() => loadNews(), 200);
    return () => clearTimeout(t);
  }, [loadNews]);

  const renderHero = (item: News) => (
    <TouchableOpacity
      style={s.heroCard}
      onPress={() => router.push(`/article/${item.id}`)}
      activeOpacity={0.92}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={s.heroImage} />
      ) : (
        <View style={[s.heroImage, s.heroPlaceholder]}>
          <Text style={{ fontSize: 52 }}>📰</Text>
        </View>
      )}
      <View style={s.heroOverlay} />
      <View style={s.heroContent}>
        <View style={s.badgeRow}>
          {item.categories && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.categories.name}</Text>
            </View>
          )}
          <View style={[s.badge, { backgroundColor: Colors.error }]}>
            <TrendingUp size={10} color="#fff" />
            <Text style={[s.badgeText, { marginLeft: 3 }]}>Главное</Text>
          </View>
        </View>
        <Text style={s.heroTitle} numberOfLines={3}>
          {item.title}
        </Text>
        {item.excerpt ? (
          <Text style={s.heroExcerpt} numberOfLines={2}>
            {item.excerpt}
          </Text>
        ) : null}
        <View style={s.heroFooter}>
          <View style={s.row}>
            <Eye size={12} color="rgba(255,255,255,0.7)" />
            <Text style={s.heroStat}>{item.views}</Text>
            <Heart size={12} color="rgba(255,255,255,0.7)" />
            <Text style={s.heroStat}>{item.likes_count}</Text>
          </View>
          <View style={s.row}>
            <Clock size={11} color="rgba(255,255,255,0.6)" />
            <Text style={s.heroTime}> {formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCard = ({ item, index }: { item: News; index: number }) => {
    if (index === 0 && !search && !activeCategory) return renderHero(item);
    return (
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
          <View>
            {item.categories && (
              <View style={s.cardBadge}>
                <Text style={s.cardBadgeText}>{item.categories.name}</Text>
              </View>
            )}
            <Text style={s.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.excerpt ? (
              <Text style={s.cardExcerpt} numberOfLines={2}>
                {item.excerpt}
              </Text>
            ) : null}
          </View>
          <View style={s.cardFooter}>
            <View style={s.row}>
              <Clock size={11} color={Colors.textMuted} />
              <Text style={s.dateText}> {formatDate(item.created_at)}</Text>
            </View>
            <View style={s.row}>
              <Eye size={11} color={Colors.textMuted} />
              <Text style={s.statText}>{item.views}</Text>
              <Heart size={11} color={Colors.textMuted} />
              <Text style={s.statText}>{item.likes_count}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View style={{ paddingTop: 8 }}>
      <SkeletonHero />
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={s.headerTitle}>SK-15</Text>
            <Text style={s.headerSub}>Новости Петропавловска</Text>
          </View>
        </View>
        <View style={s.searchBox}>
          <Search size={15} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="Поиск новостей..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: "#9ca3af", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Категории */}
      <View style={s.catsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cats}
        >
          <TouchableOpacity
            style={[s.catBtn, !activeCategory && s.catActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[s.catText, !activeCategory && s.catTextActive]}>
              Все
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catBtn, activeCategory === cat.slug && s.catActive]}
              onPress={() =>
                setActiveCategory(activeCategory === cat.slug ? null : cat.slug)
              }
            >
              <Text
                style={[
                  s.catText,
                  activeCategory === cat.slug && s.catTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Контент */}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderSkeleton()}
        </ScrollView>
      ) : news.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>📭</Text>
          <Text style={s.emptyText}>Новостей не найдено</Text>
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              setActiveCategory(null);
            }}
          >
            <Text style={s.resetText}>Сбросить фильтры</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNews(true);
              }}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  header: {
    backgroundColor: "#0d1b2a",
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 10,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logo: { width: 52, height: 52 },
  headerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 24,
    letterSpacing: 1,
  },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111", padding: 0 },
  catsWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
    elevation: 2,
  },
  cats: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
  },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  catActive: { backgroundColor: "#0d1b2a" },
  catText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  catTextActive: { color: "#fff" },

  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroImage: { width: "100%", height: 260 },
  heroPlaceholder: {
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,18,36,0.55)",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  heroTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 27,
    marginBottom: 8,
  },
  heroExcerpt: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStat: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    marginHorizontal: 3,
  },
  heroTime: { color: "rgba(255,255,255,0.55)", fontSize: 11 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImage: { width: 100, height: 100, borderRadius: 16 },
  cardPlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, paddingLeft: 12, justifyContent: "space-between" },
  cardBadge: {
    backgroundColor: "#dbeafe",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
  },
  cardBadgeText: { color: Colors.primary, fontSize: 11, fontWeight: "600" },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 4,
  },
  cardExcerpt: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { fontSize: 11, color: Colors.textMuted, marginRight: 4 },
  dateText: { fontSize: 11, color: Colors.textMuted },

  list: { paddingTop: 8, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  loadingText: { color: Colors.textSecondary, marginTop: 8, fontSize: 14 },
  emptyText: { fontSize: 16, fontWeight: "500", color: Colors.textSecondary },
  resetText: { color: Colors.primary, marginTop: 4, fontSize: 14 },
});

// Skeleton стили
const sk = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    overflow: "hidden",
    height: 260,
    backgroundColor: "#E2E8F0",
  },
  heroInner: { position: "absolute", bottom: 20, left: 20, right: 20, gap: 8 },
  heroBadge: {
    width: 80,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#CBD5E1",
  },
  heroTitleL: {
    width: "100%",
    height: 20,
    borderRadius: 6,
    backgroundColor: "#CBD5E1",
  },
  heroTitleS: {
    width: "70%",
    height: 20,
    borderRadius: 6,
    backgroundColor: "#CBD5E1",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  body: { flex: 1, paddingLeft: 12, gap: 8, justifyContent: "center" },
  badge: { width: 60, height: 18, borderRadius: 9, backgroundColor: "#E2E8F0" },
  titleL: {
    width: "100%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  titleS: {
    width: "75%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  meta: {
    width: "50%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
});
