import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import React, { useState } from "react";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/firebaseConfig";
import { LinearGradient } from 'expo-linear-gradient';

export default function SignUp() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setIsLogged } = useGlobalContext();

  const handleSignUp = async () => {
    if (!phoneNumber || !name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    // Data type validation
    if (typeof phoneNumber !== 'string' || typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
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
      const phoneQuery = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const emailQuery = query(usersRef, where("email", "==", email));

      const [phoneSnapshot, emailSnapshot] = await Promise.all([
        getDocs(phoneQuery),
        getDocs(emailQuery)
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
      colors={["#eaeaea", "#eaeaea", "#eaeaea"]}
      style={styles.container}
    >
      <Image
        source={require('../assets/waiting.png')}
        style={styles.icon}
      />
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#a0a0a0"
        value={name}
        onChangeText={setName}
      />
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
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#a0a0a0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <View style={styles.bottomLinks}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Back to Login</Text>
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
    color: '#000',
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
    borderWidth: 1, // Border thickness
    borderColor: "#ccc", // Light gray border color
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
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  link: {
    color: "#5A5A5A",
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
