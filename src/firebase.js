import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCMhXbP327o4eS925fZ3_fIHd_ZMVH3Yfs",
  authDomain: "goroomz-4ac3c.firebaseapp.com",
  projectId: "goroomz-4ac3c",
  storageBucket: "goroomz-4ac3c.appspot.com",
  messagingSenderId: "657950771033",
  appId: "1:657950771033:web:060c6ee2094767aacf2e48",
  measurementId: "G-MWWLZFMNYX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
