import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useGlobalContext } from "../context/GlobalContext";
import { db } from "@/firebaseConfig";
import moment from "moment";
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

const TokenDetailsScreen = () => {
  const { user }: any = useGlobalContext();
  const [joinedQueues, setJoinedQueues] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(moment());

  useEffect(() => {
    let unsubscribe: () => void;

    const setupQueueListener = () => {
      if (user?.id) {
        const queueMembersRef = collection(db, "queue_members");
        const q = query(
          queueMembersRef,
          where("userId", "==", user.id),
          where("status", "in", ["waiting", "processing", "temporary_leave"])
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const queues = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));
          setJoinedQueues(queues);
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
    <View style={styles.container}>
      <Text style={styles.queueOwner}>
        Queue Owner: Owner for the lot found and queue A
      </Text>
      <View style={styles.tokenContainer}>
        <View
          style={{
            backgroundColor: "white",
            width: 45,
            height: 45,
            position: "absolute",
            top: -20,
            borderRadius: 100,
            left: -20,
          }}
        />
        <View
          style={{
            backgroundColor: "white",
            width: 45,
            height: 45,
            position: "absolute",
            top: -20,
            borderRadius: 100,
            right: -20,
          }}
        />
        <View
          style={{
            backgroundColor: "white",
            width: 60,
            height: 60,
            position: "absolute",
            top: 130,
            borderRadius: 100,
            left: -30,
          }}
        />
        <View
          style={{
            backgroundColor: "white",
            width: 60,
            height: 60,
            position: "absolute",
            top: 130,
            borderRadius: 100,
            right: -30,
          }}
        />
        <View
          style={{
            backgroundColor: "white",
            width: 45,
            height: 45,
            position: "absolute",
            bottom: -20,
            borderRadius: 100,
            left: -20,
          }}
        />
        <View
          style={{
            backgroundColor: "white",
            width: 45,
            height: 45,
            position: "absolute",
            bottom: -20,
            borderRadius: 100,
            right: -20,
          }}
        />
        <View>
          <View style={styles.upperSection}>
            <Text style={styles.tokenText}>Token Number is</Text>
            <Text style={styles.tokenIdText}>BD8749</Text>
          </View>
          <View style={styles.tokenIconContainer}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <FontAwesome name="users" size={20} color="#14a979" />
              </View>
              <Text style={styles.infoText}>Remaining: 1</Text>
            </View>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="clock-time-four"
                  size={20}
                  color="#31bdf1"
                />
              </View>

              <Text style={styles.infoText}>7:10 PM</Text>
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>Approx Waiting Time</Text>
            <Text style={styles.timeValText}>10:30:45</Text>
          </View>
        </View>
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "600",
          marginVertical: 20,
          color: "black",
          textAlign: "center",
        }}
      >
        {" "}
        Would you like to exit the Queue{" "}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.permanentButton}>
          <Text style={styles.buttonText}>Permanent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.temporaryButton, { backgroundColor: "#14a979" }]}
        >
          <Text style={styles.buttonText}>Temporary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 15,
    width: "100%",
    alignItems: "center",
    borderRadius: 10,
  },
  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  queueOwner: {
    marginVertical: 10,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  tokenContainer: {
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: "#c7daff",
  },
  upperSection: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  tokenText: {
    fontSize: 13,
    color: "black",
  },
  tokenIdText: {
    color: "#fe666e",
    fontSize: 22,
    fontWeight: "bold",
  },
  tokenIconContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 50,
  },
  iconContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconCircle: {
    borderRadius: 100,
    padding: 10,
    backgroundColor: "#caffef",
    justifyContent: "center",
    alignItems: "center",
  },
  timeContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  timeText: {
    fontSize: 11,
    color: "black",
  },
  timeValText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "black",
  },
  cornerCutTopLeft: {
    position: "absolute",
    width: 40,
    height: 40,
    backgroundColor: "#F5F5F5",
    top: -12,
    left: -12,
    borderBottomRightRadius: 20,
  },
  cornerCutTopRight: {
    position: "absolute",
    width: 40,
    height: 40,
    backgroundColor: "#F5F5F5",
    top: -12,
    right: -12,
    borderBottomLeftRadius: 20,
  },
  cornerCutBottomLeft: {
    position: "absolute",
    width: 40,
    height: 40,
    backgroundColor: "#F5F5F5",
    bottom: -12,
    left: -12,
    borderTopRightRadius: 20,
  },
  cornerCutBottomRight: {
    position: "absolute",
    width: 40,
    height: 40,
    backgroundColor: "#F5F5F5",
    bottom: -12,
    right: -12,
    borderTopLeftRadius: 20,
  },
  cornerCutcenterLeft: {
    position: "absolute",
    width: 20,
    height: 40,
    backgroundColor: "#F5F5F5",
    left: -10,
    top: "50%",
    marginTop: -10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  cornerCutcenterRight: {
    position: "absolute",
    width: 20,
    height: 40,
    backgroundColor: "#F5F5F5",
    right: -10,
    top: "50%",
    marginTop: -10,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  centerCut: {
    position: "absolute",
    width: 40,
    height: 20,
    backgroundColor: "#F5F5F5",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tokenNumberLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tokenNumber: {
    fontSize: 30,
    fontWeight: "bold",
    color: "red",
    marginVertical: 5,
  },
  dottedBorder: {
    borderStyle: "dotted",
    borderWidth: 4,
    borderColor: "#000",
    width: "100%",
    marginVertical: 12,
  },
  icon: {
    backgroundColor: "#caffef",
    textAlign: "center",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    padding: 15,
    color: "#14a979",
  },
  icon2: {
    // marginRight: 5,
    backgroundColor: "#14a979",
    textAlign: "center",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    // padding: 15,
    // color: "#14a979",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  permanentButton: {
    backgroundColor: "#e1777f",
    padding: 10,
    alignItems: "center",
    borderRadius: 40,
    alignSelf: "center",
    paddingHorizontal: 26,
  },
  temporaryButton: {
    padding: 10,
    alignItems: "center",
    borderRadius: 40,
    alignSelf: "center",
    paddingHorizontal: 26,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
  },
  infoRowInner: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  infoRowbg: {
    // padding: 10,
    backgroundColor: "#C6FDE8",
    borderRadius: 50,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  waitingTimeLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "bold",
  },
  waitingTime: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#007AFF",
  },
  exitText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
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
});

export default TokenDetailsScreen;
