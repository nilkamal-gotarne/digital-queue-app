import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ResetPasswordScreen = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>

        {/* New Password Input */}
        <View>
          <TextInput
            placeholder="Enter New Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
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

        {/* Confirm Password Input */}
        <View>
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
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
        {/* OTP Section */}
        <View>
          <Text style={styles.label2}>Enter OTP from your Email</Text>
          <View style={styles.otpContainer}>
            {Array(6)
              .fill("")
              .map((_, index) => (
                <TextInput
                  key={index}
                  style={styles.otpInput}
                  maxLength={1}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              ))}
          </View>
        </View>
      </View>

      {/* Submit Button - Now Positioned at the Bottom */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  content: {
    flex: 1, // Allows content to expand while leaving space for the button
    // justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
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
    borderColor: "#ccc",
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: 18,
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
    width: "80%",
    gap: 5,
    alignSelf: "center",
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#4493CC",
    borderRadius: 8,
    fontSize: 18,
    backgroundColor: "#fff",
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
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ResetPasswordScreen;
