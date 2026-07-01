======================================
XOXO GAME - SETUP GUIDE (5 MINUTE)
======================================

Ei game ta chalate FREE Firebase Firestore lagbe (realtime sync er jonno).
Vercel a host korar AGE ei step gula koro:

STEP 1: Firebase Project Baniyo
--------------------------------
1. https://console.firebase.google.com/ a jao
2. "Add project" click koro, naam dao (jemon: xoxo-game)
3. Google Analytics off rakhte paro, "Create project" click koro

STEP 2: Firestore Enable Koro
--------------------------------
1. Left menu theke "Build" > "Firestore Database" click koro
2. "Create database" click koro
3. "Start in test mode" select koro (easy setup)
4. Location select koro (jekono ekta, e.g. asia-south1) > Enable

STEP 3: Web App Add Koro & Config Nao
--------------------------------
1. Project overview page a "</>" (Web) icon click koro
2. App nickname dao (e.g. xoxo-web), "Register app" click koro
3. Ekta code block dekhbe jate "firebaseConfig = {...}" ache
4. Ei object ta copy koro

STEP 4: firebase-config.js File Edit Koro
--------------------------------
1. Project er "firebase-config.js" file open koro
2. "YOUR_API_KEY", "YOUR_PROJECT" etc shob jaygay
   nijer copy kora value gula paste koro

STEP 5: Firestore Security Rules (IMPORTANT)
--------------------------------
Test mode 30 din pore expire hoye jabe. Permanent kortey:

1. Firestore > "Rules" tab a jao
2. Ei rules ta paste koro:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
    }
  }
}

3. "Publish" click koro

(Note: eta open rule, jekeu access korte parbe room data.
 Personal/hobby project er jonno thik ache. Production a
 proper auth lagbe.)

STEP 6: Vercel a Deploy
--------------------------------
1. Ei folder ta GitHub a push koro (naya repo banao)
2. https://vercel.com a jao, "Add New Project"
3. GitHub repo select koro > Deploy (kono build command lagbe na,
   eta static HTML/JS site)
4. Deploy hoye gele ekta link pabe (e.g. xoxo-game.vercel.app)

DONE! Ekhon:
- Homepage a "Naya Game Baniyo" click korle link generate hobe
- Sheta friend ke pathaile, se link a click korle auto-join hoye jabe
- Dujon e realtime board dekhbe, turn by turn khelte parbe
