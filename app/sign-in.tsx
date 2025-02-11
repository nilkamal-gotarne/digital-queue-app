import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setIsLogged }: any = useGlobalContext();
  const [showPassword, setShowPassword] = useState(false);
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const fetchQueueInfo = async () => {
      if (queueInfo) {
        if (queueInfo.position == 1) {
          setCountdown("You're first!");
        } else {
          const interval = setInterval(() => {
            const now = moment();
            const end = moment(queueInfo.endTime);
            const duration = moment.duration(end.diff(now));
            const hours = duration.hours().toString().padStart(2, "0");
            const minutes = duration.minutes().toString().padStart(2, "0");
            const seconds = duration.seconds().toString().padStart(2, "0");
            setCountdown(`${hours}:${minutes}:${seconds}`);
          }, 1000);
          return () => clearInterval(interval);
        }
      }
    };

    fetchQueueInfo();
  }, [queueInfo]);

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      if (!phoneNumber && !password) {
        alert("Please enter your phone number and password.");
      } else if (!phoneNumber) {
        alert("Please enter a valid phone number.");
      } else {
        alert("Please enter a valid password.");
      }
      return;
    }
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("User not found. Please sign up.");
        setIsLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.password !== password) {
        alert("Incorrect password. Please try again.");
        setIsLoading(false);
        return;
      }

      userData.id = querySnapshot.docs[0].id;
      if(!userData.isVerified){
        alert("Please verify your phone number to proceed.");
        setIsLoading(false);
        return;
      }
      setUser(userData);
      setIsLogged(true);
      await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
      await AsyncStorage.setItem("role", userData.role || "user");

      const queueMembersRef = collection(db, "queue_members");
      const queueQuery = query(
        queueMembersRef,
        where("userId", "==", userData.id),
        where("status", "in", ["waiting", "processing"])
      );
      const queueSnapshot = await getDocs(queueQuery);
      if (!queueSnapshot.empty) {
        setQueueInfo(queueSnapshot.docs[0].data());
      }

      router.push("/home");
    } catch (err) {
      console.error(err);
      alert("Error during login.");
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
        nestedScrollEnabled={true}
      >
        <View style={styles.innerContainer}>
          <Image source={require("../assets/logo.png")} style={styles.icon} />
          <View style={styles.formContainer}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.asterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Phone Number"
              placeholderTextColor="#a0a0a0"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <View>
              <Text style={styles.label}>
                Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Password"
                placeholderTextColor="#a0a0a0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
              <TouchableOpacity  onPress={() => router.push("/reset-password")}>
              <Text style={styles.link2}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {queueInfo && (
            <View style={styles.queueInfo}>
              <Text style={styles.queueInfoText}>
                Position: {queueInfo.position}
              </Text>
              <Text style={styles.queueInfoText}>Countdown: {countdown}</Text>
            </View>
          )}
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomLinks}>
              <TouchableOpacity
                onPress={() => router.push("/sign-up")}
                style={styles.linkContainer}
              >
                <Text style={styles.boldText}>Don't have an account?</Text>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // alignItems: "center",
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
  headerStyle: {
    backgroundColor: "#3477F3",
    borderBottomLeftRadius: 15, // Rounded bottom-left corner
    borderBottomRightRadius: 15, // Rounded bottom-right corner
  },
  icon: {
    width: 150, // Adjust size as needed
    height: 150,
    borderRadius: 100, // Rounded corners
    borderWidth: 2, // Optional border
    borderColor: "#ddd", // Light gray border
    resizeMode: "contain", // Ensures the image fits well
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: 40,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#000",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#000",
    textAlign: "center",
  },
  asterisk: {
    color: "red", // Red color for asterisk (*)
    fontSize: 16,
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
    backgroundColor: "#4287f5",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  queueInfo: {
    marginTop: 20,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 15,
    borderRadius: 10,
  },
  queueInfoText: {
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 5,
  },
  bottomContainer: {
    width: "100%",
    justifyContent: "flex-end", // Aligns content to the bottom
    alignItems: "center",
  },
  bottomLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    // marginTop: 20,
  },
  boldText: {
    fontWeight: "bold", // Bold text
    fontSize: 16, // Slightly bigger text
    marginRight: 5, // Add spacing between texts
  },
  linkContainer: {
    flexDirection: "row", // Keep the texts in a single row
    alignItems: "center", // Vertically center the text
  },
  link: {
    color: "#4287f5",
    textDecorationLine: "underline",
    fontSize: 16,
    fontWeight: "bold",
  },
  container2: {
    flexDirection: "row", // Align items in a row
    alignItems: "center", // Vertically center the items
  },
  link2: {
    color: "red",
    marginLeft: 5,
    textAlign: "right",
  },
});
