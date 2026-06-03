import { API_URL } from "@/constants/api";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  const passwordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Введите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Неверный формат email";
    if (!password) e.password = "Введите пароль";
    else if (password.length < 6) e.password = "Минимум 6 символов";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    console.log("handleLogin вызван", email, password);
    const isValid = validate();
    console.log("validate:", isValid, errors);
    if (!isValid) {
      shake();
      return;
    }
    if (!validate()) {
      shake();
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      if (res.data.success) {
        await login(res.data.token, res.data.user);
        router.replace("/(app)");
      } else {
        setApiError(res.data.error || "Ошибка входа");
        shake();
      }
    } catch (err: any) {
      console.log("Тип ошибки:", err?.message);
      console.log("Stack:", err?.stack);
      if (err?.message?.includes("Network") || err?.response) {
        setApiError(err.response?.data?.error || "Ошибка сети");
        shake();
      }
      // Если ошибка от router.replace — игнорируем, юзер уже залогинен
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Фон */}
      <View style={s.bgTop} />
      <View style={s.circle1} />
      <View style={s.circle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* Лого */}
          <View style={s.logoWrap}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={s.logo}
              contentFit="contain"
            />
          </View>

          {/* Карточка */}
          <Animated.View
            style={[s.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={s.cardTitle}>Добро пожаловать</Text>
            <Text style={s.cardSub}>Войдите в свой аккаунт SK-15</Text>

            {/* API ошибка */}
            {apiError ? (
              <View style={s.apiError}>
                <Text style={s.apiErrorText}>⚠ {apiError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <View style={[s.inputWrap, errors.email && s.inputError]}>
                <Mail
                  size={18}
                  color={errors.email ? Colors.error : Colors.textMuted}
                />
                <TextInput
                  style={s.input}
                  placeholder="example@mail.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErrors((p) => ({ ...p, email: "" }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email ? (
                <Text style={s.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Пароль */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Пароль</Text>
              <View style={[s.inputWrap, errors.password && s.inputError]}>
                <Lock
                  size={18}
                  color={errors.password ? Colors.error : Colors.textMuted}
                />
                <TextInput
                  ref={passwordRef}
                  style={s.input}
                  placeholder="Ваш пароль"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrors((p) => ({ ...p, password: "" }));
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.textMuted} />
                  ) : (
                    <Eye size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={s.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Кнопка */}
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={s.btnText}>Входим...</Text>
              ) : (
                <>
                  <Text style={s.btnText}>Войти</Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Разделитель */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>или</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Ссылка на регистрацию */}
            <TouchableOpacity
              style={s.registerBtn}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={s.registerText}>Нет аккаунта? </Text>
              <Text style={[s.registerText, s.registerLink]}>
                Зарегистрироваться
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Копирайт */}
          <Text style={s.copy}>
            SK-15 © Петропавловск {new Date().getFullYear()}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1b2a" },
  bgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    backgroundColor: "#0d1b2a",
  },
  circle1: {
    position: "absolute",
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: Colors.primary,
    opacity: 0.08,
    top: -width * 0.5,
    left: -width * 0.05,
  },
  circle2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: Colors.accent,
    opacity: 0.06,
    top: height * 0.1,
    right: -width * 0.15,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  logoWrap: { alignItems: "center", paddingTop: 60, marginBottom: 32 },
  logo: { width: 120, height: 110 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  cardSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },

  apiError: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  apiErrorText: { color: Colors.error, fontSize: 13 },

  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  inputError: { borderColor: Colors.error, backgroundColor: "#fef2f2" },
  input: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 5, marginLeft: 4 },

  btn: {
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
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { color: Colors.textMuted, fontSize: 13 },

  registerBtn: { flexDirection: "row", justifyContent: "center" },
  registerText: { fontSize: 14, color: Colors.textSecondary },
  registerLink: { color: Colors.primary, fontWeight: "700" },

  copy: {
    textAlign: "center",
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    marginTop: 24,
  },
});
