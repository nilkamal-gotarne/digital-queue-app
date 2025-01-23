import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';

export default function QueueOwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
    >
      <Image
        source={require('../assets/waiting.png')}
        style={styles.icon}
      />
      <Text style={styles.title}>Queue Owner Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#a0a0a0"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
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
      <View style={styles.bottomLinks}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Back to User Login</Text>
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
    color: '#ffffff',
    textAlign: 'center',
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#4287f5",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomLinks: {
    marginTop: 20,
  },
  link: {
    color: '#ffffff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
