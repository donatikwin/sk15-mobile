import { API_URL } from "@/constants/api";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import axios from "axios";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function PushTokenRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Device.isDevice) return;

    const registerToken = async () => {
      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "94331f8d-ce23-4794-986d-9f59c1f42dcc",
        });

        await axios.post(`${API_URL}/api/push/token`, {
          user_id: user.id,
          token: tokenData.data,
          platform: "android",
        });
      } catch {}
    };

    registerToken();
  }, [user]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <PushTokenRegistrar />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="article/[id]"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
    </AuthProvider>
  );
}
