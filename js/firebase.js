/*
  Firebase initializer (UMD / compat) for the Admin dashboard.
  - Loads Firebase compat SDKs dynamically (UMD) so this file can be included
    with a normal `<script src="js/firebase.js"></script>` tag in admin HTML.
  - Initializes the app with the provided project credentials and exposes
    `window.fb` (firebase), `window.firestore`, and `window.realtimeDb`.
*/
(function(){
  if(window.fb && window.fb.apps && window.fb.apps.length) return; // already initialized

  const firebaseConfig = {
    apiKey: "AIzaSyCFWrYpgiLB8NyWql7e8p4oYFYdDRgigMs",
    authDomain: "rsb-storage-systm.firebaseapp.com",
    databaseURL: "https://rsb-storage-systm-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rsb-storage-systm",
    storageBucket: "rsb-storage-systm.firebasestorage.app",
    messagingSenderId: "804462722672",
    appId: "1:804462722672:web:8dc912fa37a22bfaab3eb5",
    measurementId: "G-5LJJ1FCKZT"
  };

  function loadScript(src){
    return new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = (e)=> rej(e);
      document.head.appendChild(s);
    })
  }

  // Use compat (UMD) builds so legacy non-module admin scripts can access `firebase`
  const base = 'https://www.gstatic.com/firebasejs/9.23.0/';
  Promise.resolve()
    .then(()=> loadScript(base + 'firebase-app-compat.js'))
    .then(()=> loadScript(base + 'firebase-firestore-compat.js'))
    .then(()=> loadScript(base + 'firebase-database-compat.js'))
    .then(()=> {
      try{
        const app = window.firebase.initializeApp(firebaseConfig);
        window.fb = window.firebase;
        window.firestore = window.firebase.firestore();
        window.realtimeDb = window.firebase.database();
        console.log('Firebase initialized (compat).');
      }catch(e){
        console.error('Failed to initialize Firebase', e);
      }
    })
    .catch(err=>{
      console.error('Failed to load Firebase scripts', err);
    });

})();
