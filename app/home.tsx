import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/Header";

const Tab = createBottomTabNavigator();

function HomeTab() {
  const { user }: any = useGlobalContext();
  const [joinedQueues, setJoinedQueues] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(moment());

  

  useEffect(() => {
    let unsubscribe: () => void;
  
    const setupQueueListener = async () => {
      if (user?.id) {
        const queueMembersRef = collection(db, "queue_members");
        const q = query(
          queueMembersRef,
          where("userId", "==", user.id),
          where("status", "in", ["waiting", "processing", "temporary_leave"])
        );
  
        unsubscribe = onSnapshot(q, async (snapshot) => {
          const queueData = await Promise.all(
            snapshot.docs.map(async (add:any) => {
              const queueMemberData = add.data();
              const queueId = queueMemberData.queueId;
              
              // Get the queue details from the 'queues' collection using queueId
              const queueDoc = await getDoc(doc(db, "queues", queueId));
              const queue:any = queueDoc.exists() ? queueDoc.data() : null;
  
              return {
                ...queueMemberData,
                id: add.id,
                queueName: queue?.name || "Unknown Queue", // Set a default name if queue not found
              };
            })
          );
          setJoinedQueues(queueData);
        });
      }
    };
  
    setupQueueListener();
  
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);
  
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(timer);
    };
  }, [user]);
  

  const getQueueItemStyle = (status: string) => {
    switch (status) {
      case "processing":
        return [styles.queueItem, styles.processingQueue];
      case "temporary_leave":
        return [styles.queueItem, styles.temporaryLeaveQueue];
      case "waiting":
        return [styles.queueItem, styles.waitingQueue];
      default:
        return styles.queueItem;
    }
  };

  const getRemainingTime = (endTime: any) => {
    const end = moment(endTime.toDate());
    const duration = moment.duration(end.diff(currentTime));

    if (duration.asSeconds() <= 0) {
      return "Time Up";
    }

    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.asMinutes()) % 60;
    const seconds = Math.floor(duration.asSeconds()) % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleLeaveQueue = async (
    queueMemberId: string,
    queueId: string,
    position: number
  ) => {
    console.log("==============>", queueMemberId, queueId, position);

    try {
      const batch = writeBatch(db);

      // Update the leaving member's status
      const leavingMemberRef = doc(db, "queue_members", queueMemberId);
      batch.update(leavingMemberRef, { status: "left" });

      // Get all queue members after the current position
      const queueMembersRef = collection(db, "queue_members");
      const membersAfterQuery = query(
        queueMembersRef,
        where("queueId", "==", queueId),
        where("position", ">=", position),
        where("status", "in", ["waiting", "processing", "temporary_leave"]),
        orderBy("position", "desc")
      );
      const membersAfterSnapshot = await getDocs(membersAfterQuery);

      let previousEndTime = null;

      // Update positions and end times for members after the leaving member
      for (let i = membersAfterSnapshot.docs.length - 1; i >= 0; i--) {
        const doc = membersAfterSnapshot.docs[i];
        const memberRef = doc.ref;
        const memberData = doc.data();
        const newPosition = memberData.position - 1;

        let newEndTime;
        if (previousEndTime) {
          newEndTime = previousEndTime;
        } else {
          newEndTime = memberData.endTime.toDate();
        }

        batch.update(memberRef, {
          position: newPosition,
          endTime: newEndTime,
        });

        previousEndTime = memberData.endTime.toDate();
      }

      // Commit the batch
      await batch.commit();

      console.log("Successfully left the queue and updated other members");
    } catch (error) {
      console.error("Error leaving queue:", error);
    }
  };

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    try {
      const memberRef = doc(db, "queue_members", memberId);
      const memberDoc = await getDoc(memberRef);
      const memberData = memberDoc.data() as any;

      if (!memberData) {
        throw new Error("Member data not found");
      }

      if (newStatus === "completed" || newStatus === "not_available") {
        const batch = writeBatch(db);

        // Update the completed member
        batch.update(memberRef, { status: "completed" });

        // Calculate the actual wait time for the completed member
        const actualWaitTime = moment().diff(
          moment(memberData.startTime.toDate()),
          "minutes"
        );

        // Update average wait time in the session
        const sessionRef = collection(db, "sessions");
        const q = query(sessionRef, where("adminId", "==", user.id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const sessionDoc = querySnapshot.docs[0];
          const sessionData = sessionDoc.data();
          const newTotalWaitTime =
            (sessionData.totalWaitTime || 0) + actualWaitTime;
          const newCompletedTasks = (sessionData.completedTasks || 0) + 1;
          const newAverageWaitTime = Math.round(
            newTotalWaitTime / newCompletedTasks
          );

          batch.update(sessionDoc.ref, {
            totalWaitTime: newTotalWaitTime,
            completedTasks: newCompletedTasks,
            averageWaitTime: newAverageWaitTime,
          });
        }

        // Get all queue members after the current position
        const queueMembersRef = collection(db, "queue_members");
        const membersAfterQuery = query(
          queueMembersRef,
          where("queueId", "==", user.queueId),
          where("position", ">", memberData.position),
          orderBy("position")
        );
        const membersAfterSnapshot = await getDocs(membersAfterQuery);

        // Calculate remaining time for the completed member
        const remainingTime = moment(memberData.endTime.toDate()).diff(
          moment(),
          "minutes"
        );

        // Update positions, end times, and waiting times for members after the completed member
        membersAfterSnapshot.docs.forEach((doc, index) => {
          const memberRef = doc.ref;
          const memberData = doc.data() as any;
          const newPosition = memberData.position - 1;
          const newEndTime = moment(memberData.endTime.toDate())
            .subtract(remainingTime, "minutes")
            .toDate();
          const newWaitingTime = Math.max(
            0,
            moment(newEndTime).diff(moment(), "minutes")
          );
          batch.update(memberRef, {
            position: newPosition,
            endTime: newEndTime,
            waitingTime: newWaitingTime,
          });
        });

        // Commit the batch
        await batch.commit();
      } else {
        await updateDoc(memberRef, {
          status: newStatus,
          startTime: new Date(),
        });
      }

      Alert.alert("Success", "Member status updated successfully.");
    } catch (error) {
      console.error("Error updating member status:", error);
      Alert.alert("Error", "Failed to update member status. Please try again.");
    }
  };

  return (
    <LinearGradient
      colors={["#ffff", "#ffff", "#ffff"]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.tabContent}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.bigButton}
            onPress={() => router.push("/join-queue")}
          >
            <View style={[styles.card, { backgroundColor: "#fcf1d3" }]}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="line-scan"
                  size={40}
                  color="#ffc937"
                />
              </View>
              <Text style={styles.bigButtonText}>Scan QR</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bigButton2}
            onPress={() => router.push("/part-joins")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#e1777f" }]}>
              <Entypo name="cross" size={40} color="white" />
            </View>
            <Text style={styles.bigButtonText}>Past Joined Queues</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.joinedQueuesSection}>
          <Text style={styles.sectionTitle}>Current Queues</Text>
          {joinedQueues.length > 0 ? (
            joinedQueues.map((queue, index) => (
              // console.log("abcxxxxxxxxxxxxxxx",queue),
              <View key={index} style={getQueueItemStyle(queue.status)}>
                <Text style={styles.queueText}>Queue: {queue.queueName}</Text>
                {/* <Text style={styles.queueText}>name: {queue.name}</Text> */}
                <Text style={styles.queueText}>Position: {queue.position}</Text>
                <Text style={styles.queueText}>Status: {queue.status}</Text>
                <Text style={styles.queueText}>
                  Remaining Time: {getRemainingTime(queue.endTime)}
                </Text>
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={() =>
                    handleLeaveQueue(queue.id, queue.queueId, queue.position,)
                  }
                >
                  <Text style={styles.leaveButtonText}>Permanently Leave</Text>
                </TouchableOpacity>
                {queue.status === "temporary_leave" ? (
                  <TouchableOpacity
                    style={styles.resumeButton}
                    onPress={() => updateMemberStatus(queue.id, "waiting")}
                  >
                    <Text style={styles.leaveButtonText}>Resume</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.temporaryLeaveButton}
                    onPress={() =>
                      updateMemberStatus(queue.id, "temporary_leave")
                    }
                  >
                    <Text style={styles.leaveButtonText}>Temporary Leave</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyQueueText}>
              You haven't joined any queues yet.
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.temporaryLeaveButton}
          onPress={() => router.push("/token-page")}
        >
          <Text style={styles.leaveButtonText}>Temporary Leave</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
    </View>
  );
}
function ProfileTab() {
  const { user, setUser, setIsLogged }: any = useGlobalContext();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "No",
          onPress: () => console.log("Logout cancelled"),
          style: "cancel"
        },
        {
          text: "Yes",
          onPress: async () => {
            setUser(null);
            setIsLogged(false);
            await AsyncStorage.removeItem("userInfo");
            await AsyncStorage.removeItem("role");
            router.replace("/");
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleUpdate = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Name and Email cannot be empty.");
      return;
    }

    const updatedUser = { ...user, name, email };
    setUser(updatedUser);
    await AsyncStorage.setItem("userInfo", JSON.stringify(updatedUser));
    setModalVisible(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  return (
    <LinearGradient colors={["#fff", "#fff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderColor: "#ccc",
            paddingBottom: 10,
            marginBottom: 15,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {user?.name || "Full Name"}
          </Text>
          <Text style={{ fontSize: 12, color: "gray" }}>Full Name</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderColor: "#ccc",
            paddingBottom: 10,
            marginBottom: 15,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {user?.email || "Email Address"}
          </Text>
          <Text style={{ fontSize: 12, color: "gray" }}>Email Address</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderColor: "#ccc",
            paddingBottom: 10,
            marginBottom: 15,
          }}
        >
          <TextInput
            style={{ fontSize: 16, paddingVertical: 5, fontWeight: "bold" }}
            placeholder="Mobile Number"
            keyboardType="numeric"
            value={user?.phoneNumber || ""}
          />
          <Text style={{ fontSize: 12, color: "gray", marginTop: 2 }}>
            Mobile Number
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: "#3477F3",
              padding: 12,
              borderRadius: 5,
              alignItems: "center",
              flex: 1,
              marginRight: 5,
              marginTop: 10,
            }}
            onPress={() => setModalVisible(true)}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              Update
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: "#E53935",
              padding: 12,
              borderRadius: 5,
              alignItems: "center",
              marginTop: 10,
              marginLeft: 5,
              flex: 1,
            }}
            onPress={handleLogout}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              LogOut
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              width: "80%",
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 10,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
            >
              Update Profile
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 5,
                padding: 10,
                marginBottom: 10,
              }}
              placeholder="Enter Name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 5,
                padding: 10,
                marginBottom: 10,
              }}
              placeholder="Enter Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "#4CAF50",
                  padding: 10,
                  borderRadius: 5,
                  flex: 1,
                  alignItems: "center",
                  marginRight: 5,
                }}
                onPress={handleUpdate}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}
                >
                  Save
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "#E53935",
                  padding: 10,
                  borderRadius: 5,
                  flex: 1,
                  alignItems: "center",
                  marginLeft: 5,
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

export default function Home() {
  const { user }: any = useGlobalContext();
  console.log("user-------ddmddm",user);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: "#007AFF",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 5,
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#b0b0b0",
        headerStyle: {
          backgroundColor: "#007AFF",
          borderBottomLeftRadius: 15, // Rounded bottom-left corner
          borderBottomRightRadius: 15, // Rounded bottom-right corner
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{
          tabBarLabel: "Home",
          // headerTitle: user?.name || "Home",
          headerTitle:`Hi ${user?.name || "Home"}`,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: "Profile",
          headerTitle: "Profile",
          headerShown:false,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  // container: {
  //   flex: 1,
  // },
  gradientContainer: {
    flex: 1,
    padding: 50,
  },
  tabContent: {
    padding: 10,
    paddingTop: 30,
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  bigButton: {
    backgroundColor: "#FCF1D3",
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bigButton2: {
    backgroundColor: "#FDD6D9",
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  card: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 10,
    borderRadius: 20,
  },
  Circle: {
    padding: 10,
    backgroundColor: "#E07680",
    borderRadius: 50,
  },
  Circle2: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 50,
  },
  iconCircle: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 40,
  },
  bigButtonText: {
    color: "black",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 15,
  },
  joinedQueuesSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  queueItem: {
    backgroundColor: "rgba(240, 230, 255, 0.8)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  processingQueue: {
    backgroundColor: "rgba(152, 251, 152, 0.8)",
  },
  temporaryLeaveQueue: {
    backgroundColor: "rgba(255, 215, 0, 0.8)",
  },
  waitingQueue: {
    backgroundColor: "rgba(135, 206, 250, 0.8)",
  },
  queueText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#000",
  },
  emptyQueueText: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#000",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  profileText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#000",
  },
  logoutButton: {
    backgroundColor: "#ff6b6b",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  leaveButton: {
    backgroundColor: "#ff6b6b",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  leaveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  resumeButton: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  temporaryLeaveButton: {
    backgroundColor: "#ff6b6b",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
});