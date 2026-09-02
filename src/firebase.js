import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  
  apiKey: "AIzaSyA_iSLHsZdgKkFw1AXI8VIe1W8QdxDl3CI",
  authDomain: "rent-app-3a460.firebaseapp.com",
  projectId: "rent-app-3a460",
  storageBucket: "rent-app-3a460.firebasestorage.app",
  messagingSenderId: "556748160009",
  appId: "1:556748160009:web:7c4f617430fee978ff0cd8",
  measurementId: "G-MV17FFF9C4"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);