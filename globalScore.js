// Global High Score Persistence via Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC39aZjxSaB5ybTlReSp4aw4ZqEYLLAvsc",
    authDomain: "mallard-activities.firebaseapp.com",
    databaseURL: "https://mallard-activities-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "mallard-activities",
    storageBucket: "mallard-activities.firebasestorage.app",
    messagingSenderId: "792366319195",
    appId: "1:792366319195:web:b26811df5d7ddf95bce17e",
    measurementId: "G-Z0QJ1QL6JJ"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized for Global High Scores.");
} else {
    console.warn("Firebase SDK not found. Global scores will be disabled.");
}

const db = typeof firebase !== 'undefined' ? firebase.database() : null;

async function fetchGlobalBest() {
    if (!db) return 0;
    try {
        const snapshot = await db.ref('scores/globalBest').once('value');
        const val = snapshot.val();
        // Guard against junk written to the DB (string/other) so it can't break the game
        return (typeof val === 'number' && val >= 0) ? val : 0;
    } catch (e) {
        console.error("Error fetching global best:", e);
        return 0;
    }
}

async function updateGlobalBest(newScore) {
    if (!db) return false;
    try {
        const result = await db.ref('scores/globalBest').transaction((currentValue) => {
            // Transaction with the server: no read-then-set race between players
            return (newScore > (typeof currentValue === 'number' ? currentValue : 0)) ? newScore : undefined;
        });
        if (result.committed) {
            console.log("New Global High Score submitted!", newScore);
            return true;
        }
    } catch (e) {
        console.error("Error updating global best:", e);
    }
    return false;
}

async function fetchGlobalBossKills() {
    if (!db) return 0;
    try {
        const snapshot = await db.ref('stats/bossKills').once('value');
        return snapshot.val() || 0;
    } catch (e) {
        console.error("Error fetching global boss kills:", e);
        return 0;
    }
}

async function incrementGlobalBossKills() {
    if (!db) return;
    try {
        await db.ref('stats/bossKills').transaction((currentValue) => {
            return (currentValue || 0) + 1;
        });
        console.log("Global Boss Kill incremented!");
    } catch (e) {
        console.error("Error incrementing global boss kills:", e);
    }
}

async function incrementGlobalBomberKills() {
    if (!db) return;
    try {
        await db.ref('stats/bomberKills').transaction((currentValue) => {
            return (currentValue || 0) + 1;
        });
        console.log("Global Bomber Kill incremented!");
    } catch (e) {
        console.error("Error incrementing global bomber kills:", e);
    }
}

// --- Presence Logic ---
const presenceRef = db ? db.ref('presence') : null;
const myPresenceRef = presenceRef ? presenceRef.push() : null;

// Notification variations
const deathMessages = [
    "The forces of good weaken!",
    "A hunter has fallen!",
    "The light flickers...",
    "A soul returns to the source.",
    "The balance shifts toward chaos!"
];

const entryMessages = [
    "A new hope rises!",
    "A hunter joins the fray!",
    "The light grows stronger...",
    "Another soul answers the call!",
    "Reinforcements have arrived!"
];

const sunBossMessages = [
    "PDF 0xA1: High-value target neutralized.",
    "Encrypted PDF: Boss termination confirmed.",
    "PDF Log: Biological signature lost.",
    "Checksum valid: Boss PDF 0x99.",
    "PDF Leak: The crown has fallen.",
    "Data Packet: PDF 0x00 - God-slayer detected."
];

if (presenceRef) {
    presenceRef.on('child_added', (snapshot) => {
        // Skip our own entry notification to avoid local noise
        if (myPresenceRef && snapshot.key === myPresenceRef.key) return;
        
        // Only notify for actual join events after initial load (optional, but cleaner)
        // For simplicity here, we'll just trigger it.
        window.presenceNotification = {
            text: entryMessages[Math.floor(Math.random() * entryMessages.length)],
            timer: 4.0
        };
    });

    presenceRef.on('child_removed', (snapshot) => {
        // Don't notify if it's our own removal (optional, but cleaner for other players)
        if (myPresenceRef && snapshot.key === myPresenceRef.key) return;
        
        window.presenceNotification = {
            text: deathMessages[Math.floor(Math.random() * deathMessages.length)],
            timer: 4.0 // Display for 4 seconds
        };
    });

    // Listen for global boss kills for Sun notifications
    db.ref('stats/bossKills').on('value', (snapshot) => {
        const kills = snapshot.val() || 0;
        
        // Only notify if it's a real increment (not initial load 0)
        // AND not the player who just made the kill (local suppresses sunNotification)
        if (window.lastGlobalSunBossKills !== undefined && kills > window.lastGlobalSunBossKills) {
            if (window.localBossKillHandled) {
                console.log("Suppressed sun notification for local boss kill.");
                window.localBossKillHandled = false; // Reset for next kill
            } else {
                window.sunNotification = {
                    text: sunBossMessages[Math.floor(Math.random() * sunBossMessages.length)],
                    timer: 5.0
                };
            }
        }
        window.lastGlobalSunBossKills = kills;
        window.globalBossKills = kills; // Sync global display
    });

    // Silent listener for global bomber kills to keep the UI counter (PDFs) accurate
    db.ref('stats/bomberKills').on('value', (snapshot) => {
        window.globalBomberKills = snapshot.val() || 0;
    });
}

async function setPlayerPresence(characterId) {
    if (!myPresenceRef) return;
    
    // characterId is 1: Stalker, 2: Ascetic, 3: Arbitrator
    await myPresenceRef.set({
        characterId: characterId,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Remove presence when user disconnects or leaves
    myPresenceRef.onDisconnect().remove();
}

async function fetchActivePresences() {
    if (!presenceRef) return [];
    try {
        const snapshot = await presenceRef.once('value');
        const data = snapshot.val() || {};
        return Object.entries(data).map(([key, val]) => ({...val, id: key}));
    } catch (e) {
        console.error("Error fetching presences:", e);
        return [];
    }
}

async function removePlayerPresence() {
    if (myPresenceRef) {
        await myPresenceRef.remove();
    }
}

// Global variables for game display
window.globalHighScore = 0;
window.globalBossKills = 0;
window.activePresences = [];

// Auto-fetch scores on load
fetchGlobalBest().then(score => window.globalHighScore = score);
fetchGlobalBossKills().then(kills => window.globalBossKills = kills);

// Periodic fetch for active presences
setInterval(async () => {
    window.activePresences = await fetchActivePresences();
}, 5000);

// Initial fetch
fetchActivePresences().then(p => window.activePresences = p);
