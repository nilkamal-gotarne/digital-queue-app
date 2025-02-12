import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";

export default function Index() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);  // Toggle state for password visibility
  const { setUser, setIsLogged }: any = useGlobalContext();
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState("");

  // useEffect(() => {
  //   const fetchQueueInfo = async () => {
  //     if (queueInfo) {
  //       if (queueInfo.position == 1) {
  //         setCountdown("You're first!");
  //       } else {
  //         const interval = setInterval(() => {
  //           const now = moment();
  //           const end = moment(queueInfo.endTime);
  //           const duration = moment.duration(end.diff(now));
  //           const hours = duration.hours().toString().padStart(2, "0");
  //           const minutes = duration.minutes().toString().padStart(2, "0");
  //           const seconds = duration.seconds().toString().padStart(2, "0");
  //           setCountdown(`${hours}:${minutes}:${seconds}`);
  //         }, 1000);
  //         return () => clearInterval(interval);
  //       }
  //     }
  //   };

  //   fetchQueueInfo();
  // }, [queueInfo]);

  // const handleLogin = async () => {
  //   if (!phoneNumber || !password) {
  //     if (!phoneNumber && !password) {
  //       alert("Please enter your phone number and password.");
  //     } else if (!phoneNumber) {
  //       alert("Please enter a valid phone number.");
  //     } else {
  //       alert("Please enter a valid password.");
  //     }
  //     return;
  //   }
  //   try {
  //     const usersRef = collection(db, "users");
  //     const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
  //     const querySnapshot = await getDocs(q);

  //     if (querySnapshot.empty) {
  //       alert("User not found. Please sign up.");
  //       return;
  //     }

  //     const userData = querySnapshot.docs[0].data();
  //     if (userData.password !== password) {
  //       alert("Incorrect password. Please try again.");
  //       return;
  //     }

  //     userData.id = querySnapshot.docs[0].id;
  //     setUser(userData);
  //     setIsLogged(true);
  //     await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
  //     await AsyncStorage.setItem("role", userData.role || "user");

  //     const queueMembersRef = collection(db, "queue_members");
  //     const queueQuery = query(
  //       queueMembersRef,
  //       where("userId", "==", userData.id),
  //       where("status", "in", ["waiting", "processing"])
  //     );
  //     const queueSnapshot = await getDocs(queueQuery);
  //     if (!queueSnapshot.empty) {
  //       setQueueInfo(queueSnapshot.docs[0].data());
  //     }

  //     router.push("/home");
  //   } catch (err) {
  //     console.error(err);
  //     alert("Error during login.");
  //   }
  // };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require("../assets/logo.png")} style={styles.icon} />
      </View>
      {/* <Text style={styles.title}>Welcome to Digital Queue</Text> */}
      {/* <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#a0a0a0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        maxLength={10}
      />
      <Text style={styles.label} >Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#a0a0a0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
        />
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
        >
          <Ionicons
            name={isPasswordVisible ? "eye" : "eye-off"}  
            size={24}
            color="#a0a0a0"
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      {queueInfo && (
        <View style={styles.queueInfo}>
          <Text style={styles.queueInfoText}>
            Position: {queueInfo.position}
          </Text>
          <Text style={styles.queueInfoText}>Countdown: {countdown}</Text>
        </View>
      )} */}
      <View style={styles.bottomLinks}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/sign-in")}
        >
          <Text style={styles.link}>Queue Member</Text>
        </TouchableOpacity>
        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>Or</Text>
          <View style={styles.line} />
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/owner-login")}
        >
          <Text style={styles.link}>Queue Owner</Text>
        </TouchableOpacity>
        {/* New Button */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between", // Space between logo and buttons
    alignItems: "center", // Center horizontally
    backgroundColor: "#fff", // Light background color
    padding: 16,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
  },
  icon: {
    width: 150,  // Adjust size as needed
    height: 150,
    borderRadius: 100,  // Rounded corners
    borderWidth: 2,  // Optional border
    borderColor: "#ddd",  // Light gray border
    resizeMode: "contain",  // Ensures the image fits well
  },
  title: {
    fontSize: 24,
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
    fontSize: 16,
    borderWidth: 1, // Border thickness
    borderColor: "#ccc", // Light gray border color
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 0,
    // paddingVertical: 10,
    // paddingHorizontal: 10,
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
  bottomLinks: {
    width: "100%",
    alignItems: "center",
    marginTop: 30, // Background color for the container
  },
  link: {
    color: "#ffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  dividerContainer: {
    flexDirection: "row", // Arrange items in a row
    alignItems: "center", // Align items vertically
    marginVertical: 10, // Space above and below the divider
    width: "80%", // Match button width
  },
  line: {
    flex: 1, // Take remaining space
    height: 1, // Line thickness
    backgroundColor: "#000", // Line color
    fontWeight: "bold",
  },
  orText: {
    marginHorizontal: 8, // Space around "or"
    fontSize: 16,
    color: "#000", // Text color
    fontWeight: "bold",
  },
});

