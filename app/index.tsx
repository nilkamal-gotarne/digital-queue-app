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
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';  // Import Ionicons
import AppHeader from "@/components/Header";

export default function Index() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);  // Toggle state for password visibility
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
            const hours = duration.hours().toString().padStart(2, '0');
            const minutes = duration.minutes().toString().padStart(2, '0');
            const seconds = duration.seconds().toString().padStart(2, '0');
            setCountdown(`${hours}:${minutes}:${seconds}`);
          }, 1000);
          return () => clearInterval(interval);
        }
      }
    };

    fetchQueueInfo();
  }, [queueInfo]);

  const handleLogin = async () => {
    // Check if phone number and password fields are filled
    if (!phoneNumber || !password) {
      alert("Please enter a valid phone number");
      return;
    }
    
    // Check if phone number is exactly 10 digits
    if (phoneNumber.length !== 10) {
      alert("Enter a valid Phone number.");
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
  
      router.replace("/home");
    } catch (err) {
      console.error(err);
      alert("Error during login.");
    }
  };
  
  return (
    <View>
      <AppHeader title="Sign In"/>
    <View
      // colors={['#ffffff', '#ffffff', '#ffffff']}
      style={styles.container}
    >
      {/* <Image
        source={require('../assets/waiting.png')}
        style={styles.icon}
      /> */}
      {/* <Text style={styles.title}>Welcome to Digital Queue</Text> */}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#a0a0a0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
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
        <View >
          <Text >Position: {queueInfo.position}</Text>
          <Text >Countdown: {countdown}</Text>
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
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    padding: 20,
    // backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    backgroundColor: "#4287f5",
    width: "100%",
    paddingVertical: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  input: {
    borderColor:"#333",
    borderWidth:1,
    width: "100%",
    height: 50,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  toggleButton: {
    position: 'absolute',
    right: 10,   // Ensures toggle stays aligned to the right
    padding: 10, // Consistent padding
    alignItems: 'center',
    top:3,
    justifyContent: 'center',
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
  bottomLinks: {
    flexDirection:"column",
    // justifyContent: "center",
    alignItems:"center",
    gap:20,
    width: "100%",
    marginTop: 20,
  },
  link: {
    color: "#4287f5",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  forgotPassword: {
    color: "#FF0000",
    fontSize: 14,
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  label: {
    color: 'black',
    fontSize: 16,
    marginBottom: 5,
    fontWeight:'600',
  },
});

