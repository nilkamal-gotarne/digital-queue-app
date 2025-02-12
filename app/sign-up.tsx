import React, { useEffect, useState } from "react";
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
  updateDoc,
  doc,
} from "firebase/firestore";
import OTPInput from "./otp";
import sendOtpEmail from "./send-otp";
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
  const [timer, setTimer] = useState(120); // 2 minutes
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const isDisabled = !phoneNumber || !name || !email || !password || !password2;
  console.log(phoneNumber, name, email, password, password2);

  function generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

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
        console.log("A user with this phone number already exists");
        return;
      }

      if (!emailSnapshot.empty) {
        console.log("A user with this email already exists");
        alert("A user with this email already exists");
        return;
      }
      const otp = generateOTP(6);
      const isVerified = false;
      console.log(otp);

      const now = Date.now();
      const tenMinutesLater = now + 10 * 60 * 1000;

      const userRef = await addDoc(collection(db, "users"), {
        phoneNumber,
        name,
        email,
        password,
        isVerified,
        ExpireTime: new Date(tenMinutesLater),
        otp,
        role: "user",
      });
      if (userRef) {
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>OTP Verification</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; text-align: center;">
    <div style="max-width: 500px; margin: 20px auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333;">${name} Your OTP Code</h2>
        <p style="font-size: 16px; color: #555;">Use the following OTP to verify your identity. The OTP is valid for 10 minutes.</p>
        <div style="font-size: 24px; font-weight: bold; color: #007bff; background: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block; margin: 10px 0;">
      ${otp}
        </div>
        <p style="color: #777; font-size: 14px;">If you did not request this OTP, please ignore this email.</p>
        <p style="color: #777; font-size: 14px;">Thank you,<br> Your Company Name</p>
    </div>
</body>
</html>`;
        await sendOtpEmail(email, 'Otp Verification', html);
        alert("Otp send successful!");
        setSignOtp(true);
      } else {
        alert("Otp send failed!");
      }
    } catch (error) {
      console.error("Error during sign up:", error);
      alert("Error during sign up. Please try again.");
    }
  };
  const handleVerifyOtp = async () => {
    try {
      const userRef = collection(db, "users");
      const findUserQuery = query(userRef, where("email", "==", email));
      const data = await getDocs(findUserQuery);

      if (data.empty) {
        alert("User not found!");
        return;
      }

      const userDoc = data.docs[0];
      const userData = userDoc.data();

      if (userData.otp === otp.join("")) {
        const userDocRef = doc(db, "users", userDoc.id);
        if (userData.ExpireTime >= Date.now()) {
          alert("Otp is expired");
          return;
        }

        await updateDoc(userDocRef, {
          isVerified: true,
          otp: "",
        });

        const newUser = {
          id: userDoc.id,
          phoneNumber: userData.phoneNumber,
          name: userData.name,
          email: userData.email,
          password: userData.password,
          isVerified: true,
          role: "user",
        };

        setUser(newUser);
        setIsLogged(true);
        await AsyncStorage.setItem("userInfo", JSON.stringify(newUser));
        await AsyncStorage.setItem("role", "user");
        alert("Sign up successful!");
        router.replace("/home");
      } else {
        alert("Enter a valid OTP!");
      }
    } catch (error) {
      console.error("Error during OTP verification:", error);
      alert("Error during OTP verification. Please try again.");
    }
  };
  const handleReSendOtp = async () => {
    try {
      const userRef = collection(db, "users");
      const findUserQuery = query(userRef, where("email", "==", email));
      const data = await getDocs(findUserQuery);

      if (data.empty) {
        alert("User not found!");
        return;
      }

      const userDoc = data.docs[0];
      const userData = userDoc.data();
      const otp = generateOTP(6);
      console.log("your otp is", otp);

      const now = Date.now();
      const tenMinutesLater = now + 10 * 60 * 1000;

      if (userData) {
        const userDocRef = doc(db, "users", userDoc.id);
        await updateDoc(userDocRef, {
          ExpireTime: new Date(tenMinutesLater),
          otp,
        });
        alert("Otp resend successful!");
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>OTP Verification</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; text-align: center;">
    <div style="max-width: 500px; margin: 20px auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333;">${name} Your OTP Code</h2>
        <p style="font-size: 16px; color: #555;">Use the following OTP to verify your identity. The OTP is valid for 10 minutes.</p>
        <div style="font-size: 24px; font-weight: bold; color: #007bff; background: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block; margin: 10px 0;">
      ${otp}
        </div>
        <p style="color: #777; font-size: 14px;">If you did not request this OTP, please ignore this email.</p>
        <p style="color: #777; font-size: 14px;">Thank you,<br> Your Company Name</p>
    </div>
</body>
</html>`;
        await sendOtpEmail(email, 'Otp Verification', html);
        setIsResendDisabled(true);
        setTimer(120);
      } else {
        alert("otp resend failed!");
      }
    } catch (error) {
      console.error("Error during OTP resend:", error);
      alert("Error during OTP resend. Please try again.");
    }
  };
  useEffect(() => {
    let interval: any;
    if (isResendDisabled && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsResendDisabled(false);
      setTimer(120); // Reset timer when completed
    }
    return () => clearInterval(interval);
  }, [isResendDisabled, timer]);

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {signOpt ? null : (
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
                  keyboardType="email-address" // Ensures correct keyboard on mobile
                  autoCapitalize="none" // Prevents automatic capitalization
                  autoComplete="email" // Suggests email autofill
                  textContentType="emailAddress" // Improves autofill on iOS
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
                  maxLength={10}
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
              <View
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  paddingBottom: 20,
                }}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => handleSignUp()}
                  disabled={isDisabled}
                >
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {signOpt && (
            <>
              <View style={styles.otpContainer}>
                <OTPInput
                  handleSignUp={handleSignUp}
                  otp={otp}
                  setOtp={setOtp}
                />
              </View>
              <TouchableOpacity
                onPress={() => handleReSendOtp()}
                disabled={isResendDisabled}
              >
                {/* <Text style={styles.resend}>Resend OTP</Text> */}
                <Text style={styles.resend}>
                  {isResendDisabled ? `Resend in ${timer}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
              <View>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => handleVerifyOtp()}
                >
                  <Text style={styles.buttonText}>Proceed</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    position: "relative",
    paddingVertical: 20,
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
    backgroundColor: "#3C73DC",
    padding: 12,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 100,
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
    marginBottom: 12,
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
    position: "absolute", // Keeps the button fixed at the bottom
    bottom: 20, // Adjusts the position from the bottom
    width: "100%", // Ensures full width
    alignItems: "center", // Centers the button horizontally
  },
});
