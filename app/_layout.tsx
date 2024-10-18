import { Stack } from "expo-router";
import GlobalProvider from "../context/GlobalContext";

export default function RootLayout() {
  return (
    <GlobalProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="owner-login" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="owner-home" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="join-queue" options={{ headerShown: false }} />
        <Stack.Screen name="part-joins" options={{ headerShown: false }} />
      </Stack>
    </GlobalProvider>
  );
}
