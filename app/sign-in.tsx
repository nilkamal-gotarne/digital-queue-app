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
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import OTPInput from "./otp";
import sendOtpEmail from "./send-otp";

export default function Index() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setIsLogged }: any = useGlobalContext();
  const [showPassword, setShowPassword] = useState(false);
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerify, setIsVerify] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState(120); // 2 minutes
  const [isResendDisabled, setIsResendDisabled] = useState(false);

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

  function generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

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
      if (!userData.isVerified) {
        Alert.alert(
          "Verification Required",
          "Please verify your phone number to proceed.",
          [{ text: "OK", onPress: () => handleReSendOtp() }]
        );
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
  const handleVerifyOtp = async () => {
    try {
      const userRef = collection(db, "users");
      const findUserQuery = query(
        userRef,
        where("phoneNumber", "==", phoneNumber)
      );
      const data = await getDocs(findUserQuery);

      if (data.empty) {
        alert("User not found!");
        return;
      }

      const userDoc = data.docs[0];
      const userData = userDoc.data();
      console.log(otp);

      if (userData.otp === otp.join("")) {
        const userDocRef = doc(db, "users", userDoc.id);
        if (moment().isAfter(moment(userData.ExpireTime))) {
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
        await AsyncStorage.setItem("role", newUser.role || "user");
        console.log(newUser.id);
        const queueMembersRef = collection(db, "queue_members");
        const queueQuery = query(
          queueMembersRef,
          where("userId", "==", newUser.id),
          where("status", "in", ["waiting", "processing"])
        );
        const queueSnapshot = await getDocs(queueQuery);
        if (!queueSnapshot.empty) {
          setQueueInfo(queueSnapshot.docs[0].data());
        }

        router.push("/home");
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
      setIsVerify(true);
      const userRef = collection(db, "users");
      const findUserQuery = query(
        userRef,
        where("phoneNumber", "==", phoneNumber)
      );
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
        <h2 style="color: #333;">${userData.name} Your OTP Code</h2>
        <p style="font-size: 16px; color: #555;">Use the following OTP to verify your identity. The OTP is valid for 10 minutes.</p>
        <div style="font-size: 24px; font-weight: bold; color: #007bff; background: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block; margin: 10px 0;">
      ${otp}
        </div>
        <p style="color: #777; font-size: 14px;">If you did not request this OTP, please ignore this email.</p>
        <p style="color: #777; font-size: 14px;">Thank you,<br> Your Company Name</p>
    </div>
</body>
</html>`;
        await sendOtpEmail(userData.email, "Otp Verification", html);
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
          {isVerify ? (
            <View style={styles.formContainer}>
              <OTPInput
                handleSignUp={handleVerifyOtp}
                otp={otp}
                setOtp={setOtp}
              />
              <View>
                <TouchableOpacity
                  disabled={isResendDisabled}
                  onPress={() => handleReSendOtp()}
                >
                  <Text style={styles.link2}>
                    {isResendDisabled ? `Resend in ${timer}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
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
                <TouchableOpacity
                  onPress={() => router.push("/reset-password")}
                >
                  <Text style={styles.link2}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {queueInfo && (
            <View style={styles.queueInfo}>
              <Text style={styles.queueInfoText}>
                Position: {queueInfo.position}
              </Text>
              <Text style={styles.queueInfoText}>Countdown: {countdown}</Text>
            </View>
          )}
          <View style={styles.bottomContainer}>
            {!isVerify ? (
              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Proceed</Text>
                )}
              </TouchableOpacity>
            )}

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
    backgroundColor: "#3C73DC",
    padding: 12,
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
    color: "#3C73DC",
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
