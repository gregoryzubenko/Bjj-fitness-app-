// Global state management
let currentUser = null;
let currentWorkout = null;
let assessmentStep = 1;
let exerciseLibrary = {};
let authMode = 'signup'; // 'signup' or 'login'

// Workout timer state
let workoutTimerInterval = null;
let workoutTimerState = 'idle'; // idle | running | paused
let workoutTimerStart = 0;
let workoutTimerElapsed = 0;
// Форматирование времени в HH:MM:SS
function formatTime(sec) {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateWorkoutTimerUI() {
    const timerEl = document.getElementById('workoutTimer');
    if (timerEl) {
        let total = workoutTimerElapsed;
        if (workoutTimerState === 'running') {
            total += Math.floor((Date.now() - workoutTimerStart) / 1000);
        }
        timerEl.textContent = formatTime(total);
    }
    // Кнопка управления
    const btn = document.getElementById('workoutControlBtn');
    if (btn) {
        if (workoutTimerState === 'idle') {
            btn.textContent = 'Start Workout';
        } else if (workoutTimerState === 'running') {
            btn.textContent = 'Pause';
        } else if (workoutTimerState === 'paused') {
            btn.textContent = 'Resume Workout';
        }
    }
}

function handleWorkoutControl() {
    if (workoutTimerState === 'idle') {
        // Запуск тренировки
        workoutTimerState = 'running';
        workoutTimerStart = Date.now();
        workoutTimerElapsed = 0;
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        workoutTimerInterval = setInterval(updateWorkoutTimerUI, 1000);
        updateWorkoutTimerUI();
    } else if (workoutTimerState === 'running') {
        // Пауза
        workoutTimerState = 'paused';
        workoutTimerElapsed += Math.floor((Date.now() - workoutTimerStart) / 1000);
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        updateWorkoutTimerUI();
    } else if (workoutTimerState === 'paused') {
        // Возобновить
        workoutTimerState = 'running';
        workoutTimerStart = Date.now();
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        workoutTimerInterval = setInterval(updateWorkoutTimerUI, 1000);
        updateWorkoutTimerUI();
    }
}

function resetWorkoutTimer() {
    workoutTimerState = 'idle';
    workoutTimerElapsed = 0;
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    updateWorkoutTimerUI();
}

// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "fitness-bjj-app.firebaseapp.com",
    projectId: "fitness-bjj-app",
    storageBucket: "fitness-bjj-app.firebasestorage.app",
    messagingSenderId: "266210278805",
    appId: "1:266210278805:web:1870d707bf92104c12ca9c"
};

// Initialize Firebase with error handling
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Show user-friendly error message
    document.addEventListener('DOMContentLoaded', function() {
        showNotification('Firebase configuration error. Please check your setup.', 'error');
    });
}

// Structured Exercise Database derived from database .txt
const EXERCISE_DATABASE = {
    categories: {
        squat: {
            displayName: 'Squat / Leg Drive',
            base: ['Barbell Squat (Back Squat)', 'Front Squat', 'Split Squat', 'Zurcher Squat', 'Kettlebell Goblet Squat'],
            variations: ['Safety Squat Bar squat', 'Box Squat', 'Front Box Squat', 'Belt Squat', 'Rear Foot Elevated Split Squat (Bulgarian split squat)'],
            oneRmKey: 'squat'
        },
        hinge: {
            displayName: 'Hip Hinge / Extension',
            base: ['Deadlift', 'Barbell Hip Thrust', 'Kettlebell Swings'],
            variations: ['Trap Bar Deadlift', 'Deadlift from blocks/in the rack', 'Clean Pulls', 'Snatch Pulls', 'Clean High Pulls', 'Hip Thrust with resistance band or dumbbell', 'Isometric Mid-Thigh Pull'],
            oneRmKey: 'deadlift'
        },
        pull: {
            displayName: 'Upper Body Pull',
            base: ['Pull-Ups (classic bodyweight)', 'Bent-Over Rows', 'Seated Cable Rows', 'Cable Face Pulls'],
            variations: ['Pull-Up Variations (monkey grip, gi, towel, chin-ups, weighted, negatives/eccentric focus)', 'Single Arm Dumbbell Row', 'Complex Pull-ups (with long eccentric and trunk movement)'],
            oneRmKey: 'barbellRow'
        },
        push: {
            displayName: 'Upper Body Push',
            base: ['Bench Press (Barbell)', 'Dumbbell Bench Press', 'Floor Press', 'Dips (body weight)'],
            variations: ['Floor Press (with Swiss bar or neutral grip bar)', 'Dumbbell Z Press', 'Board Press variation', 'Unilateral Dumbbell Bench Press with grips (for isometric hold)'],
            oneRmKey: 'benchPress'
        },
        rotate: {
            displayName: 'Twisting / Rotation',
            base: ['Barbell Russian Twist', 'Medicine Ball Slams/Throws', 'Rotational Core Exercise (with band and medicine ball)'],
            variations: ['Medicine Ball Rotational Rebound']
        },
        carry: {
            displayName: 'Carrying / Grip',
            base: ['Farmer’s Walk', 'Rope Climbs', 'Dead Hang', 'Wrist Curls'],
            variations: ['Single Arm Farmer’s Walk', 'Plate Flips', 'Plate Holds/Two Plate Holds', 'Keg or Sandbag Front Carries', 'Kettlebell Front Rack Walk', 'Rock Climbing']
        }
    },
    modalities: {
        ballistic: ['Box Jump', 'Power Cleans', 'Snatch', 'Jerk', 'Ballistic Push Ups'],
        isometric: ['Dead Hang', 'Plate Hold/Carry', 'Paused Squats', 'Stretched Back Squat (holding position for 7 seconds)'],
        psychoIsometric: ['Explosive Push-ups after isometric dumbbell bench hold (40s gap)', 'Knee Jump after isometric squat hold (then hurdle hops)'],
        eccentric: ['Controlled lowering during pull-ups', 'Slow count during squats', 'Slow count during deadlifts'],
        accessory: ['Hammer Curl', 'Single Arm KB Press', 'Plate Flips']
    }
};

// Phase parameters: sets/reps/%1RM/tempo/rest per category emphasis
const PHASE_PARAMS = {
    Stabilization: {
        intensityPct: { main: 60, secondary: 55 },
        sets: { main: 3, secondary: 2 },
        reps: { main: 12, secondary: 15 },
        tempo: '4/2/1',
        restSec: 60
    },
    'Muscular Development': {
        intensityPct: { main: 70, secondary: 65 },
        sets: { main: 4, secondary: 3 },
        reps: { main: 8, secondary: 12 },
        tempo: '2/1/2',
        restSec: 90
    },
    'Maximal Strength': {
        intensityPct: { main: 85, secondary: 80 },
        sets: { main: 5, secondary: 3 },
        reps: { main: 3, secondary: 5 },
        tempo: '2/1/X',
        restSec: 180
    },
    Power: {
        intensityPct: { main: 50, secondary: 60 },
        sets: { main: 5, secondary: 3 },
        reps: { main: 3, secondary: 5 },
        tempo: 'X/0/X',
        restSec: 150
    }
};

function chooseFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Deterministic weekly templates per phase (3–4 days)
const WEEKLY_TEMPLATES = {
    Stabilization: [
        // Day A
        ['Squat / Leg Drive', 'Upper Body Pull', 'Twisting / Rotation', 'Carrying / Grip'],
        // Day B
        ['Hip Hinge / Extension', 'Upper Body Push', 'Twisting / Rotation', 'Carrying / Grip'],
        // Day C
        ['Squat / Leg Drive', 'Upper Body Pull', 'Upper Body Push', 'Carrying / Grip']
    ],
    'Muscular Development': [
        ['Squat / Leg Drive', 'Upper Body Push', 'Upper Body Pull', 'Twisting / Rotation'],
        ['Hip Hinge / Extension', 'Upper Body Pull', 'Upper Body Push', 'Carrying / Grip'],
        ['Squat / Leg Drive', 'Hip Hinge / Extension', 'Twisting / Rotation', 'Carrying / Grip']
    ],
    'Maximal Strength': [
        ['Squat / Leg Drive', 'Upper Body Pull', 'Upper Body Push', 'Carrying / Grip'],
        ['Hip Hinge / Extension', 'Upper Body Push', 'Upper Body Pull', 'Twisting / Rotation'],
        ['Squat / Leg Drive', 'Hip Hinge / Extension', 'Carrying / Grip']
    ],
    Power: [
        ['Hip Hinge / Extension', 'Ballistic Power', 'Upper Body Pull', 'Carrying / Grip'],
        ['Squat / Leg Drive', 'Upper Body Push', 'Twisting / Rotation', 'Ballistic Power'],
        ['Hip Hinge / Extension', 'Upper Body Pull', 'Twisting / Rotation']
    ]
};

const DAY_NAME_TO_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function pickTemplateForToday(userData) {
    const phase = getPhaseForToday(userData);
    const tpl = WEEKLY_TEMPLATES[phase];
    if (!tpl) return null;
    // Map user BJJ days to 3 training days spaced away (simple heuristic)
    const bjjDays = Array.isArray(userData.bjjSchedule) ? userData.bjjSchedule : [];
    // choose first N non-BJJ days as lifting days
    const desired = Math.min(userData.trainingDays || 3, tpl.length);
    const week = [0,1,2,3,4,5,6];
    const bjjIdx = new Set(bjjDays.map(d => DAY_NAME_TO_INDEX[d]));
    const liftDays = week.filter(i => !bjjIdx.has(i));
    // fallback to sequential if not enough
    while (liftDays.length < desired) liftDays.push(week[liftDays.length % 7]);
    // compute today index
    const todayIdx = new Date().getDay();
    // pick template index based on how many lift days have occurred this week up to today
    const countSoFar = liftDays.filter(i => i <= todayIdx).length;
    const tplIndex = Math.max(0, Math.min(desired - 1, countSoFar - 1));
    return tpl[tplIndex];
}

function getPhaseForToday(userData) {
    if (userData && userData.program && userData.program.currentMesocycle) {
        return userData.program.currentMesocycle.phase || 'Stabilization';
    }
    return 'Stabilization';
}

function mapExerciseToOneRmKey(name) {
    const lower = name.toLowerCase();
    if (lower.includes('bench') || lower.includes('press') && !lower.includes('row')) return 'benchPress';
    if (lower.includes('squat')) return 'squat';
    if (lower.includes('deadlift') || lower.includes('hip thrust') || lower.includes('hinge')) return 'deadlift';
    if (lower.includes('row')) return 'barbellRow';
    if (lower.includes('overhead press') || lower === 'ohp') return 'overheadPress';
    return null;
}

function computeWeightForExercise(exName, pct, userData) {
    const key = mapExerciseToOneRmKey(exName);
    if (!key || !userData || !userData[key]) return null; // bodyweight/skill or unknown
    const base = Number(userData[key]);
    if (!Number.isFinite(base)) return null;
    return Math.max(0, Math.round(base * (pct / 100)));
}

function assignExercisesForDay(userData) {
    const phase = getPhaseForToday(userData);
    const params = PHASE_PARAMS[phase];
    const cat = EXERCISE_DATABASE.categories;

    // Determine template-driven categories for today
    const templateCats = pickTemplateForToday(userData);
    let selections = [];
    if (templateCats && templateCats.length) {
        selections = templateCats.map((label, idx) => {
            const isMain = idx <= 1; // first two are main lifts
            if (label === 'Ballistic Power') {
                const ballistic = chooseFrom(EXERCISE_DATABASE.modalities.ballistic);
                return { type: 'ballistic', name: ballistic, isMain: true, ballistic: true };
            }
            const map = {
                'Squat / Leg Drive': 'squat',
                'Hip Hinge / Extension': 'hinge',
                'Upper Body Pull': 'pull',
                'Upper Body Push': 'push',
                'Twisting / Rotation': 'rotate',
                'Carrying / Grip': 'carry'
            };
            const key = map[label];
            const pool = key ? [...cat[key].base, ...(cat[key].variations || [])] : [];
            const name = pool.length ? chooseFrom(pool) : label;
            return { type: key || label, name, isMain };
        });
    } else {
        // Fallback to category coverage if no template
        selections = [
            { type: 'squat', name: chooseFrom([...cat.squat.base, ...cat.squat.variations]), isMain: true },
            { type: 'hinge', name: chooseFrom([...cat.hinge.base, ...cat.hinge.variations]), isMain: true },
            { type: 'pull', name: chooseFrom([...cat.pull.base, ...cat.pull.variations]), isMain: false },
            { type: 'push', name: chooseFrom([...cat.push.base, ...cat.push.variations]), isMain: false },
            { type: 'rotate', name: chooseFrom([...cat.rotate.base, ...cat.rotate.variations]), isMain: false },
            { type: 'carry', name: chooseFrom([...cat.carry.base, ...cat.carry.variations]), isMain: false }
        ];
    }

    // Modality scheduling per database.txt
    // Power: add ballistic at 40–60% of 1RM (or bodyweight/no-load where applicable)
    if (phase === 'Power') {
        const ballistic = chooseFrom(EXERCISE_DATABASE.modalities.ballistic);
        selections.splice(2, 0, { type: 'ballistic', name: ballistic, isMain: true, ballistic: true });
    }

    // Occasionally include isometric emphasis (e.g., 1 in 4 sessions)
    const sessionCount = getAndIncrementCounter('sessionCount');
    if (sessionCount % 4 === 0) {
        const iso = chooseFrom(EXERCISE_DATABASE.modalities.isometric);
        selections.push({ type: 'isometric', name: iso, isMain: false, isometric: true });
    }

    // Psycho isometric weekly (~1 in 7 sessions)
    if (sessionCount % 7 === 0) {
        const psi = chooseFrom(EXERCISE_DATABASE.modalities.psychoIsometric);
        selections.push({ type: 'psychoIsometric', name: psi, isMain: false, psycho: true });
    }

    return selections.map(sel => {
        let pct = sel.isMain ? params.intensityPct.main : params.intensityPct.secondary;
        // Ballistic intensity 40–60% 1RM
        if (sel.ballistic) {
            pct = 40 + Math.round(Math.random() * 20);
        }
        const sets = sel.isMain ? params.sets.main : params.sets.secondary;
        let reps = sel.isMain ? params.reps.main : params.reps.secondary;
        // Eccentric emphasis: apply 3–5 count when relevant
        let tempo = params.tempo;
        if (sel.type === 'pull' || sel.type === 'squat' || sel.type === 'hinge') {
            // randomly apply eccentric emphasis sometimes
            if (Math.random() < 0.25) {
                const ecc = 3 + Math.floor(Math.random() * 3); // 3-5 count
                tempo = `${ecc}/1/1`;
            }
        }
        const weight = computeWeightForExercise(sel.name, pct, userData);
        return {
            category: sel.type,
            name: sel.name,
            sets,
            reps,
            percentage: weight ? pct : null,
            weight: weight,
            tempo,
            rest: params.restSec
        };
    });
}

// Authentication Functions
function openAuthModal(mode) {
    authMode = mode;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitText = document.getElementById('authSubmitText');
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.getElementById('authSwitchLink');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    if (mode === 'signup') {
        title.textContent = 'Sign Up';
        submitText.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        switchLink.textContent = 'Log In';
        forgotPasswordLink.style.display = 'none';
    } else {
        title.textContent = 'Log In';
        submitText.textContent = 'Log In';
        switchText.textContent = "Don't have an account?";
        switchLink.textContent = 'Sign Up';
        forgotPasswordLink.style.display = 'block';
    }
    
    // Clear form
    document.getElementById('authForm').reset();
    hideAuthError();
    
    modal.style.display = 'block';
}

// Start journey function - shows auth modal first, then assessment
function startJourney() {
    console.log('Start journey clicked, currentUser:', currentUser);
    if (currentUser) {
        // User is already logged in, go to assessment
        console.log('User logged in, starting assessment');
        startAssessment();
    } else {
        // User needs to sign up first
        console.log('User not logged in, opening signup modal');
        openAuthModal('signup');
    }
}

function closeAuthModal() {
    console.log('Closing auth modal...');
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        hideAuthError();
        // Clear the form
        document.getElementById('authForm').reset();
        console.log('Auth modal closed');
    } else {
        console.error('Auth modal not found');
    }
}

function switchAuthMode() {
    const newMode = authMode === 'signup' ? 'login' : 'signup';
    openAuthModal(newMode);
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideAuthError() {
    const errorDiv = document.getElementById('authError');
    errorDiv.style.display = 'none';
}

function setAuthLoading(loading) {
    const submitBtn = document.getElementById('authSubmitBtn');
    const submitText = document.getElementById('authSubmitText');
    const spinner = document.getElementById('authSpinner');
    
    if (loading) {
        submitBtn.disabled = true;
        submitText.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    
    // Check if Firebase is initialized
    if (!auth || !db) {
        showAuthError('Firebase not initialized. Please check your configuration.');
        return;
    }
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    setAuthLoading(true);
    hideAuthError();
    
    try {
        if (authMode === 'signup') {
            await signUp(email, password);
        } else {
            await signIn(email, password);
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAuthError(getErrorMessage(error));
    } finally {
        setAuthLoading(false);
    }
}

async function signUp(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false
        });
        
        showNotification('Account created! Please check your email to verify your account.', 'success');
        
        // Close modal after a short delay to show success message
        setTimeout(() => {
            closeAuthModal();
            // Show verification message
            showNotification('Please verify your email before logging in.', 'info');
        }, 1500);
        
    } catch (error) {
        throw error;
    }
}

async function signIn(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if email is verified
        if (!user.emailVerified) {
            // Sign out the user immediately to prevent auth state listener issues
            await auth.signOut();
            showAuthError('Please verify your email before logging in. Check your inbox for a verification link.');
            // Don't close modal, let user try again or verify email
            return;
        }
        
        // Store user basic info in localStorage if not present
        let localUser = JSON.parse(localStorage.getItem(user.uid) || '{}');
        localUser.uid = user.uid;
        localUser.email = user.email;
        localUser.emailVerified = true;
        localStorage.setItem(user.uid, JSON.stringify(localUser));
        currentUser = localUser;
        showNotification('Welcome back!', 'success');
        setTimeout(() => {
            closeAuthModal();
            showPage(currentUser.assessmentCompleted ? 'dashboard' : 'assessment');
            updateDashboard();
        }, 300);
        
    } catch (error) {
        throw error;
    }
}

async function resetPassword() {
    const email = document.getElementById('authEmail').value;
    
    if (!email) {
        showAuthError('Please enter your email address first');
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showNotification('Password reset email sent! Check your inbox.', 'success');
        closeAuthModal();
    } catch (error) {
        showAuthError(getErrorMessage(error));
    }
}

async function loadUserData(uid) {
    // Load user data from localStorage by UID
    let localUser = null;
    try {
        localUser = JSON.parse(localStorage.getItem(uid) || '{}');
    } catch (error) {
        console.error('Error loading user data from localStorage:', error);
    }
    if (localUser && localUser.uid) {
        currentUser = localUser;
    } else {
        currentUser = null;
    }
}

function getErrorMessage(error) {
    console.error('Firebase Auth Error:', error.code, error.message);
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Try logging in instead.';
        case 'auth/weak-password':
            return 'Password is too weak. Please choose a stronger password.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/invalid-credential':
            return 'Invalid credentials. Please check your email and password.';
        case 'auth/operation-not-allowed':
            return 'Email/password authentication is not enabled. Please contact support.';
        case 'auth/requires-recent-login':
            return 'Please log out and log back in to complete this action.';
        case 'auth/invalid-api-key':
            return 'Firebase configuration error. Please contact support.';
        case 'auth/app-not-authorized':
            return 'Firebase app not authorized. Please contact support.';
        case 'auth/quota-exceeded':
            return 'Service temporarily unavailable. Please try again later.';
        default:
            return `Authentication error: ${error.message || 'Please try again.'}`;
    }
}

// Logout function
async function logout() {
    try {
        await auth.signOut();
        if (currentUser && currentUser.uid) {
            // Не удаляем данные пользователя из localStorage, только сбрасываем сессию
            currentUser = null;
        }
        showPage('home');
        updateNavigationVisibility(false);
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Update navigation visibility based on auth state
function updateNavigationVisibility(isAuthenticated) {
    const homeLink = document.querySelector('.nav-link[href="#home"]');
    const dashboardLink = document.getElementById('dashboardLink');
    const workoutLink = document.getElementById('workoutLink');
    const progressLink = document.getElementById('progressLink');
    const logoutBtn = document.getElementById('logoutBtn');

    if (isAuthenticated) {
        if (homeLink) homeLink.style.display = 'none';
        dashboardLink.style.display = 'block';
        workoutLink.style.display = 'block';
        progressLink.style.display = 'block';
        logoutBtn.style.display = 'block';
    } else {
        if (homeLink) homeLink.style.display = 'block';
        dashboardLink.style.display = 'none';
        workoutLink.style.display = 'none';
        progressLink.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
}

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
    
    if (user && user.emailVerified) {
        // AuthUser: не показываем Home вообще
        try {
            await loadUserData(user.uid);
            updateNavigationVisibility(true);
            // Скрыть Home
            document.getElementById('home').classList.remove('active');
            // Показываем только dashboard или assessment
            if (currentUser && currentUser.assessmentCompleted) {
                showPage('dashboard');
                updateDashboard();
            } else {
                showPage('assessment');
                updateAssessmentProgress();
                showCurrentStep();
            }
        } catch (error) {
            console.error('Error in auth state listener:', error);
            currentUser = null;
            updateNavigationVisibility(false);
        }
    } else {
        // GuestUser: только Home
        currentUser = null;
        updateNavigationVisibility(false);
        showPage('home');
    }
});

// Debug function to check Firebase status
function checkFirebaseStatus() {
    console.log('=== Firebase Debug Info ===');
    console.log('Firebase app:', firebase.apps.length > 0 ? 'Initialized' : 'Not initialized');
    console.log('Auth object:', auth ? 'Available' : 'Not available');
    console.log('Firestore object:', db ? 'Available' : 'Not available');
    console.log('Config:', firebaseConfig);
    
    if (auth) {
        console.log('Current user:', auth.currentUser);
        console.log('Auth state:', auth.currentUser ? 'Signed in' : 'Signed out');
    }
    console.log('========================');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadExerciseLibrary();
    
    // Setup auth form
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    
    // Add debug function to window for console testing
    window.checkFirebaseStatus = checkFirebaseStatus;
    
    // Check Firebase status on load
    setTimeout(checkFirebaseStatus, 1000);
});

// Initialize app state
function initializeApp() {
    // The auth state listener will handle showing the appropriate page
    // based on authentication status
    showPage('home');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetPage = this.getAttribute('href').substring(1);
            showPage(targetPage);
            updateActiveNavLink(this);
        });
    });

    // Mobile navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
        });
    });

    // Modal close
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('exerciseModal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Page navigation
function showPage(pageId) {
    console.log('Showing page:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('Page shown:', pageId);
    } else {
        console.error('Page not found:', pageId);
    }

    // Update navigation
    updateActiveNavLink(document.querySelector(`[href="#${pageId}"]`));
}

// Update active navigation link
function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Assessment flow
function startAssessment() {
    console.log('Starting assessment...');
    assessmentStep = 1; // Reset to first step
    showPage('assessment');
    updateAssessmentProgress();
    showCurrentStep();
    console.log('Assessment started, step:', assessmentStep);
}

function nextStep() {
    if (validateCurrentStep()) {
        assessmentStep++;
        updateAssessmentProgress();
        showCurrentStep();
    }
}

function prevStep() {
    if (assessmentStep > 1) {
        assessmentStep--;
        updateAssessmentProgress();
        showCurrentStep();
    }
}

function showCurrentStep() {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const stepNames = ['personalDetails', 'strengthAssessment', 'goalsPreferences'];
    const currentStepElement = document.getElementById(stepNames[assessmentStep - 1]);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
}

function updateAssessmentProgress() {
    const progressFill = document.getElementById('assessmentProgress');
    const progressText = document.getElementById('progressText');
    
    const progressPercentage = (assessmentStep / 3) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `Step ${assessmentStep} of 3`;
}

// Simple counters persisted to localStorage for modality scheduling
function getAndIncrementCounter(key) {
    const storageKey = `bjj_${key}`;
    const val = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const next = val + 1;
    localStorage.setItem(storageKey, String(next));
    return next;
}

function validateCurrentStep() {
    const stepNames = ['personalDetails', 'strengthAssessment', 'goalsPreferences'];
    const currentStepElement = document.getElementById(stepNames[assessmentStep - 1]);
    
    if (!currentStepElement) return false;
    
    const requiredFields = currentStepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#ef4444';
        } else {
            field.style.borderColor = '#e2e8f0';
        }
    });
    
    return isValid;
}

async function generateProgram() {
    if (!validateCurrentStep()) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    if (!currentUser || !currentUser.uid) {
        showNotification('Please log in to generate your program', 'error');
        return;
    }

    // Collect all form data
    const userData = collectAssessmentData();
    // Update current user with assessment data
    currentUser = { ...currentUser, ...userData };
    let program = null;
    let userSaved = false;
    // Save all user data to localStorage by UID
    currentUser = {
        ...currentUser,
        ...userData,
        assessmentCompleted: true,
        program: generateInitialProgram(userData)
    };
    localStorage.setItem(currentUser.uid, JSON.stringify(currentUser));
    showPage('dashboard');
    updateDashboard();
    showNotification('Program generated and saved locally!', 'success');
}

function collectAssessmentData() {
    const personalDetails = {
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value),
        weight: parseInt(document.getElementById('weight').value),
        height: parseInt(document.getElementById('height').value),
        experience: document.getElementById('experience').value,
        recovery: document.getElementById('recovery').value,
        competitionDate: document.getElementById('competitionDate').value
    };
    
    const strengthData = {
        benchPress: parseInt(document.getElementById('benchPress').value),
        deadlift: parseInt(document.getElementById('deadlift').value),
        squat: parseInt(document.getElementById('squat').value),
        overheadPress: parseInt(document.getElementById('overheadPress').value),
        barbellRow: parseInt(document.getElementById('barbellRow').value)
    };
    
    const preferences = {
        trainingDays: parseInt(document.getElementById('trainingDays').value),
        sessionLength: parseInt(document.getElementById('sessionLength').value),
        bjjSchedule: Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
    };
    
    return {
        ...personalDetails,
        ...strengthData,
        ...preferences,
        joinDate: new Date().toISOString(),
        currentPhase: 'Stabilization',
        workoutsCompleted: 0,
        programCompliance: 0
    };
}

function generateInitialProgram(userData) {
    // This would integrate with your algorithm
    // For now, we'll create a sample program
    const program = {
        macrocycle: {
            duration: 16, // weeks
            phases: [
                { name: 'Stabilization', weeks: 4, completed: false },
                { name: 'Muscular Development', weeks: 4, completed: false },
                { name: 'Maximal Strength', weeks: 4, completed: false },
                { name: 'Power', weeks: 4, completed: false }
            ]
        },
        currentMesocycle: {
            phase: 'Stabilization',
            week: 1,
            day: 1
        },
        todayWorkout: generateTodaysWorkout(userData)
    };
    
    return program;
}

function generateTodaysWorkout(userData) {
    const phase = getPhaseForToday(userData);
    const exercises = assignExercisesForDay(userData);
    const sessionLength = userData && Number.isFinite(userData.sessionLength) ? userData.sessionLength : 45;
    return {
        phase,
        duration: sessionLength,
        exercises
    };
}

// Switch Day: cycles through the weekly template days
function switchWorkout() {
    if (!currentUser) return;
    const idx = getNextTemplateDay(currentUser);
    // regenerate using the new index
    const phase = getPhaseForToday(currentUser);
    const tpl = WEEKLY_TEMPLATES[phase] || [];
    const forcedCats = tpl[idx] || null;
    if (forcedCats) {
        currentUser.program.todayWorkout = buildWorkoutFromForcedTemplate(currentUser, forcedCats);
        localStorage.setItem('bjjUserData', JSON.stringify(currentUser));
        updateDashboard();
        showNotification('Switched to next template day', 'success');
    } else {
        showNotification('No additional template days available', 'info');
    }
}

function buildWorkoutFromForcedTemplate(userData, templateCats) {
    // Recreate the selection logic but with provided template categories
    const phase = getPhaseForToday(userData);
    const params = PHASE_PARAMS[phase];
    const cat = EXERCISE_DATABASE.categories;
    const selections = templateCats.map((label, idx) => {
        const isMain = idx <= 1;
        if (label === 'Ballistic Power') {
            const ballistic = chooseFrom(EXERCISE_DATABASE.modalities.ballistic);
            return { type: 'ballistic', name: ballistic, isMain: true, ballistic: true };
        }
        const map = {
            'Squat / Leg Drive': 'squat',
            'Hip Hinge / Extension': 'hinge',
            'Upper Body Pull': 'pull',
            'Upper Body Push': 'push',
            'Twisting / Rotation': 'rotate',
            'Carrying / Grip': 'carry'
        };
        const key = map[label];
        const pool = key ? [...cat[key].base, ...(cat[key].variations || [])] : [];
        const name = pool.length ? chooseFrom(pool) : label;
        return { type: key || label, name, isMain };
    });
    
    // Map selections to final exercise prescriptions using existing mapping
    const sessionCount = getAndIncrementCounter('sessionCount');
    // reuse mapping from assignExercisesForDay by re-creating minimal fields and reusing code chunk
    return {
        phase,
        duration: userData && Number.isFinite(userData.sessionLength) ? userData.sessionLength : 45,
        exercises: selections.map(sel => {
            let pct = sel.isMain ? params.intensityPct.main : params.intensityPct.secondary;
            if (sel.ballistic) pct = 40 + Math.round(Math.random() * 20);
            const sets = sel.isMain ? params.sets.main : params.sets.secondary;
            let reps = sel.isMain ? params.reps.main : params.reps.secondary;
            let tempo = params.tempo;
            if (sel.type === 'pull' || sel.type === 'squat' || sel.type === 'hinge') {
                if (Math.random() < 0.25) {
                    const ecc = 3 + Math.floor(Math.random() * 3);
                    tempo = `${ecc}/1/1`;
                }
            }
            const weight = computeWeightForExercise(sel.name, pct, userData);
            return { category: sel.type, name: sel.name, sets, reps, percentage: weight ? pct : null, weight, tempo, rest: params.restSec };
        })
    };
}

// Shuffle: re-pick exercises within the same template categories
function shuffleWorkout() {
    if (!currentUser || !currentUser.program || !currentUser.program.todayWorkout) return;
    const current = currentUser.program.todayWorkout;
    const cats = current.exercises.map(e => e.category);
    // translate categories back to labels
    const labelMap = {
        squat: 'Squat / Leg Drive',
        hinge: 'Hip Hinge / Extension',
        pull: 'Upper Body Pull',
        push: 'Upper Body Push',
        rotate: 'Twisting / Rotation',
        carry: 'Carrying / Grip',
        ballistic: 'Ballistic Power'
    };
    const labels = cats.map(c => labelMap[c] || c);
    currentUser.program.todayWorkout = buildWorkoutFromForcedTemplate(currentUser, labels);
    localStorage.setItem('bjjUserData', JSON.stringify(currentUser));
    updateDashboard();
    showNotification('Shuffled exercises for today', 'success');
}

// Dashboard functions
async function updateDashboard() {
    if (!currentUser) return;
    
    // Update user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = `Welcome back, ${currentUser.gender === 'male' ? 'Mr.' : 'Ms.'} User!`;
    }
    
    // Update current phase
    const currentPhaseElement = document.getElementById('currentPhase');
    if (currentPhaseElement && currentUser.program) {
        currentPhaseElement.textContent = currentUser.program.currentMesocycle.phase;
    }
    
    // Update workout preview
    updateWorkoutPreview();

    // Update dashboard history/metrics
    await renderDashboardHistory();
}

function updateWorkoutPreview() {
    const workoutPreview = document.getElementById('workoutPreview');
    if (!workoutPreview || !currentUser.program) return;
    
    const workout = currentUser.program.todayWorkout;
    workoutPreview.innerHTML = '';
    
    workout.exercises.forEach(exercise => {
        const exerciseItem = document.createElement('div');
        exerciseItem.className = 'exercise-item';
        exerciseItem.innerHTML = `
            <div class="exercise-name">${exercise.name}</div>
            <div class="exercise-details">${exercise.sets} × ${exercise.reps}${exercise.weight ? ` @ ${exercise.weight} lbs` : ''}${exercise.percentage ? ` (${exercise.percentage}% 1RM)` : ''}</div>
        `;
        workoutPreview.appendChild(exerciseItem);
    });
}

// History persistence and dashboard rendering
async function saveWorkoutToHistory(workout) {
    if (!currentUser || !currentUser.uid) return;
    
    const summary = {
        user_uid: currentUser.uid,
        date: new Date().toISOString(),
        phase: workout.phase,
        duration: workout.duration,
        exercises: workout.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps })),
        completed_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('workout_history').add(summary);
    } catch (error) {
        console.error('Error saving workout history:', error);
    }
}

async function renderDashboardHistory() {
    if (!currentUser || !currentUser.uid) return;
    
    try {
        const historySnapshot = await db.collection('workout_history')
            .where('user_uid', '==', currentUser.uid)
            .orderBy('completed_at', 'desc')
            .limit(5)
            .get();
        
        const history = [];
        historySnapshot.forEach(doc => {
            history.push(doc.data());
        });
        
        const metricEl = document.getElementById('metricWorkoutsCompleted');
        if (metricEl) metricEl.textContent = String(history.length);

        const recentEl = document.getElementById('recentWorkouts');
        if (!recentEl) return;
        recentEl.innerHTML = '';
        
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'workout-item';
            const date = new Date(item.date).toLocaleDateString();
            const exNames = item.exercises.slice(0, 3).map(e => e.name).join(', ');
            div.innerHTML = `
                <div class="workout-date">${date}</div>
                <div class="workout-exercises">${exNames}${item.exercises.length > 3 ? '…' : ''}</div>
                <div class="workout-rating">—</div>
            `;
            recentEl.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading workout history:', error);
    }
}

// Workout functions
function startWorkout() {
    if (!currentUser || !currentUser.program) {
        showNotification('Please complete your assessment first', 'error');
        return;
    }
    // Ensure we have a current workout, generate if needed
    if (!currentUser.program.todayWorkout) {
        currentUser.program.todayWorkout = generateTodaysWorkout(currentUser);
    }
    currentWorkout = {
        ...currentUser.program.todayWorkout,
        startTime: new Date(),
        completedExercises: [],
        currentExerciseIndex: 0
    };
    showPage('workout');
    updateWorkoutInterface();
    resetWorkoutTimer();
    updateWorkoutTimerUI();
}

function updateWorkoutInterface() {
    if (!currentWorkout) return;
    
    const workoutTitle = document.getElementById('workoutTitle');
    const exerciseList = document.getElementById('exerciseList');
    
    if (workoutTitle) {
        workoutTitle.textContent = 'Today\'s Workout';
    }
    
    if (exerciseList) {
        exerciseList.innerHTML = '';
        
        currentWorkout.exercises.forEach((exercise, index) => {
            const exerciseItem = document.createElement('div');
            exerciseItem.className = 'exercise-item';
            exerciseItem.innerHTML = `
                <div class="exercise-name">${exercise.name}</div>
                <div class="exercise-details">${exercise.sets} × ${exercise.reps}${exercise.weight ? ` @ ${exercise.weight} lbs` : ''}${exercise.percentage ? ` (${exercise.percentage}% 1RM)` : ''}</div>
            `;
            exerciseItem.addEventListener('click', () => openExerciseModal(exercise, index));
            exerciseList.appendChild(exerciseItem);
        });
    }
}

function openExerciseModal(exercise, exerciseIndex) {
    const modal = document.getElementById('exerciseModal');
    const modalExerciseName = document.getElementById('modalExerciseName');
    
    if (modalExerciseName) {
        modalExerciseName.textContent = exercise.name;
    }
    
    // Update set info
    const setNumber = document.querySelector('.set-number');
    const setTarget = document.querySelector('.set-target');
    
    if (setNumber && setTarget) {
        setNumber.textContent = `Set 1`;
        setTarget.textContent = `${exercise.reps} reps @ ${exercise.weight} lbs`;
    }
    
    // Set current values
    const setWeight = document.getElementById('setWeight');
    const setReps = document.getElementById('setReps');
    
    if (setWeight) setWeight.value = exercise.weight;
    if (setReps) setReps.value = exercise.reps;
    
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('exerciseModal');
    modal.style.display = 'none';
}

function completeSet() {
    const setWeight = document.getElementById('setWeight');
    const setReps = document.getElementById('setReps');
    const setRPE = document.getElementById('setRPE');
    
    if (!setWeight || !setReps || !setRPE) return;
    
    const setData = {
        weight: parseInt(setWeight.value),
        reps: parseInt(setReps.value),
        rpe: parseInt(setRPE.value),
        timestamp: new Date()
    };
    
    // Log the set data
    console.log('Set completed:', setData);
    
    // Adjust next set based on performance
    adjustNextSet(setData);
    
    closeModal();
    showNotification('Set completed!', 'success');
}

function adjustNextSet(setData) {
    // This would implement the real-time adjustment algorithm
    // For now, we'll show a simple adjustment
    if (setData.rpe < 7) {
        showNotification('Next set: Increase weight by 5-10 lbs', 'info');
    } else if (setData.rpe > 9) {
        showNotification('Next set: Decrease weight by 5-10 lbs', 'info');
    }
}

function substituteExercise() {
    // This would open the exercise substitution interface
    showNotification('Exercise substitution feature coming soon!', 'info');
}

function pauseWorkout() {
    showNotification('Workout paused', 'info'); // не используется, для совместимости
}

async function endWorkout() {
    if (confirm('Are you sure you want to end this workout?')) {
        if (currentWorkout) {
            await saveWorkoutToHistory(currentWorkout);
        }
        currentWorkout = null;
        resetWorkoutTimer();
        showPage('dashboard');
        updateDashboard();
        showNotification('Тренировка завершена и сохранена', 'success');
    }
}

// Progress tracking functions
function viewProgress() {
    showPage('progress');
    updateProgressCharts();
}

function updateProgressCharts() {
    // This would integrate with a charting library like Chart.js
    // For now, we'll show placeholder content
    const strengthChart = document.getElementById('strengthChart');
    const frequencyChart = document.getElementById('frequencyChart');
    
    if (strengthChart) {
        strengthChart.innerHTML = '<div style="color: #64748b;">Strength Progress Chart<br><small>Chart.js integration needed</small></div>';
    }
    
    if (frequencyChart) {
        frequencyChart.innerHTML = '<div style="color: #64748b;">Workout Frequency Chart<br><small>Chart.js integration needed</small></div>';
    }
}

// Phase change functions
function changePhase() {
    const modal = document.getElementById('phaseModal');
    const currentPhase = currentUser?.program?.currentMesocycle?.phase || 'Stabilization';
    
    // Set current phase as selected
    const phaseInputs = document.querySelectorAll('input[name="phase"]');
    phaseInputs.forEach(input => {
        if (input.value === currentPhase) {
            input.checked = true;
        }
    });
    
    modal.style.display = 'block';
}

function closePhaseModal() {
    const modal = document.getElementById('phaseModal');
    modal.style.display = 'none';
}

async function confirmPhaseChange() {
    const selectedPhase = document.querySelector('input[name="phase"]:checked');
    if (!selectedPhase) {
        showNotification('Please select a phase', 'error');
        return;
    }

    const newPhase = selectedPhase.value;
    try {
        // Обновляем фазу в currentUser
        if (currentUser.program && currentUser.program.currentMesocycle) {
            currentUser.program.currentMesocycle.phase = newPhase;
        }
        // Генерируем новую тренировку для новой фазы
        const newWorkout = generateTodaysWorkout(currentUser);
        if (currentUser.program) {
            currentUser.program.todayWorkout = newWorkout;
        }
        // Сохраняем изменения в localStorage
        localStorage.setItem(currentUser.uid, JSON.stringify(currentUser));
        closePhaseModal();
        updateDashboard();
        showNotification(`Фаза изменена на ${newPhase}`, 'success');
    } catch (error) {
        console.error('Ошибка при смене фазы:', error);
        showNotification('Ошибка при смене фазы. Попробуйте ещё раз.', 'error');
    }
}

// Assessment change function
function changeAssessment() {
    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }
    
    // Reset assessment step and show assessment
    assessmentStep = 1;
    showPage('assessment');
    updateAssessmentProgress();
    showCurrentStep();
    showNotification('Update your assessment data', 'info');
}

// Quick action functions
function adjustProgram() {
    showNotification('Program adjustment feature coming soon!', 'info');
}

function viewHistory() {
    showNotification('Workout history feature coming soon!', 'info');
}

function openExerciseLibrary() {
    showNotification('Exercise library feature coming soon!', 'info');
}

// Exercise library
function loadExerciseLibrary() {
    exerciseLibrary = {
        'Floor Press': {
            alternatives: ['Bench Press', 'Dumbbell Press', 'Incline Press'],
            category: 'Push',
            bjjSpecific: true
        },
        'Bent-Over Row': {
            alternatives: ['Cable Row', 'T-Bar Row', 'Dumbbell Row'],
            category: 'Pull',
            bjjSpecific: true
        },
        'Hip Thrust': {
            alternatives: ['Glute Bridge', 'Single Leg Hip Thrust', 'Bulgarian Split Squat'],
            category: 'Hip Hinge',
            bjjSpecific: true
        },
        'Farmer\'s Walk': {
            alternatives: ['Suitcase Carry', 'Overhead Carry', 'Sandbag Carry'],
            category: 'Carry',
            bjjSpecific: true
        }
    };
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 3000;
        font-weight: 500;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Toggle section visibility
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const content = section.querySelector('.section-content');
        const button = section.querySelector('.section-header button i');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            button.style.transform = 'rotate(0deg)';
        } else {
            content.style.display = 'none';
            button.style.transform = 'rotate(-90deg)';
        }
    }
}

// Initialize section toggles
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.workout-section');
    sections.forEach(section => {
        const header = section.querySelector('.section-header');
        if (header) {
            header.addEventListener('click', () => {
                const sectionId = section.id;
                toggleSection(sectionId);
            });
        }
    });
});

// Expose functions to window for inline onclick handlers
window.startAssessment = startAssessment;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.generateProgram = generateProgram;
window.startWorkout = startWorkout;
window.pauseWorkout = pauseWorkout;
window.handleWorkoutControl = handleWorkoutControl;
window.endWorkout = endWorkout;
window.toggleSection = toggleSection;
window.closeModal = closeModal;
window.substituteExercise = substituteExercise;
window.completeSet = completeSet;
window.viewProgress = viewProgress;
window.adjustProgram = adjustProgram;
window.viewHistory = viewHistory;
window.exerciseLibrary = openExerciseLibrary;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthMode = switchAuthMode;
window.resetPassword = resetPassword;
window.logout = logout;
window.startJourney = startJourney;
window.changePhase = changePhase;
window.closePhaseModal = closePhaseModal;
window.confirmPhaseChange = confirmPhaseChange;
window.changeAssessment = changeAssessment;
