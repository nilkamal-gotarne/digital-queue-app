import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
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
      router.replace("/owner-home");
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
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1, // Border thickness
    borderColor: "#ccc", // Light gray border color
  },
  button: {
    backgroundColor: "#3C73DC",
    padding: 12,
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
    color: "#3C73DC",
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
