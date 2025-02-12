import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator } from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp, doc,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useGlobalContext } from "../context/GlobalContext";
import { router } from "expo-router";
import moment from "moment";
import {
  CameraView,
  BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";

export default function JoinQueue() {
  const [scanned, setScanned] = useState(false);
  const { user }: any = useGlobalContext();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [queueName, setQueueName] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    console.log(
      '========================================='
    );
    
    if (result.data) {
      setScanned(true);
      setAdminId(result.data);
      setIsLoading(true);
      try {
        // Get all queues for this admin
        const queuesSnapshot = await getDocs(query(collection(db, "queues"), where("adminId", "==", result.data)));
        
        if (!queuesSnapshot.empty) {
          let shortestQueue = null;
          let shortestQueueLength = Infinity;
          let shortestQueueMembers: any[] = [];

          // Find the queue with the least members
          for (const queueDoc of queuesSnapshot.docs) {
            const queueData = queueDoc.data();
            const membersSnapshot = await getDocs(query(collection(db, "queue_members"), where("queueId", "==", queueDoc.id), where("status", "in", ["waiting", "processing","temporary_leave"])));
            const queueLength = membersSnapshot.size;

            if (queueLength < shortestQueueLength) {
              shortestQueue = queueData;
              shortestQueueLength = queueLength;
              shortestQueueMembers = membersSnapshot.docs.map(doc => doc.data());
            }
          }

          if (shortestQueue) {
            setQueueName(shortestQueue.name);
            setQueueInfo({
              ...shortestQueue,
              members: shortestQueueMembers,
              memberCount: shortestQueueLength
            });
          }
        }
      } catch (error) {
        console.error("Error fetching queue data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };


  // const handleJoinQueue = async () => {
  //   if (!adminId) {
  //     Alert.alert("Error", "Please scan a QR code first");
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     // Check if user is already in a queue
  //     const userQueueRef = collection(db, "queue_members");
  //     const userQueueQuery = query(
  //       userQueueRef,
  //       where("userId", "==", user.id),
  //       where("status", "in", ["waiting", "processing","temporary_leave"])
  //     );
  //     const userQueueSnapshot = await getDocs(userQueueQuery);

  //     if (!userQueueSnapshot.empty) {
  //       Alert.alert("Error", "You are already in a queue");
  //       return;
  //     }

  //     // Check if admin has an active session created today
  //     const sessionsRef = collection(db, "sessions");
  //     const today = moment().startOf("day");
  //     const sessionQuery = query(
  //       sessionsRef,
  //       where("adminId", "==", adminId),
  //       where("createdAt", ">=", today.format())
  //     );
  //     const sessionSnapshot = await getDocs(sessionQuery);

  //     if (sessionSnapshot.empty) {
  //       Alert.alert("Error", "No active session found for today");
  //       return;
  //     }

  //     const sessionDoc = sessionSnapshot.docs[0];
  //     const sessionData = sessionDoc.data();

  //     // Find the first active lot
  //     const lotsRef = collection(db, "lots");
  //     const lotQuery = query(
  //       lotsRef,
  //       where("adminId", "==", adminId),
  //       where("status", "==", "active"),
  //       orderBy("createdAt", "asc"),
  //       limit(1)
  //     );
  //     const lotSnapshot = await getDocs(lotQuery);

  //     if (lotSnapshot.empty) {
  //       Alert.alert("Error", "No active lot found for this session");
  //       return;
  //     }

  //     const lotDoc = lotSnapshot.docs[0];
  //     console.log(">>> ~ handleJoinQueue ~ lotDoc:", lotDoc)
  //     const lotData = { ...lotDoc.data(), id: lotDoc.id };
  //     console.log(">>> ~ handleJoinQueue ~ lotData:", lotData)

  //     // Find the shortest queue in the first lot
  //     const queuesRef = collection(db, "queues");
  //     const queueQuery = query(
  //       queuesRef,
  //       where("adminId", "==", adminId),
  //       where("lotId", "==", lotData.id),
  //       where("status", "==", "active"),
  //       where("ownerId", "!=", "")
  //     );
  //     const queueSnapshot = await getDocs(queueQuery);

  //     if (queueSnapshot.empty) {
  //       Alert.alert("Error", "No queues found for this lot");
  //       return;
  //     }

  //     // Find the shortest queue
  //     let shortestQueue = null;
  //     let shortestQueueLength = Infinity;

  //     for (const queueDoc of queueSnapshot.docs) {
  //       const queueData = { ...queueDoc.data(), id: queueDoc.id };
  //       const queueMembersRef = collection(db, "queue_members");
  //       const queueMembersQuery = query(
  //         queueMembersRef,
  //         where("lotId", "==", lotData.id),
  //         where("queueId", "==", queueData.id),
  //         where("status", "in", ["waiting", "processing","temporary_leave"])
  //       );
  //       const queueMembersSnapshot = await getDocs(queueMembersQuery);
  //       const queueLength = queueMembersSnapshot.size;

  //       if (queueLength < shortestQueueLength) {
  //         shortestQueue = queueData;
  //         shortestQueueLength = queueLength;
  //       }
  //     }

  //     if (!shortestQueue) {
  //       Alert.alert("Error", "No available queue found");
  //       return;
  //     }

  //     // Add user to the shortest queue using a transaction
  //     await runTransaction(db, async (transaction) => {
  //       console.log('shortestQueue', shortestQueue);
        
  //       const queueMembersRef = collection(db, "queue_members");
  //       const queueMembersQuery = query(
  //         queueMembersRef,
  //         where("queueId", "==", shortestQueue.id),
  //         where("lotId", "==", lotData.id),
  //         where("status", "in", ["waiting", "processing","temporary_leave"]),
  //         orderBy("position", "desc"),
  //         where("createdAt", ">=", today.toDate()),
  //         limit(1)
  //       );
  //       const queueMembersSnapshot = await getDocs(queueMembersQuery);
        
  //       let newPosition = 1;
  //       let lastPersonEndTime = moment().toDate();

  //       if (!queueMembersSnapshot.empty) {
  //         const lastMember = queueMembersSnapshot.docs[0].data();
  //         newPosition = lastMember.position + 1;
  //         lastPersonEndTime = lastMember.endTime.toDate();
  //       }

  //       const joinTime = serverTimestamp();
  //       const endTime = moment(lastPersonEndTime).add(sessionData.avgWaitingTime, "minutes").toDate();
  //       const waitingTime = moment(endTime).diff(moment(), "minutes");

  //       const newQueueMember = {
  //         userId: user.id,
  //         queueId: shortestQueue.id,
  //         joinTime: joinTime,
  //         lotId: lotData.id,
  //         endTime: endTime,
  //         position: newPosition,
  //         waitingTime: waitingTime,
  //         status: "waiting",
  //         createdAt: joinTime,
  //         updatedAt: joinTime,
  //         adminId: adminId,
  //       };
  //       console.log('newQueueMember', newQueueMember);
        

  //       const newDocRef = doc(collection(db, "queue_members"));
  //       transaction.set(newDocRef, newQueueMember);
  //     });

  //     Alert.alert("Success", "You have joined the queue successfully");
  //     router.replace("/home");
  //   } catch (error) {
  //     console.error("Error joining queue:", error);
  //     Alert.alert("Error", "An error occurred while joining the queue");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const handleJoinQueue = async () => {
  //   if (!adminId) {
  //     Alert.alert("Error", "Please scan a QR code first");
  //     return;
  //   }
  
  //   setIsLoading(true);
  //   try {
  //     // Check if user is already in a queue
  //     const userQueueRef = collection(db, "queue_members");
  //     const userQueueQuery = query(
  //       userQueueRef,
  //       where("userId", "==", user.id),
  //       where("status", "in", ["waiting", "processing", "temporary_leave"])
  //     );
  //     const userQueueSnapshot = await getDocs(userQueueQuery);
  
  //     if (!userQueueSnapshot.empty) {
  //       Alert.alert("Error", "You are already in a queue");
  //       return;
  //     }
  
  //     // Check if admin has an active session created today
  //     const sessionsRef = collection(db, "sessions");
  //     const today = moment().startOf("day");
  //     const sessionQuery = query(
  //       sessionsRef,
  //       where("adminId", "==", adminId),
  //       where("createdAt", ">=", today.format())
  //     );
  //     const sessionSnapshot = await getDocs(sessionQuery);
  
  //     if (sessionSnapshot.empty) {
  //       Alert.alert("Error", "No active session found for today");
  //       return;
  //     }
  
  //     const sessionDoc = sessionSnapshot.docs[0];
  //     const sessionData = sessionDoc.data();
  
  //     // Find the first active lot
  //     const lotsRef = collection(db, "lots");
  //     const lotQuery = query(
  //       lotsRef,
  //       where("adminId", "==", adminId),
  //       where("status", "==", "active"),
  //       orderBy("createdAt", "asc"),
  //       limit(1)
  //     );
  //     const lotSnapshot = await getDocs(lotQuery);
  
  //     if (lotSnapshot.empty) {
  //       Alert.alert("Error", "No active lot found for this session");
  //       return;
  //     }
  
  //     const lotDoc = lotSnapshot.docs[0];
  //     console.log(">>> ~ handleJoinQueue ~ lotDoc:", lotDoc);
  //     const lotData = { ...lotDoc.data(), id: lotDoc.id };
  //     console.log(">>> ~ handleJoinQueue ~ lotData:", lotData);
  
  //     // Find the shortest queue in the first lot
  //     const queuesRef = collection(db, "queues");
  //     const queueQuery = query(
  //       queuesRef,
  //       where("adminId", "==", adminId),
  //       where("lotId", "==", lotData.id),
  //       where("status", "==", "active"),
  //       where("ownerId", "!=", "")
  //     );
  //     const queueSnapshot = await getDocs(queueQuery);
  
  //     if (queueSnapshot.empty) {
  //       Alert.alert("Error", "No queues found for this lot");
  //       return;
  //     }
  
  //     // Find the shortest queue
  //     let shortestQueue = null;
  //     let shortestQueueLength = Infinity;
  
  //     for (const queueDoc of queueSnapshot.docs) {
  //       const queueData = { ...queueDoc.data(), id: queueDoc.id };
  //       const queueMembersRef = collection(db, "queue_members");
  //       const queueMembersQuery = query(
  //         queueMembersRef,
  //         where("lotId", "==", lotData.id),
  //         where("queueId", "==", queueData.id),
  //         where("status", "in", ["waiting", "processing", "temporary_leave"])
  //       );
  //       const queueMembersSnapshot = await getDocs(queueMembersQuery);
  //       const queueLength = queueMembersSnapshot.size;
  
  //       if (queueLength < shortestQueueLength) {
  //         shortestQueue = queueData;
  //         shortestQueueLength = queueLength;
  //       }
  //     }
  
  //     if (!shortestQueue) {
  //       Alert.alert("Error", "No available queue found");
  //       return;
  //     }
  
  //     // Add user to the shortest queue using a transaction
  //     await runTransaction(db, async (transaction) => {
  //       console.log('shortestQueue', shortestQueue);
        
  //       const queueMembersRef = collection(db, "queue_members");
        
  //       // Function to get the next available position
  //       const getNextAvailablePosition = async (startPosition: number) => {
  //         let currentPosition = startPosition;
  //         while (true) {
  //           const positionQuery = query(
  //             queueMembersRef,
  //             where("queueId", "==", shortestQueue.id),
  //             where("lotId", "==", lotData.id),
  //             where("position", "==", currentPosition),
  //             where("status", "in", ["waiting", "processing", "temporary_leave"])
  //           );
  //           const positionSnapshot = await getDocs(positionQuery);
            
  //           if (positionSnapshot.empty) {
  //             return currentPosition;
  //           }
            
  //           currentPosition++;
  //         }
  //       };
  
  //       const queueMembersQuery = query(
  //         queueMembersRef,
  //         where("queueId", "==", shortestQueue.id),
  //         where("lotId", "==", lotData.id),
  //         where("status", "in", ["waiting", "processing", "temporary_leave"]),
  //         orderBy("position", "desc"),
  //         where("createdAt", ">=", today.toDate()),
  //         limit(1)
  //       );
  //       const queueMembersSnapshot = await getDocs(queueMembersQuery);
        
  //       let newPosition = 1;
  //       let lastPersonEndTime = moment().toDate();
  
  //       if (!queueMembersSnapshot.empty) {
  //         const lastMember = queueMembersSnapshot.docs[0].data();
  //         newPosition = await getNextAvailablePosition(lastMember.position + 1);
  //         lastPersonEndTime = lastMember.endTime.toDate();
  //       }
  
  //       const joinTime = serverTimestamp();
  //       const endTime = moment(lastPersonEndTime).add(sessionData.avgWaitingTime, "minutes").toDate();
  //       const waitingTime = moment(endTime).diff(moment(), "minutes");
  
  //       const newQueueMember = {
  //         userId: user.id,
  //         queueId: shortestQueue.id,
  //         joinTime: joinTime,
  //         lotId: lotData.id,
  //         endTime: endTime,
  //         position: newPosition,
  //         waitingTime: waitingTime,
  //         status: "waiting",
  //         createdAt: joinTime,
  //         updatedAt: joinTime,
  //         adminId: adminId,
  //       };
  //       console.log('newQueueMember', newQueueMember);
        
  //       const newDocRef = doc(collection(db, "queue_members"));
  //       transaction.set(newDocRef, newQueueMember);
  //     });
  
  //     Alert.alert("Success", "You have joined the queue successfully");
  //     router.replace("/home");
  //   } catch (error) {
  //     console.error("Error joining queue:", error);
  //     Alert.alert("Error", "An error occurred while joining the queue");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleJoinQueue = async () => {
    if (!adminId) {
      Alert.alert("Error", "Please scan a QR code first");
      return;
    }
  
    setIsLoading(true);
    try {
      // Check if user is already in a queue
      const userQueueRef = collection(db, "queue_members");
      const userQueueQuery = query(
        userQueueRef,
        where("userId", "==", user.id),
        where("status", "in", ["waiting", "processing", "temporary_leave"])
      );
      const userQueueSnapshot = await getDocs(userQueueQuery);
  
      if (!userQueueSnapshot.empty) {
        Alert.alert("Error", "You are already in a queue");
        return;
      }
  
      // Check if admin has an active session created today
      const sessionsRef = collection(db, "sessions");
      const today = moment().startOf("day");
      const sessionQuery = query(
        sessionsRef,
        where("adminId", "==", adminId),
        where("createdAt", ">=", today.format())
      );
      const sessionSnapshot = await getDocs(sessionQuery);
  
      if (sessionSnapshot.empty) {
        Alert.alert("Error", "No active session found for today");
        return;
      }
  
      const sessionDoc = sessionSnapshot.docs[0];
      const sessionData = sessionDoc.data();
  
      // Find the first active lot
      const lotsRef = collection(db, "lots");
      const lotQuery = query(
        lotsRef,
        where("adminId", "==", adminId),
        where("status", "==", "active"),
        orderBy("createdAt", "asc"),
        limit(1)
      );
      const lotSnapshot = await getDocs(lotQuery);
  
      if (lotSnapshot.empty) {
        Alert.alert("Error", "No active lot found for this session");
        return;
      }
  
      const lotDoc = lotSnapshot.docs[0];
      const lotData = { ...lotDoc.data(), id: lotDoc.id };
  
      // Find the shortest queue in the first lot
      const queuesRef = collection(db, "queues");
      const queueQuery = query(
        queuesRef,
        where("adminId", "==", adminId),
        where("lotId", "==", lotData.id),
        where("status", "==", "active"),
        where("ownerId", "!=", "")
      );
      const queueSnapshot = await getDocs(queueQuery);
  
      if (queueSnapshot.empty) {
        Alert.alert("Error", "No queues found for this lot");
        return;
      }
  
      // Find the shortest queue
      let shortestQueue = null;
      let shortestQueueLength = Infinity;
  
      for (const queueDoc of queueSnapshot.docs) {
        const queueData = { ...queueDoc.data(), id: queueDoc.id };
        const queueMembersRef = collection(db, "queue_members");
        const queueMembersQuery = query(
          queueMembersRef,
          where("lotId", "==", lotData.id),
          where("queueId", "==", queueData.id),
          where("status", "in", ["waiting", "processing", "temporary_leave"])
        );
        const queueMembersSnapshot = await getDocs(queueMembersQuery);
        const queueLength = queueMembersSnapshot.size;
  
        if (queueLength < shortestQueueLength) {
          shortestQueue = queueData;
          shortestQueueLength = queueLength;
        }
      }
  
      if (!shortestQueue) {
        Alert.alert("Error", "No available queue found");
        return;
      }
  
      // Add user to the shortest queue using a transaction
      await runTransaction(db, async (transaction) => {
        // Reference to the counter document for the queue
        const counterRef = doc(db, "queue_counters", shortestQueue.id);
  
        // Get the current counter value
        const counterDoc = await transaction.get(counterRef);
        let newPosition = 1;
  
        if (counterDoc.exists()) {
          // Increment the counter atomically
          newPosition = counterDoc.data().nextPosition + 1;
          transaction.update(counterRef, { nextPosition: newPosition });
        } else {
          // Initialize the counter if it doesn't exist
          transaction.set(counterRef, { nextPosition: newPosition + 1 });
        }
  
        // Calculate join time, end time, and waiting time
        const joinTime = serverTimestamp();
        const endTime = moment().add(sessionData.avgWaitingTime, "minutes").toDate();
        const waitingTime = moment(endTime).diff(moment(), "minutes");
  
        // Create the new queue member object
        const newQueueMember = {
          userId: user.id,
          queueId: shortestQueue.id,
          joinTime: joinTime,
          lotId: lotData.id,
          endTime: endTime,
          position: newPosition,
          waitingTime: waitingTime,
          status: "waiting",
          createdAt: joinTime,
          updatedAt: joinTime,
          adminId: adminId,
        };
  
        // Add the new member to the queue
        const newDocRef = doc(collection(db, "queue_members"));
        transaction.set(newDocRef, newQueueMember);
      });
  
      Alert.alert("Success", "You have joined the queue successfully");
      router.replace("/home");
    } catch (error) {
      console.error("Error joining queue:", error);
      Alert.alert("Error", "An error occurred while joining the queue");
    } finally {
      setIsLoading(false);
    }
  };
  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!scanned && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
        </View>
      )}
      <View style={scanned ? styles.infoContainerScanned : styles.infoContainer}>
        <Text style={styles.title}>Scan QR Code to Join Queue</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3C73DC" />
        ) : (
          scanned && (
            <>
              <Text style={styles.scannedText}>QR Code Scanned Successfully</Text>
            
              {queueName && <Text style={styles.infoText}>Queue: {queueName}</Text>}
              {ownerName && <Text style={styles.infoText}>Owner: {ownerName}</Text>}
              {queueInfo && <Text style={styles.infoText}>Members: {queueInfo.memberCount}</Text>}
              <TouchableOpacity
                style={styles.button}
                onPress={handleJoinQueue}
              >
                <Text style={styles.buttonText}>Join Queue</Text>
              </TouchableOpacity>
            </>
          )
        )}
        <TouchableOpacity
          style={[styles.button, styles.scanAgainButton]}
          onPress={() => {
            setScanned(false);
            setAdminId(null);
            setQueueName(null);
            setOwnerName(null);
          }}
        >
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cameraContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  infoContainerScanned: {
    flex: 1, // Take up the remaining space
    justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  scannedText: {
    fontSize: 16,
    color: 'green',
    marginBottom: 10,
    textAlign: 'center',
  },
  qrPreviewContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#3C73DC',
    padding: 12,
    borderRadius:25 ,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanAgainButton: {
    backgroundColor: '#3C73DC',
    marginTop: 10,
  },
});
