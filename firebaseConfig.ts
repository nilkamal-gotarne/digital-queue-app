// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmY5Lixg_ZEzlnIMmeInh467yezHBm_G4",
  authDomain: "digital-queue-29ce0.firebaseapp.com",
  projectId: "digital-queue-29ce0",
  storageBucket: "digital-queue-29ce0.appspot.com",
  messagingSenderId: "359684737046",
  appId: "1:359684737046:web:b990cfe4e6be554a9b0d37",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
