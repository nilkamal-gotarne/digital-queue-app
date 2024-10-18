import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useGlobalContext } from "../context/GlobalContext";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PastQueues() {
  const { user }: any = useGlobalContext();
  const [pastQueues, setPastQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchPastQueues = async () => {
      if (user?.id) {
        const queueMembersRef = collection(db, "queue_members");
        const q = query(
          queueMembersRef,
          where("userId", "==", user.id),
          where("status", "in", ["completed", "rejected", "not_available", "transferred"]),
          orderBy("endTime", "desc")
        );

        try {
          const querySnapshot = await getDocs(q);
          const queues = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPastQueues(queues);
        } catch (error) {
          console.error("Error fetching past queues:", error);
        }
      }
    };

    fetchPastQueues();
  }, [user]);

  const openModal = (item: any) => {
    setSelectedQueue(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedQueue(null);
  };

  const renderQueueItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.queueItem} onPress={() => openModal(item)}>
      <Text style={styles.queueText}>Queue: {item.queueId}</Text>
      <Text style={styles.queueText}>Status: {item.status}</Text>
      <Text style={styles.queueText}>
        End Time: {moment(item.endTime.toDate()).format("MMMM Do YYYY, h:mm:ss a")}
      </Text>
    </TouchableOpacity>
  );

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Queue Details</Text>
          {selectedQueue && (
            <>
              <Text style={styles.modalText}>Queue ID: {selectedQueue.queueId}</Text>
              <Text style={styles.modalText}>Status: {selectedQueue.status}</Text>
              <Text style={styles.modalText}>Position: {selectedQueue.position}</Text>
              <Text style={styles.modalText}>
                Start Time: {moment(selectedQueue.startTime.toDate()).format("MMMM Do YYYY, h:mm:ss a")}
              </Text>
              <Text style={styles.modalText}>
                End Time: {moment(selectedQueue.endTime.toDate()).format("MMMM Do YYYY, h:mm:ss a")}
              </Text>
              {/* Add more details as needed */}
            </>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={["#4c669f", "#3b5998", "#192f6a"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Past Queues</Text>
        {pastQueues.length > 0 ? (
          <FlatList
            data={pastQueues}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <Text style={styles.emptyText}>No past queues found.</Text>
        )}
        {renderModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
  },
  queueItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  queueText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#fff",
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    color: "#fff",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  closeButton: {
    backgroundColor: "#3b5998",
    padding: 10,
    borderRadius: 5,
    alignSelf: "flex-end",
    marginTop: 15,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
