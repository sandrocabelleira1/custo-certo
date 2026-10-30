
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";


// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "custocerto-vi1a8",
  appId: "1:853355905354:web:15b731306ae183762a01b3",
  storageBucket: "custocerto-vi1a8.firebasestorage.app",
  apiKey: "AIzaSyBABX_KAZSnSdTPsD-2k7xGZB1vACQTchU",
  authDomain: "custocerto-vi1a8.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "853355905354"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Conectar ao emulador de funções em ambiente de desenvolvimento
if (process.env.NODE_ENV === 'development') {
    // Aponte para o seu emulador local se estiver usando um, caso contrário, comente esta linha.
    // connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
