import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const members = [
  {
    id: "1",
    name: "S. Raju",
    email: "sraju@gmail.com",
    mobile: "9876543210",
    ticketNo: "B5002",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: "2",
    name: "S. Raju",
    email: "sraju@gmail.com",
    mobile: "9876543210",
    ticketNo: "B5002",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    id: "3",
    name: "S. Raju",
    email: "sraju@gmail.com",
    mobile: "9876543210",
    ticketNo: "B5002",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
  },
];

const CompletedMembersScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Member List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image source={{ uri: item.image }} style={styles.profileImage} />
              <Text style={styles.ticketText}>Ticket No - {item.ticketNo}</Text>
            </View>
            <Text style={styles.memberText}>Name : {item.name}</Text>
            <Text style={styles.memberText}>Email : {item.email}</Text>
            <Text style={styles.memberText}>Mobile : {item.mobile}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
  },
  headerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    margin: 10,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  ticketText: {
    fontWeight: "bold",
    color: "#374151",
  },
  memberText: {
    marginTop: 5,
    color: "#374151",
    fontWeight:"semibold"
  },
});

export default CompletedMembersScreen;
