# 🥋 BJJ Strength Training App

A progressive, AI-powered fitness app tailored for **Brazilian Jiu-Jitsu athletes**.
It generates personalized strength and conditioning programs, adapts in real-time to user feedback, and integrates with Firebase for authentication and data storage.

---

## ✨ Features

* 🧾 **Onboarding & Assessment**

  * Collects personal details (age, weight, height, experience, recovery goals, comp date)
  * Strength assessment (1RM inputs for squat, deadlift, bench, row, press)
  * Training frequency & BJJ schedule preferences

* 📈 **Smart Training Engine**

  * Periodized programming (Stabilization → Hypertrophy → Max Strength → Power)
  * Exercise selection based on six movement categories
  * Auto-adjustments based on RPE & performance feedback
  * Dynamic warm-ups and safety substitutions

* 🎯 **Workout Management**

  * Daily workout generation (`generateWorkoutForPhase.js`)
  * Real-time timer with pause/resume (`script.js`)
  * Exercise shuffling & substitutions
  * Isometric & power complexes for BJJ-specific explosiveness

* 📊 **Progress Tracking**

  * Dashboard with completed workouts, strength gains, and compliance metrics
  * Macrocycle/mesocycle visualization
  * Workout history stored in Firestore

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript (vanilla)
* **UI/UX:** Responsive layout, custom styles (`styles.css`), FontAwesome icons
* **Logic:** Modular JS (`script.js`, `phases.js`, `generateWorkoutForPhase.js`)
* **Database:** Firestore (`users`, `workout_plans`, `workout_history`)
* **Auth:** Firebase Authentication (email/password)
* **Testing:** `firebase-test.html` for debugging auth & Firestore

---

## 📦 Installation

1. Clone the repo:

   ```bash
   git clone https://github.com/your-username/bjj-fitness-app.git
   cd bjj-fitness-app
   ```

2. Install dependencies (if extending with npm):

   ```bash
   npm install
   ```

3. Open `index.html` in your browser to preview.

---

## 🔧 Firebase Setup

Follow the [Firebase Setup Guide](./FIREBASE_SETUP.md) for full instructions.
Quick steps:

1. Create a Firebase project
2. Enable **Email/Password authentication**
3. Create a **Firestore database** in test mode
4. Copy your Firebase config and replace it in `script.js` and `firebase-test.html`
5. Update Firestore security rules as shown in the setup guide

---

## 📂 Project Structure

```
├── index.html              # Main entry point (UI + navigation)
├── styles.css              # App styling
├── script.js               # Core logic (auth, workouts, database ops)
├── phases.js               # Training phase definitions
├── generateWorkoutForPhase.js # Example workout generator
├── database .txt           # BJJ strength & conditioning reference
├── cjm.txt                 # Customer journey map & system logic
├── FIREBASE_SETUP.md       # Firebase setup guide
├── firebase-test.html      # Debug page for Firebase init/auth/db
```

---

## 🚀 Roadmap

* [ ] Add belt progression tracker
* [ ] Wearable integration (Garmin, Apple Watch, Oura)
* [ ] AI-based fatigue detection
* [ ] Community leaderboard & sparring log

---

## 📄 License

MIT License. Free to use and adapt for personal or academic projects.

---

## 🙌 Acknowledgements

* Training logic based on BJJ-specific **strength & conditioning principles**
* UI inspired by modern fitness apps
* Firebase integration for secure auth & data persistence

---

Made with ❤️ by grapplers, for grapplers.
