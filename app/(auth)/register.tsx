import { API_URL } from "@/constants/api";
import { Colors } from "@/constants/colors";
import axios from "axios";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react-native";
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

const { width } = Dimensions.get("window");

// ✅ Компонент ВЫНЕСЕН за пределы RegisterScreen
interface FieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  keyboard?: any;
  secure?: boolean;
  showSecure?: boolean;
  onToggleSecure?: () => void;
  onChangeText: (t: string) => void;
  error?: string;
  inputRef?: React.RefObject<TextInput | null>;
  nextRef?: React.RefObject<TextInput | null>;
  last?: boolean;
  onSubmit?: () => void;
}

function Field({
  label,
  icon,
  value,
  placeholder,
  keyboard,
  secure,
  showSecure,
  onToggleSecure,
  onChangeText,
  error,
  inputRef,
  nextRef,
  last,
  onSubmit,
}: FieldProps) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, error ? s.inputError : null]}>
        {icon}
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboard || "default"}
          autoCapitalize="none"
          secureTextEntry={secure && !showSecure}
          returnKeyType={last ? "done" : "next"}
          onSubmitEditing={() =>
            last ? onSubmit?.() : nextRef?.current?.focus()
          }
          blurOnSubmit={false}
        />
        {secure && (
          <TouchableOpacity onPress={onToggleSecure}>
            {showSecure ? (
              <EyeOff size={18} color={Colors.textMuted} />
            ) : (
              <Eye size={18} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

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
    if (!form.name.trim()) e.name = "Введите имя";
    else if (form.name.trim().length < 2) e.name = "Имя слишком короткое";
    if (!form.email.trim()) e.email = "Введите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Неверный формат email";
    if (!form.phone.trim()) e.phone = "Введите номер телефона";
    else if (!/^[\+]?[0-9]{10,13}$/.test(form.phone.replace(/\s|-/g, "")))
      e.phone = "Неверный формат номера";
    if (!form.password) e.password = "Введите пароль";
    else if (form.password.length < 6) e.password = "Минимум 6 символов";
    else if (!/(?=.*[0-9])/.test(form.password))
      e.password = "Пароль должен содержать цифру";
    if (!form.confirmPassword) e.confirmPassword = "Повторите пароль";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Пароли не совпадают";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      shake();
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => router.replace("/(auth)/login"), 2000);
      }
    } catch (err: any) {
      setApiError(err.response?.data?.error || "Ошибка регистрации");
      shake();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View
        style={[
          s.container,
          { alignItems: "center", justifyContent: "center", padding: 32 },
        ]}
      >
        <Text style={{ fontSize: 56, marginBottom: 20 }}>✅</Text>
        <Text style={s.successTitle}>Аккаунт создан!</Text>
        <Text style={s.successSub}>Перенаправляем на страницу входа...</Text>
        <View style={s.accentLine} />
      </View>
    );
  }

  const passwordStrength =
    form.password.length >= 8 ? 3 : form.password.length >= 6 ? 2 : 1;

  return (
    <View style={s.container}>
      <View style={s.circle1} />
      <View style={s.circle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* Шапка */}
          <View style={s.topBar}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.topTitle}>SK-15</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={s.header}>
            <Text style={s.headerTitle}>Создать аккаунт</Text>
            <Text style={s.headerSub}>Присоединяйтесь к SK-15</Text>
          </View>

          <Animated.View
            style={[s.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            {apiError ? (
              <View style={s.apiError}>
                <Text style={s.apiErrorText}>⚠ {apiError}</Text>
              </View>
            ) : null}

            <Field
              label="Имя"
              placeholder="Ваше имя"
              icon={
                <User
                  size={18}
                  color={errors.name ? Colors.error : Colors.textMuted}
                />
              }
              value={form.name}
              onChangeText={(t) => set("name", t)}
              error={errors.name}
              inputRef={nameRef}
              nextRef={emailRef}
            />
            <Field
              label="Email"
              placeholder="example@mail.com"
              icon={
                <Mail
                  size={18}
                  color={errors.email ? Colors.error : Colors.textMuted}
                />
              }
              value={form.email}
              onChangeText={(t) => set("email", t)}
              keyboard="email-address"
              error={errors.email}
              inputRef={emailRef}
              nextRef={phoneRef}
            />
            <Field
              label="Номер телефона"
              placeholder="+7 777 123 45 67"
              icon={
                <Phone
                  size={18}
                  color={errors.phone ? Colors.error : Colors.textMuted}
                />
              }
              value={form.phone}
              onChangeText={(t) => set("phone", t)}
              keyboard="phone-pad"
              error={errors.phone}
              inputRef={phoneRef}
              nextRef={passwordRef}
            />
            <Field
              label="Пароль"
              placeholder="Минимум 6 символов"
              icon={
                <Lock
                  size={18}
                  color={errors.password ? Colors.error : Colors.textMuted}
                />
              }
              value={form.password}
              onChangeText={(t) => set("password", t)}
              secure
              showSecure={showPassword}
              onToggleSecure={() => setShowPassword((p) => !p)}
              error={errors.password}
              inputRef={passwordRef}
              nextRef={confirmRef}
            />

            {/* Индикатор силы пароля */}
            {form.password.length > 0 && (
              <View style={s.strengthWrap}>
                <Text style={s.strengthLabel}>Надёжность:</Text>
                <View style={s.strengthBars}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        s.strengthBar,
                        {
                          backgroundColor:
                            i <= passwordStrength
                              ? passwordStrength === 1
                                ? Colors.error
                                : passwordStrength === 2
                                  ? Colors.accent
                                  : Colors.success
                              : "#E5E7EB",
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[
                    s.strengthText,
                    {
                      color:
                        passwordStrength === 3
                          ? Colors.success
                          : passwordStrength === 2
                            ? Colors.accent
                            : Colors.error,
                    },
                  ]}
                >
                  {passwordStrength === 3
                    ? "Надёжный"
                    : passwordStrength === 2
                      ? "Средний"
                      : "Слабый"}
                </Text>
              </View>
            )}

            <Field
              label="Повторите пароль"
              placeholder="Повторите пароль"
              icon={
                <Lock
                  size={18}
                  color={
                    errors.confirmPassword ? Colors.error : Colors.textMuted
                  }
                />
              }
              value={form.confirmPassword}
              onChangeText={(t) => set("confirmPassword", t)}
              secure
              showSecure={showConfirm}
              onToggleSecure={() => setShowConfirm((p) => !p)}
              error={errors.confirmPassword}
              inputRef={confirmRef}
              last
              onSubmit={handleRegister}
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={s.btnText}>Создаём аккаунт...</Text>
              ) : (
                <>
                  <Text style={s.btnText}>Зарегистрироваться</Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.loginBtn} onPress={() => router.back()}>
              <Text style={s.loginText}>Уже есть аккаунт? </Text>
              <Text style={[s.loginText, s.loginLink]}>Войти</Text>
            </TouchableOpacity>
          </Animated.View>

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
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: Colors.accent,
    opacity: 0.06,
    bottom: width * 0.1,
    right: -width * 0.1,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 1,
  },
  header: { marginBottom: 24 },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  apiError: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  apiErrorText: { color: Colors.error, fontSize: 13 },
  fieldWrap: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  inputError: { borderColor: Colors.error, backgroundColor: "#fef2f2" },
  input: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    marginTop: -4,
  },
  strengthLabel: { fontSize: 12, color: Colors.textMuted },
  strengthBars: { flexDirection: "row", gap: 4 },
  strengthBar: { width: 28, height: 4, borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: "600" },
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
  loginBtn: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { color: Colors.primary, fontWeight: "700" },
  successTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  successSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginBottom: 20,
  },
  accentLine: {
    width: 40,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  copy: {
    textAlign: "center",
    color: "rgba(255,255,255,0.2)",
    fontSize: 12,
    marginTop: 24,
  },
});
