import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function inspect() {
  console.log('--- FETCHING EVENTS ---');
  const eventsSnap = await getDocs(collection(db, 'campaigns', 'main_campaign', 'events'));
  eventsSnap.forEach(d => {
    console.log(`Event ID: ${d.id} | Name: ${d.data().name} | Date: ${d.data().date}`);
  });

  console.log('\n--- ANALYZING CONTACTS ---');
  const contactsSnap = await getDocs(collection(db, 'campaigns', 'main_campaign', 'contacts'));
  const contacts = contactsSnap.docs.map(d => d.data());
  console.log(`Total contacts: ${contacts.length}`);

  const sourceCounts = {};
  const eventNameCounts = {};
  const municipioCounts = {};

  contacts.forEach(c => {
    sourceCounts[c.source || 'undefined'] = (sourceCounts[c.source || 'undefined'] || 0) + 1;
    
    const events = Array.from(new Set([...(c.eventNames || []), c.eventName].filter(Boolean)));
    events.forEach(e => {
      eventNameCounts[e] = (eventNameCounts[e] || 0) + 1;
    });

    municipioCounts[c.municipio || 'undefined'] = (municipioCounts[c.municipio || 'undefined'] || 0) + 1;
  });

  console.log('Source breakdown:', sourceCounts);
  console.log('Event Name breakdown:', eventNameCounts);
  console.log('Municipio breakdown:', municipioCounts);
}

inspect().catch(console.error);
