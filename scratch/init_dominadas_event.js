
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOkHtoVXQ12K7P7FYNTB0nvAQW6bAKiTw",
  authDomain: "soy-nexo.firebaseapp.com",
  projectId: "soy-nexo",
  storageBucket: "soy-nexo.firebasestorage.app",
  messagingSenderId: "297456603993",
  appId: "1:297456603993:web:0f64d149f8ebef16b6f248"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initEvent() {
  const eventId = 'dominadas_estatal_2026';
  const eventRef = doc(db, 'campaigns', 'main_campaign', 'events', eventId);
  
  const eventData = {
    name: 'Torneo Estatal Dominadas en mi Barrio',
    date: '2026-05-17',
    time: 'Varios horarios',
    location: 'Guaymas, Sonora (Varias Sedes)',
    description: 'Torneo de dominadas para niños y jóvenes. ¡Participa y demuestra tu talento!',
    image: 'https://heribertoaguilar.org/wp-content/uploads/2026/04/f798f564-9e7b-452b-bf80-758b8c7bfcd9.jpg',
    active: true,
    timestamp: serverTimestamp()
  };

  await setDoc(eventRef, eventData, { merge: true });
  console.log('Evento creado/actualizado: ' + eventId);

  // Set as active event in profile
  const profileRef = doc(db, 'campaigns', 'main_campaign', 'config', 'profile');
  await setDoc(profileRef, { activeEventId: eventId }, { merge: true });
  console.log('Evento configurado como activo en el perfil.');
}

initEvent().catch(console.error);
