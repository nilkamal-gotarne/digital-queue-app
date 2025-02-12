import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function QueueOwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { setUser, setIsLogged }: any = useGlobalContext();

  useEffect(() => {
    // Check if the user is already logged in
    const checkLoginStatus = async () => {
      const role = await AsyncStorage.getItem("role");
      if (role === "owner") {
        router.push("/owner-home");
      }
    };
    checkLoginStatus();
  }, []);

  useEffect(() => {
    // Prevent back navigation to login if already logged in
    const backAction = () => {
      Alert.alert("Hold on!", "Are you sure you want to exit the app?", [
        { text: "Cancel", style: "cancel" },
        { text: "YES", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const handleLogin = async () => {
    if (!email && !password) {
      alert("Please enter your Email and password.");
      return;
    }

    if (!email) {
      alert("Please enter a valid Email.");
      return;
    }

    if (!password) {
      alert("Please enter a valid password.");
      return;
    }

    try {
      const queueOwnersRef = collection(db, "queue_owners");
      const q = query(queueOwnersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Queue owner not found. Please check your email.");
        return;
      }

      const ownerData = querySnapshot.docs[0].data();
      if (ownerData.password !== password) {
        alert("Incorrect password. Please try again.");
        return;
      }

      // Queue owner exists and password is correct, save to global context and AsyncStorage
      const userData = {
        ...ownerData,
        id: querySnapshot.docs[0].id,
        role: "queue_owner",
      };
      setUser(userData);
      setIsLogged(true);
      await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
      await AsyncStorage.setItem("role", "owner");

      // Navigate to owner home
      router.push("/owner-home");
    } catch (error) {
      console.error("Error during login:", error);
      alert("Error during login. Please try again.");
    }
  };

  return (
    <LinearGradient
      colors={["#ffff", "#ffff", "#ffff"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          <Image source={require("../assets/logo.png")} style={styles.icon} />
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#a0a0a0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Password</Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                paddingHorizontal: 10,
              }}
            >
              {/* Password Input */}
              <TextInput
                style={{ flex: 1, height: 40, color: "#000" }}
                placeholder="Password"
                placeholderTextColor="#a0a0a0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword} // Toggle show/hide password
              />

              {/* Eye Icon Button */}
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
            {/* <View>
        <TouchableOpacity
          onPress={() => router.push("/sign-up")}
          style={styles.linkContainer}
        >
          <Text>Don't have an account?</Text>
          <Text style={styles.link}>Sign Up</Text>
        </TouchableOpacity>
      </View> */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                // padding: 10,
                marginTop: 26,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: "#000" }} />
              <Text style={{ marginHorizontal: 10 }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#000" }} />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 15,
                justifyContent: "space-between",
                marginTop: 20,
                alignItems: "center",
              }}
            >
              {/* Google Button */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  paddingVertical: 8,
                  paddingHorizontal: 30,
                  borderRadius: 50,
                  elevation: 3, // Android shadow
                  shadowColor: "#000", // iOS shadow
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    width: 35,
                    height: 35,
                    marginRight: 12,
                    marginLeft: -15,
                    backgroundColor: "#eeee",
                    borderRadius: 50,
                  }}
                >
                  <Image
                    source={{
                      uri: "https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png",
                    }}
                    style={{ width: 40, height: 40, padding: 12 }}
                  />
                </View>
                <Text
                  style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}
                >
                  Google
                </Text>
              </TouchableOpacity>

              {/* Facebook Button */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  paddingVertical: 8,
                  paddingHorizontal: 30,
                  borderRadius: 50,
                  elevation: 3,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    width: 35,
                    height: 35,
                    marginRight: 12,
                    marginLeft: -15,
                    backgroundColor: "#eeee",
                    borderRadius: 50,
                  }}
                >
                  <Image
                    source={{
                      uri: "https://cdn.creazilla.com/icons/7911211/facebook-icon-lg.png",
                    }}
                    style={{
                      width: 25,
                      height: 25,
                      padding: 12,

                      // Adjust padding if needed
                    }}
                  />
                </View>
                <Text
                  style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}
                >
                  Facebook
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* <View style={styles.bottomLinks}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Back to User Login</Text>
        </TouchableOpacity>
      </View> */}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  innerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
  },
  formContainer: {
    width: "100%",
  },
  icon: {
    width: 150, // Adjust size as needed
    height: 150,
    borderRadius: 100, // Rounded corners
    borderWidth: 2, // Optional border
    borderColor: "#ddd", // Light gray border
    resizeMode: "contain", // Ensures the image fits well
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#000",
    textAlign: "center",
  },
  input: {
    borderColor:"#333",
    borderWidth:1,
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    borderWidth: 1, // Border thickness
    borderColor: "#ccc", // Light gray border color
  },
  button: {
    backgroundColor: "#4287f5",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 30,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomContainer: {
    width: "100%",
    justifyContent: "flex-end", // Aligns content to the bottom
    alignItems: "center",
  },
  link: {
    color: "#4287f5",
    fontSize: 16,
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
  linkContainer: {
    flexDirection: "row", // Keep the texts in a single row
    alignItems: "center", // Vertically center the text
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
});
