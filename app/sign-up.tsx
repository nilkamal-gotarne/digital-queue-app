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
} from "react-native";
import React, { useState } from "react";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/firebaseConfig";
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppHeader from "@/components/Header";

export default function SignUp() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { setUser, setIsLogged } = useGlobalContext();

  const handleSignUp = async () => {
    if (!name) {
      alert("Please enter your name.");
      return;
    }
  
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      alert("Please enter a valid name.");
      return;
    }
  
    if (!email) {
      alert("Please enter your email.");
      return;
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
  
    if (!phoneNumber) {
      alert("Please enter your phone number.");
      return;
    }
  
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
  
    if (!password) {
      alert("Please enter your password.");
      return;
    }
  
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert(
        "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
      return;
    }
  
    try {
      const usersRef = collection(db, "users");
      const phoneQuery = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const emailQuery = query(usersRef, where("email", "==", email));
  
      const [phoneSnapshot, emailSnapshot] = await Promise.all([
        getDocs(phoneQuery),
        getDocs(emailQuery),
      ]);
  
      if (!phoneSnapshot.empty) {
        alert("A user with this phone number already exists.");
        return;
      }
  
      if (!emailSnapshot.empty) {
        alert("A user with this email already exists.");
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <AppHeader title="Sign Up" />
        <View style={styles.container}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#a0a0a0"
            value={name}
            onChangeText={setName}
          />
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
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#a0a0a0"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Password</Text>
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
          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <View style={styles.bottomLinks}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  input: {
    borderColor: "#333",
    borderWidth: 1,
    width: "100%",
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: "#4287f5",
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  label: {
    color: 'black',
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '600',
  },
});
