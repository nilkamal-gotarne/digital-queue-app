import { Stack } from "expo-router";
import GlobalProvider from "../context/GlobalContext";
import { StyleSheet, View } from "react-native";

export default function RootLayout() {
  return (
    <GlobalProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="owner-login"
          options={{
            headerShown: true,
            title: "Owner Login",
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackground: () => <View style={styles.headerBackground} />,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            title: "Sign Up",
            headerShown: true,

            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackground: () => <View style={styles.headerBackground} />,
          }}
        />
        <Stack.Screen
          name="sign-in"
          options={{
            title: "Sign In",
            headerShown: true,

            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackground: () => <View style={styles.headerBackground} />,
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            title: "Reset Password",
            headerShown: true,

            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackground: () => <View style={styles.headerBackground} />,
          }}
        />
        <Stack.Screen name="owner-home" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen
          name="join-queue"
          options={{
            title: "QR Scanner",
            headerShown: true,
            headerTintColor: "#ffffff",
            headerStyle: { backgroundColor: "#007AFF" },
            headerTitleStyle: { fontWeight: "bold" },
          }}
        />
        <Stack.Screen
          name="part-joins"
          options={{
            title: "Past Join",
            headerShown: true,
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackground: () => <View style={styles.headerBackground} />,
          }}
        />
        <Stack.Screen
          name="token-page"
          options={{
            title: "Token Details",
            headerShown: true,
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackground: () => <View style={styles.headerBackground} />,
          }}
        />
      </Stack>
    </GlobalProvider>
  );
}
const styles = StyleSheet.create({
  headerBackground: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // height:100,
  },
});
