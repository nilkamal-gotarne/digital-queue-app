import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from "react-native";
interface OTPInputProps {

    handleSignUp: () => void;
  
    otp: string[];
  
    setOtp: React.Dispatch<React.SetStateAction<string[]>>;
  
  }
  

const OTPInput: React.FC<OTPInputProps> = ({ handleSignUp,otp,setOtp }) => {
 
  
  const otpRefs = Array(6)
    .fill(null)
    .map(() => useRef<TextInput>(null));

  const handleChangeText = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;

    if (text.length === 1 && index < 5) {
      otpRefs[index + 1].current?.focus(); // Move to next input
    }
    setOtp(newOtp);
  };

  const handleKeyPress = (event: any, index: number) => {
    if (
      event.nativeEvent.key === "Backspace" &&
      index > 0 &&
      otp[index] === ""
    ) {
      otpRefs[index - 1].current?.focus(); // Move focus back
    }
  };

  return (
    <View>
      <Text style={styles.label2}>
        Enter OTP<Text style={styles.asterisk}>*</Text>
      </Text>
      <View style={styles.otpContainer}>
        {otp.map((value, index) => (
          <TextInput
            key={index}
            ref={otpRefs[index]}
            style={styles.otpInput}
            maxLength={1}
            keyboardType="number-pad"
            textAlign="center"
            value={value}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)} // Handle Backspace
          />
        ))}
      </View>
      {/* <Text style={styles.resend}>Resend OTP</Text>
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity> */}
    </View>
  );
};

export default OTPInput;

const styles = StyleSheet.create({
  label2: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom:10,
    textAlign:"left"
  },
  asterisk: {
    color: "red",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlign: "center",
    fontSize: 18,
    marginHorizontal: 5,
  },
  resend: {
    textAlign: "center",
    color: "blue",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
