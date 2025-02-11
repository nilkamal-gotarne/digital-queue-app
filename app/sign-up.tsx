import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/firebaseConfig";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import OTPInput from "./otp";
interface OTPInputProps {
  handleSignUp: () => void;

  otp: string[];

  setOtp: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function SignUp() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setIsLogged } = useGlobalContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [signOpt, setSignOtp] = useState(false);
  console.log("otp----", otp);

  const handleSignUp = async () => {
    if (!phoneNumber || !name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    // Data type validation
    if (
      typeof phoneNumber !== "string" ||
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      alert("Invalid input types");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    // Phone number format validation (assuming a simple 10-digit format)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    // Password strength validation
    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    try {
      // Check if user with same phone number or email already exists
      const usersRef = collection(db, "users");
      const phoneQuery = query(
        usersRef,
        where("phoneNumber", "==", phoneNumber)
      );
      const emailQuery = query(usersRef, where("email", "==", email));

      const [phoneSnapshot, emailSnapshot] = await Promise.all([
        getDocs(phoneQuery),
        getDocs(emailQuery),
      ]);

      if (!phoneSnapshot.empty) {
        alert("A user with this phone number already exists");
        return;
      }

      if (!emailSnapshot.empty) {
        alert("A user with this email already exists");
        return;
      }

      const userRef = await addDoc(collection(db, "users"), {
        phoneNumber,
        name,
        email,
        password,
        role: "user",
      });

      const newUser = {
        id: userRef.id,
        phoneNumber,
        name,
        email,
        role: "user",
      };

      setUser(newUser);
      setIsLogged(true);
      await AsyncStorage.setItem("userInfo", JSON.stringify(newUser));
      await AsyncStorage.setItem("role", "user");
      alert("Sign up successful!");
      router.replace("/home");
    } catch (error) {
      console.error("Error during sign up:", error);
      alert("Error during sign up. Please try again.");
    }
  };

  return (
    <LinearGradient
      colors={["#ffff", "#ffff", "#ffff"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <>
            <View>
              <Text style={styles.label}>
                Full Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#a0a0a0"
                value={name}
                onChangeText={setName}
              />
            </View>
            <View>
              <Text style={styles.label}>
                Email<Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#a0a0a0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View>
              <Text style={styles.label}>
                Mobile<Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#a0a0a0"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>
                Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
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
            </View>
            <View>
              <Text style={styles.label}>
                Confirm Password<Text style={styles.asterisk}> * </Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#a0a0a0"
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry={!showPassword2}
              />
              <TouchableOpacity
                onPress={() => setShowPassword2(!showPassword2)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword2 ? "eye" : "eye-off"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            {/* Sign Up Button */}

            {/* OTP Input should appear below form when signOpt is true */}
            {signOpt && (
              <>
                <View style={styles.otpContainer}>
                  <OTPInput
                    handleSignUp={handleSignUp}
                    otp={otp}
                    setOtp={setOtp}
                  />
                </View>
                <TouchableOpacity onPress={() => alert("OTP Resent!")}>
                  <Text style={styles.resend}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setSignOtp(true)}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    width: "100%",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: 40,
  },
  button: {
    backgroundColor: "#4287f5",
    padding: 12,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 40,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  asterisk: {
    color: "red", // Red color for asterisk (*)
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  label2: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 18,
    backgroundColor: "#fff",
  },
  resend: {
    textAlign: "right",
    color: "red",
  },
   buttonContainer: {
    position: "absolute",  // Keeps the button fixed at the bottom
    bottom: 20,            // Adjusts the position from the bottom
    width: "100%",         // Ensures full width
    alignItems: "center",  // Centers the button horizontally
  },
});
