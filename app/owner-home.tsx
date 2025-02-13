import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  writeBatch,
  orderBy,
  getDoc,
  increment,
  serverTimestamp,
  runTransaction,
  limit,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import moment from "moment";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  AntDesign,
  Feather,
  FontAwesome,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "react-native";
import { StatusBar } from "expo-status-bar";

const Tab = createBottomTabNavigator();

interface QueueMember {
  id: string;
  userId: string;
  userName: string;
  status: string;
  endTime: any;
  position: number;
  waitingTime: number;
  startTime: any;
  lotId: string;
}

function HomeTab() {
  const { user }: any = useGlobalContext();
  const [queueMembers, setQueueMembers] = useState<QueueMember[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [averageWaitTime, setAverageWaitTime] = useState(0); // Default average wait time in minutes
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const setupQueueListener = () => {
      if (user && user.id && user.queueId) {
        const queueMembersRef = collection(db, "queue_members");
        const q = query(
          queueMembersRef,
          where("queueId", "==", user.queueId),
          where("status", "in", ["waiting", "processing", "temporary_leave"]),
          orderBy("position")
        );

        unsubscribe = onSnapshot(q, async (snapshot) => {
          const members = await Promise.all(
            snapshot.docs.map(async (ss) => {
              const data = ss.data();
              const userDoc = await getDoc(doc(db, "users", data.userId));
              const userData = userDoc.data();
              const userName = userData?.name || "NA";
              return {
                id: ss.id,
                ...data,
                userName,
                email: userData?.email || "",
                phoneNumber: userData?.phoneNumber || "",
                role: userData?.role || "user",
              } as any;
            })
          );
          setQueueMembers(members);
          setIsLoading(false);
        });
      }
    };

    setupQueueListener();
    fetchAverageWaitTime();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const fetchAverageWaitTime = async () => {
    if (user && user.id) {
      try {
        const today = moment().startOf("day");

        const sessionRef = collection(db, "sessions");
        const q = query(
          sessionRef,
          where("adminId", "==", user.adminId),
          where("createdAt", ">=", today.format())
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const sessionData = querySnapshot.docs[0].data();
          setAverageWaitTime(sessionData?.avgWaitingTime || 0);
        }
      } catch (error) {
        console.error("Error fetching average wait time:", error);
      }
    }
  };

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    if (isUpdating) {
      Alert.alert("Please wait", "An update is already in progress.");
      return;
    }

    setIsUpdating(true);

    try {
      const memberRef = doc(db, "queue_members", memberId);
      const memberDoc = await getDoc(memberRef);
      const memberData = memberDoc.data() as QueueMember;

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

          setAverageWaitTime(newAverageWaitTime);
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
          const memberData = doc.data() as QueueMember;
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
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeaveQueue = async (
    queueMemberId: string,
    queueId: string,
    position: number,
    status: string
  ) => {
    console.log("==============>", queueMemberId, queueId, position);

    try {
      const batch = writeBatch(db);

      // Update the leaving member's status
      const leavingMemberRef = doc(db, "queue_members", queueMemberId);
      batch.update(leavingMemberRef, { status: status });

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

  const getQueueItemStyle = (status: string) => {
    switch (status) {
      case "processing":
        return [styles.memberItem, styles.processingMember];
      case "waiting":
        return [styles.memberItem, styles.waitingMember];
      default:
        return styles.memberItem;
    }
  };

  const transferToNextLot = async (
    currentLotId: string,
    queueMemberId: string,
    queueId: string,
    position: number,
    userId: string
  ) => {
    try {
      await runTransaction(db, async (transaction) => {
        // Get all active lots for the admin
        const lotsRef = collection(db, "lots");
        const lotQuery = query(
          lotsRef,
          where("adminId", "==", user.adminId),
          where("status", "==", "active"),
          orderBy("createdAt", "asc")
        );
        const lotSnapshot = await getDocs(lotQuery);
        const lotData = lotSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        // Find the current lot index
        const currentLotIndex = lotData.findIndex(
          (lot) => lot.id === currentLotId
        );

        if (currentLotIndex === lotData.length - 1) {
          console.log("No next active lot found");
          Alert.alert("Warning", "No next active lot found");
          return;
        }

        const currentLot = lotData[currentLotIndex];
        const nextLot = lotData[currentLotIndex + 1];

        // Get all active queues for the next lot
        const queuesRef = collection(db, "queues");
        const queueQuery = query(
          queuesRef,
          where("lotId", "==", nextLot.id),
          where("status", "==", "active"),
          where("ownerId", "!=", "")
        );
        const queueSnapshot = await getDocs(queueQuery);

        if (queueSnapshot.empty) {
          console.log("No queues found in the next lot");
          Alert.alert("Warning", "No queues found in the next lot");
          return;
        }

        const today = moment().startOf("day");

        let shortestQueue = null;
        let shortestQueueLength = Infinity;
        let lastMemberEndTime = null;

        for (const queueDoc of queueSnapshot.docs) {
          const queueData = { ...queueDoc.data(), id: queueDoc.id };
          const queueMembersRef = collection(db, "queue_members");
          const queueMembersQuery = query(
            queueMembersRef,
            where("queueId", "==", queueDoc.id),
            where("status", "in", ["waiting", "processing", "temporary_leave"]),
            where("createdAt", ">=", today.toDate()),
            orderBy("position", "desc"),
            limit(1)
          );
          const queueMembersSnapshot = await getDocs(queueMembersQuery);
          const queueLength = queueMembersSnapshot.size;

          if (queueLength < shortestQueueLength) {
            shortestQueue = queueData;
            shortestQueueLength = queueLength;
            if (!queueMembersSnapshot.empty) {
              lastMemberEndTime = queueMembersSnapshot.docs[0].data().endTime;
            }
          }
        }

        if (!shortestQueue) {
          console.log("No available queue found in the next lot");
          Alert.alert("Warning", "No available queue found in the next lot");
          return;
        }

        // Add user to the shortest queue in the next lot
        const newPosition = shortestQueueLength + 1;
        const joinTime = serverTimestamp();
        let startTime = moment().toDate(); // Default to current time
        let endTime;
        let waitingTime;

        if (lastMemberEndTime && lastMemberEndTime.toDate()) {
          startTime = lastMemberEndTime.toDate();
        }
        endTime = moment(startTime).add(averageWaitTime, "minutes").toDate();
        waitingTime = moment(endTime).diff(moment(startTime), "minutes");

        // Update current queue member status to "transferred"
        const queueMemberRef = doc(db, "queue_members", queueMemberId);
        transaction.update(queueMemberRef, { status: "transferred" });

        const newQueueMember = {
          userId: userId,
          queueId: shortestQueue.id,
          lotId: nextLot.id,
          joinTime: joinTime,
          startTime: startTime,
          endTime: endTime,
          position: newPosition,
          waitingTime: waitingTime,
          status: "waiting",
          createdAt: joinTime,
          updatedAt: joinTime,
          adminId: user.adminId,
        };

        const newQueueMemberRef = doc(collection(db, "queue_members"));
        transaction.set(newQueueMemberRef, newQueueMember);

        const batch = writeBatch(db);
        // Get all queue members after the current position
        const queueMembersRef = collection(db, "queue_members");
        const membersAfterQuery = query(
          queueMembersRef,
          where("queueId", "==", queueId),
          where("position", ">", position),
          where("status", "in", ["waiting", "processing", "temporary_leave"]),
          orderBy("position", "asc")
        );
        const membersAfterSnapshot = await getDocs(membersAfterQuery);

        // Update positions and end times for members after the leaving member
        let lastEndTime = moment().toDate();
        membersAfterSnapshot.docs.forEach((doc, index) => {
          const memberRef = doc.ref;
          const memberData = doc.data();
          const newPosition = memberData.position - 1;

          let newEndTime;
          if (index === 0) {
            newEndTime = moment().add(averageWaitTime, "minutes").toDate();
          } else {
            newEndTime = moment(lastEndTime)
              .add(averageWaitTime, "minutes")
              .toDate();
          }

          batch.update(memberRef, {
            position: newPosition,
            endTime: newEndTime,
          });

          lastEndTime = newEndTime;
        });

        // Commit the batch
        await batch.commit();

        Alert.alert("Success", "You have been transferred to the next lot");
      });
    } catch (error) {
      console.error("Error transferring to next lot:", error);
      Alert.alert(
        "Error",
        "An error occurred while transferring to the next lot"
      );
    }
  };

  const renderQueueMember = ({ item }: { item: any }) => {
    return (
      <View style={[getQueueItemStyle(item.status), styles.cardContainer]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Image
              source={require("../assets/images/profile.jpg")} // Change the path accordingly
              style={{
                width: 70,
                height: 70,
                borderRadius: 50,
                borderWidth: 2,
                borderColor: "#ccc",
              }}
            />
            <Text style={styles.memberText}>Ticket No - B5002</Text>
          </View>
          <TouchableOpacity
            onPress={() => console.log("Message Clicked")}
            style={{
              padding: 16,
              borderRadius: 50,
              backgroundColor: "#CAFFEF",
              justifyContent: "center",
            }}
          >
            <FontAwesome5 name="paper-plane" size={30} color="#14A979" solid />
          </TouchableOpacity>
        </View>
        <View style={styles.memberItem}>
          <Text style={styles.memberText}>
            {item.userName} -{" "}
            <Text style={{ textTransform: "capitalize" }}>{item.status}</Text>
          </Text>
          <Text style={styles.memberText}>Position: {item.position}</Text>
          <Text style={styles.memberText}>
            End Time:{" "}
            {item?.endTime &&
              moment(
                new Date(
                  item.endTime.seconds * 1000 +
                    item.endTime.nanoseconds / 1000000
                )
              ).format("h:mm:ss a")}
          </Text>
        </View>
        <View style={styles.actionButtonContainer}>
          {/* Grouped Buttons */}
          <View style={styles.groupedButtons}>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: "#C7DAFF" }]}
              onPress={() => {
                item.status === "waiting"
                  ? updateMemberStatus(
                      item.id,
                      item.status === "waiting" ? "processing" : "completed"
                    )
                  : handleLeaveQueue(
                      item.id,
                      item.queueId,
                      item.position,
                      "completed"
                    );
              }}
            >
              <Text style={styles.updateButtonText}>
                {item.status === "waiting" ? "Processing" : "Complete"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: "#C7DAFF" }]}
              onPress={() =>
                handleLeaveQueue(
                  item.id,
                  item.queueId,
                  item.position,
                  "not_available"
                )
              }
              disabled={isUpdating}
            >
              <Text style={styles.updateButtonText}>Not Available</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: "#E1777F" }]}
              onPress={() => updateMemberStatus(item.id, "rejected")}
              disabled={isUpdating}
            >
              <Text style={styles.updateButtonText3}>Rejected</Text>
            </TouchableOpacity>
          </View>

          {/* Separate Button */}
          <TouchableOpacity
            style={[styles.updateButton2, { backgroundColor: "#14A979" }]}
            onPress={() =>
              transferToNextLot(
                item.lotId,
                item.id,
                item.queueId,
                item.position,
                item.userId
              )
            }
            disabled={isUpdating}
          >
            <Text style={styles.updateButtonText4}>Transfer to Next Lot</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles2.container}>
      <StatusBar style="light" />

      {/* Cards Section */}
      <View style={styles2.cardsContainer}>
        {/* Total Queue Members */}
        <TouchableOpacity
          style={[styles2.card, styles2.yellowCard]}
          onPress={() => router.push("/queue-home-page")}
        >
          <FontAwesome
            name="users"
            size={32}
            color="#FBBF24"
            style={styles2.icon}
          />
          <Text style={styles2.cardText}>Total Queue Members</Text>
        </TouchableOpacity>

        {/* Completed Queue Members */}
        <TouchableOpacity
          style={[styles2.card, styles2.blueCard]}
          onPress={() => router.push("/complete-members")}
        >
          <Feather
            name="check-circle"
            size={32}
            color="#10B981"
            style={styles2.icon}
          />
          <Text style={styles2.cardText}>Completed Queue Members</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProfileTab() {
  const { user, setUser, setIsLogged }: any = useGlobalContext();
  console.log("User--------", user);

  const handleLogout = async () => {
    setUser(null);
    setIsLogged(false);
    await AsyncStorage.removeItem("userInfo");
    await AsyncStorage.removeItem("role");
    router.replace("/");
  };

  return (
    <LinearGradient
      colors={["#ffff", "#ffff", "#ffff"]}
      style={styles.container}
    >
      <View>
        <View
          style={{
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Image
            source={require("../assets/images/profile.jpg")} // Change the path accordingly
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: 2,
              borderColor: "#ccc",
            }}
          />
        </View>
        {/* <Text style={styles.greeting}>Hello, {user?.name || "Queue Owner"}!</Text> */}
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
            value={user?.phone || ""}
          />
          <Text style={{ fontSize: 12, color: "gray", marginTop: 2 }}>
            Mobile Number
          </Text>
        </View>
      </View>
      {/* <Text style={styles.profileText}>Email: {user?.email}</Text>
      <Text style={styles.profileText}>Phone: {user?.phoneNumber}</Text> */}
      <View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

export default function OwnerHome() {
  const { user }: any = useGlobalContext();
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
          // backgroundColor: "#3C73DC",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 5,
        },
        tabBarActiveTintColor: "#3C73DC",
        tabBarInactiveTintColor: "#b0b0b0",
        headerStyle: {
          backgroundColor: "#3C73DC",
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
          headerTitle: () => (
            <View>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
                Hi {user?.name || "Home"}
              </Text>
              <Text style={{ fontSize: 16, color: "#eee" }}>Good Morning</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: "Profile",
          headerTitle: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}
const styles2 = StyleSheet.create({
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
    marginTop: 10,
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
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  cardContainer: {
    backgroundColor: "#fff", // Card background
    padding: 10, // Inner spacing
    borderRadius: 12, // Rounded corners
    borderWidth: 1, // Thin border
    borderColor: "#ddd", // Light border color
    shadowColor: "#000", // Shadow effect
    shadowOffset: { width: 0, height: 2 }, // Shadow positioning
    shadowOpacity: 0.2, // Light shadow
    shadowRadius: 4, // Soft spread
    elevation: 5, // Android shadow
  },
  actionButtonContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#000",
  },
  groupedButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%", // Adjust based on your layout
  },
  averageWaitTime: {
    fontSize: 18,
    marginBottom: 20,
    color: "#fff",
  },
  list: {
    width: "100%",
    marginBottom: 20,
  },
  memberItem: {
    padding: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  processingMember: {
    backgroundColor: "rgba(152, 251, 152, 0.8)",
  },
  waitingMember: {
    backgroundColor: "#fff",
  },
  memberText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#000",
    fontWeight: "bold",
  },
  updateButton: {
    padding: 10,
    borderRadius: 25,
    marginBottom: 15,
    paddingLeft: 12,
    paddingRight: 12,
  },
  updateButton2: {
    width: "100%",
    padding: 10,
    borderRadius: 25,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#302A2C",
    fontSize: 14,
    fontWeight: "bold",
  },
  updateButtonText3: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  updateButtonText4: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#3C73DC",
    padding: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  profileText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#000",
  },
});
