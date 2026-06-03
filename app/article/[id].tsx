import { API_URL } from "@/constants/api";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Type,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface News {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  source_url: string | null;
  source_name: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  categories: { id: number; name: string; slug: string } | null;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  users: { name: string; avatar_url?: string | null } | null;
}

function renderContent(html: string, fontSize: number) {
  if (!html) return null;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  const withImgMarkers = html.replace(imgRegex, (_, src) => {
    images.push(src);
    return `\n##IMG##${images.length - 1}##IMG##\n`;
  });

  const clean = withImgMarkers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n##H1##$1##H1##\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n##H2##$1##H2##\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n##H3##$1##H3##\n")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      return `\n##QUOTE##${text}##QUOTE##\n`;
    })
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n• $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "$1")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "$1")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "$1")
    .replace(/<u[^>]*>(.*?)<\/u>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const parts = clean.split("\n").filter((p) => p.trim());

  return parts.map((part, i) => {
    if (part.startsWith("##IMG##")) {
      const index = parseInt(part.replace(/##IMG##/g, "").trim());
      const src = images[index];
      if (!src) return null;
      return (
        <View key={i} style={cs.imgWrap}>
          <Image source={{ uri: src }} style={cs.img} resizeMode="cover" />
        </View>
      );
    }
    if (part.startsWith("##H1##"))
      return (
        <Text key={i} style={[cs.h1, { fontSize: fontSize + 8 }]}>
          {part.replace(/##H1##/g, "").trim()}
        </Text>
      );
    if (part.startsWith("##H2##"))
      return (
        <Text key={i} style={[cs.h2, { fontSize: fontSize + 4 }]}>
          {part.replace(/##H2##/g, "").trim()}
        </Text>
      );
    if (part.startsWith("##H3##"))
      return (
        <Text key={i} style={[cs.h3, { fontSize: fontSize + 2 }]}>
          {part.replace(/##H3##/g, "").trim()}
        </Text>
      );
    if (part.startsWith("##QUOTE##"))
      return (
        <View key={i} style={cs.quoteWrap}>
          <Text style={[cs.quote, { fontSize }]}>
            {part.replace(/##QUOTE##/g, "").trim()}
          </Text>
        </View>
      );
    if (part.startsWith("•"))
      return (
        <Text key={i} style={[cs.bullet, { fontSize }]}>
          {part}
        </Text>
      );
    if (part.trim())
      return (
        <Text
          key={i}
          style={[cs.paragraph, { fontSize, lineHeight: fontSize * 1.7 }]}
        >
          {part.trim()}
        </Text>
      );
    return null;
  });
}

// Skeleton для статьи
function ArticleSkeleton() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim }}>
      <View style={sk.cover} />
      <View style={sk.body}>
        <View style={sk.badge} />
        <View style={sk.titleL} />
        <View style={sk.titleM} />
        <View style={sk.titleS} />
        <View style={{ height: 16 }} />
        <View style={sk.line} />
        <View style={sk.line} />
        <View style={sk.lineShort} />
        <View style={{ height: 12 }} />
        <View style={sk.line} />
        <View style={sk.line} />
        <View style={sk.lineShort} />
        <View style={{ height: 12 }} />
        <View style={sk.imgPlaceholder} />
        <View style={{ height: 12 }} />
        <View style={sk.line} />
        <View style={sk.line} />
        <View style={sk.lineShort} />
      </View>
    </Animated.View>
  );
}

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [news, setNews] = useState<News | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [fontSize, setFontSize] = useState(15);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    try {
      const [newsRes, commentsRes, relatedRes] = await Promise.all([
        axios.get(`${API_URL}/api/news/${id}`),
        axios.get(`${API_URL}/api/comments?news_id=${id}`),
        axios.get(`${API_URL}/api/news?limit=4`),
      ]);
      if (newsRes.data.success) {
        setNews(newsRes.data.data);
        setLikesCount(newsRes.data.data.likes_count || 0);
      }
      if (commentsRes.data.success) setComments(commentsRes.data.data);
      if (relatedRes.data.success) {
        setRelated(
          relatedRes.data.data
            .filter((n: News) => n.id !== parseInt(id))
            .slice(0, 3),
        );
      }
      if (user) {
        const likeRes = await axios.get(
          `${API_URL}/api/likes?news_id=${id}&user_id=${user.id}`,
        );
        if (likeRes.data.success) setLiked(likeRes.data.liked);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/likes`, {
        news_id: parseInt(id),
        user_id: user.id,
      });
      if (res.data.success) {
        setLiked(res.data.liked);
        setLikesCount((p) => (res.data.liked ? p + 1 : p - 1));
      }
    } catch {}
  };

  const handleBookmark = async () => {
    if (!news) return;
    try {
      const saved = await AsyncStorage.getItem("bookmarks");
      const bookmarks = saved ? JSON.parse(saved) : [];
      if (bookmarked) {
        await AsyncStorage.setItem(
          "bookmarks",
          JSON.stringify(bookmarks.filter((b: any) => b.id !== news.id)),
        );
      } else {
        bookmarks.push(news);
        await AsyncStorage.setItem("bookmarks", JSON.stringify(bookmarks));
      }
      setBookmarked((p) => !p);
    } catch {}
  };

  const handleShare = async () => {
    if (!news) return;
    try {
      await Share.share({
        title: news.title,
        message: `${news.title}\n\n${news.source_url || ""}`,
      });
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/api/comments`, {
        news_id: parseInt(id),
        user_id: user.id,
        content: commentText.trim(),
      });
      if (res.data.success) {
        setComments((p) => [res.data.data, ...p]);
        setCommentText("");
      }
    } catch {
      setComments((p) => [
        {
          id: Date.now(),
          content: commentText,
          created_at: new Date().toISOString(),
          users: {
            name: user.name || "Вы",
            avatar_url: user.avatar_url || null,
          },
        },
        ...p,
      ]);
      setCommentText("");
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    Alert.alert("Удалить комментарий?", "Это действие нельзя отменить", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/api/comments/${commentId}`);
            setComments((p) => p.filter((c) => c.id !== commentId));
          } catch {}
        },
      },
    ]);
  };

  useEffect(() => {
    const checkBookmark = async () => {
      if (!news) return;
      const saved = await AsyncStorage.getItem("bookmarks");
      if (saved)
        setBookmarked(JSON.parse(saved).some((b: any) => b.id === news.id));
    };
    checkBookmark();
  }, [news]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatShort = (date: string) =>
    new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>
          {news?.categories?.name || "Статья"}
        </Text>
        <View style={s.topActions}>
          {/* Размер шрифта */}
          <TouchableOpacity
            style={s.topBtn}
            onPress={() => setFontSize((p) => (p >= 20 ? 13 : p + 2))}
          >
            <Type size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.topBtn} onPress={handleShare}>
            <Share2 size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.topBtn} onPress={handleBookmark}>
            <Bookmark
              size={18}
              color={bookmarked ? Colors.accent : Colors.text}
              fill={bookmarked ? Colors.accent : "none"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ArticleSkeleton />
        </ScrollView>
      ) : !news ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>
            Новость не найдена
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Назад</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Обложка */}
          {news.image_url ? (
            <Image source={{ uri: news.image_url }} style={s.cover} />
          ) : (
            <View style={[s.cover, s.coverPlaceholder]}>
              <Text style={{ fontSize: 52 }}>📰</Text>
            </View>
          )}

          <View style={s.body}>
            {/* Мета */}
            <View style={s.metaRow}>
              {news.categories && (
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>{news.categories.name}</Text>
                </View>
              )}
              <View style={s.dateRow}>
                <Clock size={12} color={Colors.textMuted} />
                <Text style={s.dateText}> {formatDate(news.created_at)}</Text>
              </View>
            </View>

            {/* Заголовок */}
            <Text style={[s.title, { fontSize: fontSize + 7 }]}>
              {news.title}
            </Text>

            {/* Excerpt */}
            {news.excerpt ? (
              <View style={s.excerptWrap}>
                <View style={s.excerptLine} />
                <Text style={[s.excerpt, { fontSize }]}>{news.excerpt}</Text>
              </View>
            ) : null}

            {/* Размер шрифта подсказка */}
            <View style={s.fontHint}>
              <Type size={12} color={Colors.textMuted} />
              <Text style={s.fontHintText}>
                Нажмите Аа для изменения размера текста · {fontSize}px
              </Text>
            </View>

            {/* Контент */}
            <View style={s.content}>
              {renderContent(news.content, fontSize)}
            </View>

            {/* Источник */}
            {news.source_name && (
              <View style={s.sourceWrap}>
                <Text style={s.sourceLabel}>Источник</Text>
                <Text style={s.sourceText}>{news.source_name}</Text>
              </View>
            )}

            {/* Действия */}
            <View style={s.actions}>
              <View style={s.actionsLeft}>
                <View style={s.stat}>
                  <Eye size={15} color={Colors.textMuted} />
                  <Text style={s.statText}>{news.views}</Text>
                </View>
                <View style={s.stat}>
                  <MessageSquare size={15} color={Colors.textMuted} />
                  <Text style={s.statText}>{comments.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.likeBtn, liked && s.likeBtnActive]}
                onPress={handleLike}
              >
                <Heart
                  size={16}
                  color={liked ? Colors.error : Colors.textMuted}
                  fill={liked ? Colors.error : "none"}
                />
                <Text style={[s.likeBtnText, liked && { color: Colors.error }]}>
                  {likesCount}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Комментарии */}
            <View style={s.commentsSection}>
              <Text style={s.sectionTitle}>
                Комментарии ({comments.length})
              </Text>

              <View style={s.commentInput}>
                <TextInput
                  style={s.commentField}
                  placeholder="Напишите комментарий..."
                  placeholderTextColor={Colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[s.sendBtn, !commentText.trim() && s.sendBtnDisabled]}
                  onPress={handleComment}
                  disabled={sending || !commentText.trim()}
                >
                  <Text style={s.sendBtnText}>
                    {sending ? "..." : "Отправить"}
                  </Text>
                </TouchableOpacity>
              </View>

              {comments.length === 0 ? (
                <View style={s.emptyComments}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                  <Text style={s.emptyText}>Будьте первым!</Text>
                </View>
              ) : (
                comments.map((comment) => {
                  const isOwn = user && comment.users?.name === user.name;
                  return (
                    <View key={comment.id} style={s.comment}>
                      {comment.users?.avatar_url ? (
                        <Image
                          source={{ uri: comment.users.avatar_url }}
                          style={s.commentAvatarImg}
                        />
                      ) : (
                        <View style={s.commentAvatar}>
                          <Text style={s.commentAvatarText}>
                            {comment.users?.name?.charAt(0)?.toUpperCase() ||
                              "А"}
                          </Text>
                        </View>
                      )}
                      <View style={[s.commentBody, { flex: 1 }]}>
                        <View style={s.commentHeader}>
                          <Text style={s.commentName}>
                            {comment.users?.name || "Аноним"}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Text style={s.commentDate}>
                              {formatShort(comment.created_at)}
                            </Text>
                            {isOwn && (
                              <TouchableOpacity
                                onPress={() => deleteComment(comment.id)}
                              >
                                <Text
                                  style={{ color: Colors.error, fontSize: 11 }}
                                >
                                  Удалить
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <Text style={s.commentText}>{comment.content}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Похожие */}
            {related.length > 0 && (
              <View style={s.relatedSection}>
                <Text style={s.sectionTitle}>Читайте также</Text>
                {related.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.relatedCard}
                    onPress={() => router.push(`/article/${item.id}`)}
                  >
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={s.relatedImage}
                      />
                    ) : (
                      <View
                        style={[
                          s.relatedImage,
                          {
                            backgroundColor: "#f3f4f6",
                            alignItems: "center",
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <Text>📰</Text>
                      </View>
                    )}
                    <View style={s.relatedBody}>
                      {item.categories && (
                        <Text style={s.relatedCat}>{item.categories.name}</Text>
                      )}
                      <Text style={s.relatedTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={s.relatedDate}>
                        {formatShort(item.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginHorizontal: 8,
  },
  topActions: { flexDirection: "row", gap: 6 },

  cover: { width: "100%", height: 260 },
  coverPlaceholder: {
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { padding: 18, paddingBottom: 20 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  catBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  catBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dateText: { color: Colors.textMuted, fontSize: 12, marginLeft: 3 },

  title: {
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
    marginBottom: 16,
  },

  excerptWrap: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  excerptLine: { width: 3, borderRadius: 2, backgroundColor: Colors.primary },
  excerpt: { flex: 1, color: "#334155", lineHeight: 22, fontStyle: "italic" },

  fontHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    opacity: 0.5,
  },
  fontHintText: { fontSize: 11, color: Colors.textMuted },

  content: { marginBottom: 24 },

  sourceWrap: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#CBD5E1",
  },
  sourceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sourceText: { fontSize: 13, color: Colors.textSecondary },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 24,
  },
  actionsLeft: { flexDirection: "row", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { color: Colors.textMuted, fontSize: 13 },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  likeBtnActive: { backgroundColor: "#FEF2F2" },
  likeBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },

  commentsSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 14,
  },
  commentInput: { marginBottom: 16 },
  commentField: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyComments: { alignItems: "center", paddingVertical: 24 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  comment: { flexDirection: "row", gap: 10, marginBottom: 14 },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  commentAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  commentBody: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentName: { fontWeight: "600", fontSize: 13, color: Colors.text },
  commentDate: { fontSize: 11, color: Colors.textMuted },
  commentText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  relatedSection: { marginBottom: 20 },
  relatedCard: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  relatedImage: { width: 80, height: 70, borderRadius: 12 },
  relatedBody: { flex: 1, justifyContent: "center" },
  relatedCat: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
  },
  relatedDate: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },

  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  backBtnText: { color: "#fff", fontWeight: "700" },
});

const cs = StyleSheet.create({
  h1: {
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
    marginTop: 20,
    marginBottom: 8,
  },
  h2: {
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 28,
    marginTop: 16,
    marginBottom: 6,
  },
  h3: {
    fontWeight: "600",
    color: "#1E293B",
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: { color: "#334155", marginBottom: 12 },
  bullet: { color: "#334155", marginBottom: 6, paddingLeft: 4 },
  quoteWrap: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 14,
    marginVertical: 12,
  },
  quote: { color: "#475569", fontStyle: "italic", lineHeight: 22 },
  imgWrap: {
    width: "100%",
    marginVertical: 14,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  img: { width: "100%", height: 220 },
});

const sk = StyleSheet.create({
  cover: { width: "100%", height: 260, backgroundColor: "#E2E8F0" },
  body: { padding: 18, gap: 10 },
  badge: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  titleL: {
    width: "100%",
    height: 22,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  titleM: {
    width: "85%",
    height: 22,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  titleS: {
    width: "60%",
    height: 22,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  line: {
    width: "100%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#EEF0F3",
  },
  lineShort: {
    width: "70%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#EEF0F3",
  },
  imgPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
});
