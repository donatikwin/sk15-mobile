import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const { token, loading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Анимация логотипа
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Появление текста после логотипа
      Animated.timing(textFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    // Ждём 2.5 сек потом редиректим
    const timer = setTimeout(() => {
      if (token) {
        router.replace("/(app)");
      } else {
        router.replace("/(auth)/login");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading, token]);

  return (
    <View style={s.container}>
      {/* Фоновые круги — декор */}
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.circle3} />

      {/* Логотип */}
      <Animated.View
        style={[
          s.logoWrap,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require("@/assets/images/logo.png")}
          style={s.logo}
          contentFit="contain"
        />
      </Animated.View>

      {/* Текст под логотипом */}
      <Animated.View style={[s.textWrap, { opacity: textFade }]}>
        <Text style={s.tagline}>Новости Северного Казахстана</Text>
        <View style={s.accentLine} />
      </Animated.View>

      {/* Загрузка внизу */}
      <Animated.View style={[s.bottomWrap, { opacity: textFade }]}>
        <View style={s.dotsWrap}>
          <LoadingDots />
        </View>
      </Animated.View>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[s.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1b2a",
    alignItems: "center",
    justifyContent: "center",
  },

  // Декоративные круги
  circle1: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: Colors.primary,
    opacity: 0.06,
    top: -width * 0.4,
    left: -width * 0.1,
  },
  circle2: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: Colors.accent,
    opacity: 0.05,
    bottom: -width * 0.2,
    right: -width * 0.2,
  },
  circle3: {
    position: "absolute",
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    borderWidth: 1,
    borderColor: Colors.primary,
    opacity: 0.15,
    top: height * 0.15,
    right: -width * 0.1,
  },

  // Логотип
  logoWrap: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 180,
    height: 165,
  },

  // Текст
  textWrap: {
    alignItems: "center",
    gap: 12,
  },
  tagline: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "400",
  },
  accentLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },

  // Нижняя часть
  bottomWrap: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    gap: 12,
  },
  dotsWrap: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
});
