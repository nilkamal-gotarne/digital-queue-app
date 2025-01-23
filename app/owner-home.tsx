import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {collection,query,where,getDocs,updateDoc,doc,onSnapshot,writeBatch,orderBy,getDoc,increment,serverTimestamp,runTransaction,limit,}from "firebase/firestore";
import { db } from "@/firebaseConfig";
import moment from "moment";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/Header";
import { blue } from "react-native-reanimated/lib/typescript/reanimated2/Colors";

const Tab = createBottomTabNavigator();

interface QueueMember { id: string; userId: string;userName: string;status: string;endTime: any;position: number;waitingTime: number;startTime: any;lotId: string;}

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
      <View style={getQueueItemStyle(item.status)}>
        <View>
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
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: "#4CAF50" }]}
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
            <Text style={styles.updateButtonText}>Assign lot</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: "#2196F3" }]}
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
            style={[styles.updateButton, { backgroundColor: "#FFC107" }]}
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
            style={[styles.updateButton, { backgroundColor: "#F44336" }]}
            onPress={() => updateMemberStatus(item.id, "rejected")}
            disabled={isUpdating}
          >
            <Text style={styles.updateButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View>
      <AppHeader title={`Welcome, ${user?.name || "Queue Owner"}`} />
  <View>
    <Text style={styles.greeting}></Text>

    {isLoading ? (
      <ActivityIndicator size="large" color="#ffffff" />
    ) : queueMembers.length === 0 ? (
      <Text style={styles.emptyMessage}>The queue is empty right now</Text> // Display message if queue is empty
    ) : (
      <FlatList
        data={queueMembers}
        renderItem={renderQueueMember}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />
    )}
  </View>
    </View>
  );
}

function ProfileTab() {
  const { user, setUser, setIsLogged }: any = useGlobalContext();

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
  
  return (
    <View>
      <AppHeader title={`Welcome, ${user?.name || "Queue Owner"}`} />
      <View>
        <Text style={styles.greeting}></Text>
        <Text style={styles.profileText}>Email: {user?.email}</Text>
        <Text style={styles.profileText}>Phone: {user?.phone}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OwnerHome() {
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
          backgroundColor: "#4c669f",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 5,
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#b0b0b0",
        headerStyle: {
          backgroundColor: "#4c669f",
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
          headerTitle: "Home",
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: "Profile",
          headerTitle: "Profile",
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
  },
  actionButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 10,
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
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  processingMember: {
    backgroundColor: "rgba(152, 251, 152, 0.8)",
  },
  waitingMember: {
    backgroundColor: "rgba(135, 206, 250, 0.8)",
  },
  memberText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#000",
  },
  updateButton: {
    padding: 12,
    borderRadius: 5,
  },
  updateButtonText: {
    color: "white",
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: "#ff6b6b",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginLeft: 25,
    width: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  profileText: {
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    color: "#000000",
  },
  emptyMessage: {
    textAlign: "center",
    color: "#000000",
    marginTop: 20,
    fontSize: 16,
  },
});