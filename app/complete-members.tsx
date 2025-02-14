import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useGlobalContext } from "@/context/GlobalContext";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";

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
  const { user }: any = useGlobalContext();
  const [pastQueues, setPastQueues] = useState<any[]>([]);

  const fetchRecentMembers = async () => {
    if (!user?.id) return;

    try {
      const queueMembersRef = collection(db, "queue_members");
      const today = new Date();

      const q = query(
        queueMembersRef
        // where("adminId", "==", user.id),
        // orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (membersData.length === 0) {
        setPastQueues([]);
        return;
      }

      // Fetch user data for each queue member
      const userIds = membersData.map((member: any) => member.userId);
      const usersRef = collection(db, "users");
      // const userQuery = query(usersRef, where(documentId(), "in", userIds));
      // const userSnapshot = await getDocs(userQuery);
      // const userData = userSnapshot.docs.reduce((acc, doc) => {
      //   acc[doc.id] = doc.data() as User;
      //   return acc;
      // }, {} as Record<string, User>);
      const findUserData = async () => {
        const userSnapshot = await getDocs(query(usersRef));
        const userData = userSnapshot.docs.reduce((acc, doc) => {
          if (userIds.includes(doc.id)) {
            acc.push({ id: doc.id, ...doc.data() } as any);
          }
          return acc;
        }, [] as any[]);
        return userData;
      };
      const userArray = await findUserData();
      const userSnapshot = userArray.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as any);
      // Fetch lots and queues
      const lotsRef = collection(db, "lots");
      const queuesRef = collection(db, "queues");
      const lotSnapshot = await getDocs(lotsRef);
      const queueSnapshot = await getDocs(queuesRef);

      const lots = lotSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as any)
      );
      const queues = queueSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as any)
      );

      // Merge user data with queue member data
      const mergedData = membersData.map((member: any) => {
        const matchingQueue = queues.find(
          (queue) => queue.id === member.queueId
        );
        const matchingLot = lots.find((lot) => lot.id === member.lotId);

        return {
          ...member,
          name: userSnapshot[member.userId]?.name || "Unknown",
          email: userSnapshot[member.userId]?.email || "Unknown",
          phone: userSnapshot[member.userId]?.phoneNumber || "Unknown",
          lotName: matchingLot?.name || "Unknown",
          queueName: matchingQueue?.name || "Unknown",
          number: matchingQueue?.phoneNumber || "Unknown",
          image:
            matchingQueue?.image ||
            "https://randomuser.me/api/portraits/men/1.jpg",
        } as any;
      });

      console.log(">>> ~ mergedData ~ mergedData:", mergedData);
      const filerData = mergedData.filter((member) => member.status !== "left");
      setPastQueues(filerData);
    } catch (error) {
      console.error("Error fetching queue members:", error);
    }
  };

  useEffect(() => {
    // const fetchPastQueues = async () => {
    //   if (user?.id) {
    //     const userRef = collection(db ,'users');
    //     const docRef = doc(userRef);
    //     const userData = await getDoc(docRef).then((doc) => doc.data());
    //     console.log(userData)
    //     console.log(user.id);
    //     const queueMembersRef = collection(db, "queue_members");
    //     const q = query(
    //       queueMembersRef,
    //       // where("userId", "==", user.id),
    //       // where("status", "in", [
    //       //   "completed",
    //       //   "rejected",
    //       //   "not_available",
    //       //   "transferred",
    //       //   'left'
    //       // ]),
    //       // orderBy("endTime", "desc")
    //     );

    //     try {
    //       const querySnapshot = await getDocs(q);
    //       const queues = querySnapshot.docs.map((doc) => ({
    //         id: doc.id,
    //         ...doc.data(),
    //       }));
    //       console.table(queues)
    //       setPastQueues(queues);
    //     } catch (error) {
    //       console.error("Error fetching past queues:", error);
    //     }
    //   }
    // };

    // fetchPastQueues();
    fetchRecentMembers();
  }, [user]);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Member List */}
      <FlatList
        data={pastQueues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image
                source={{
                  uri: item.image,
                }}
                style={styles.profileImage}
              />
              <Text style={styles.ticketText}>
                Ticket No - {item?.token || "NA"}
              </Text>
            </View>
            <Text style={styles.memberText}>Name : {item.name}</Text>
            <Text style={styles.memberText}>Email : {item.email}</Text>
            <Text style={styles.memberText}>Mobile : {item.phone}</Text>
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
    fontWeight: "semibold",
  },
});

export default CompletedMembersScreen;
