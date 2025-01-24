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
  const { setUser, setIsLogged }: any = useGlobalContext();
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState("");

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
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("User not found. Please sign up.");
        return;
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.password !== password) {
        alert("Incorrect password. Please try again.");
        return;
      }

      userData.id = querySnapshot.docs[0].id;
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
      colors={["#eaeaea", "#eaeaea", "#eaeaea"]}
      style={styles.container}
    >
      <Image source={require("../assets/waiting.png")} style={styles.icon} />
      <Text style={styles.title}>Welcome to Digital Queue</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#a0a0a0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#a0a0a0"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
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
      )}
      <View style={styles.bottomLinks}>
        <TouchableOpacity onPress={() => router.push("/owner-login")}>
          <Text style={styles.link}>Queue Owner Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/sign-up")}>
          <Text style={styles.link}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  icon: {
    width: 150,
    height: 150,
    marginBottom: 30,
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
  bottomLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 30,
  },
  link: {
    color: "#5A5A5A",
    textDecorationLine: "underline",
    fontSize: 16,
  },
});
