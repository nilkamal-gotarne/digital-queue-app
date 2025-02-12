import React from "react";
import { View, Text, SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FontAwesome, Feather } from "@expo/vector-icons";

const DashboardScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Cards Section */}
      <View style={styles.cardsContainer}>
        {/* Total Queue Members */}
        <View style={[styles.card, styles.yellowCard]}>
          <FontAwesome
            name="users"
            size={32}
            color="#FBBF24"
            style={styles.icon}
          />
          <Text style={styles.cardText}>Total Queue Members</Text>
        </View>

        {/* Completed Queue Members */}
        <View style={[styles.card, styles.blueCard]}>
          <Feather
            name="check-circle"
            size={32}
            color="#10B981"
            style={styles.icon}
          />
          <Text style={styles.cardText}>Completed Queue Members</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  icon: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 50,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    paddingHorizontal: 2,
    
  },
  card: {
    flex: 1,
    padding: 8,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 8,
    justifyContent: "center",
  },
  yellowCard: {
    backgroundColor: "#FCF1D3",
    height: 150,
  },
  blueCard: {
    backgroundColor: "#C6F9Fa",
    height: 150,
  },
  cardText: {
    color: "black",
    fontWeight: "600",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
});

export default DashboardScreen;
