import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "studio-5474675352-c3e55",
  "appId": "1:1007510843435:web:d51672d92b6d6e08103a6e",
  "apiKey": "AIzaSyCUP-2XUI9IgrNpQmAVskvjHE95ZJy4gjY",
  "authDomain": "studio-5474675352-c3e55.firebaseapp.com",
  "storageBucket": "studio-5474675352-c3e55.appspot.com",
  "measurementId": "",
  "messagingSenderId": "1007510843435"
};

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export { firebaseApp, auth, db };
