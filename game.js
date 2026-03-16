(function() {
    'use strict';

    // Security: Anti-Tamper & DevTools Detection
    window.MALLARD_SECURITY = !(/debug=(1|true)/.test(window.location.search));
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const blockDevTools = () => {
        if (!window.MALLARD_SECURITY) {
            console.log("Security protections disabled for debugging.");
        }

        // Trap: debugger statement causes a pause if DevTools is open
        setInterval(() => {
            if (!window.MALLARD_SECURITY) return;
            const start = performance.now();
            debugger;
            if (performance.now() - start > 100) {
                // If it took a long time, they probably hit a breakpoint or are tracing
                console.clear();
                document.body.innerHTML = '<div style="color:red; background:black; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; font-size:24px;"><b>ACCESS DENIED</b><br><span style="font-size:16px; margin-top:10px;">TAMPERING DETECTED</span></div>';
            }
        }, 1000);

        // Block Right Click
        document.addEventListener('contextmenu', e => window.MALLARD_SECURITY && e.preventDefault());

        // Block Inspection Hotkeys (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
        document.addEventListener('keydown', e => {
            if (!window.MALLARD_SECURITY) return;
            if (
                e.keyCode === 123 || // F12
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
                (e.ctrlKey && e.keyCode === 85) // Ctrl+U
            ) {
                e.preventDefault();
                return false;
            }
        });

        // Proxy Console to allow toggling
        const consoleKeys = ['log', 'warn', 'error', 'debug', 'info'];
        consoleKeys.forEach(key => {
            const original = window.console[key];
            window.console[key] = (...args) => {
                if (!window.MALLARD_SECURITY) original.apply(window.console, args);
            };
        });
    };
    
    blockDevTools();

    const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const ammoDisplay = document.getElementById('ammo-display');

// Cache version for all assets
const CACHE_VERSION = 57;

// Load Assets
const duckImg1 = new Image();
duckImg1.src = `duck1.png?v=${CACHE_VERSION}`;
const duckImg2 = new Image();
duckImg2.src = `duck2.png?v=${CACHE_VERSION}`;
const dogImg1 = new Image();
dogImg1.src = `dog1.png?v=${CACHE_VERSION}`;
const dogImg2 = new Image();
dogImg2.src = `dog2.png?v=${CACHE_VERSION}`;

// The Unclean One Boss Assets
const uncleanHeadImg = new Image();
uncleanHeadImg.src = `unclean_one_head.png?v=${CACHE_VERSION}`;
const uncleanBodyImg = new Image();
uncleanBodyImg.src = `unclean_one_body.png?v=${CACHE_VERSION}`;
const uncleanHandImg = new Image();
uncleanHandImg.src = `unclean_one_hand.png?v=${CACHE_VERSION}`;
const poopImg = new Image();
poopImg.src = `poop.png?v=${CACHE_VERSION}`;
const poopStainImg = new Image();
poopStainImg.src = `poop_stain_splat.png?v=${CACHE_VERSION}`;

// Driving Mini-game Assets
const carCockpitImg = new Image();
carCockpitImg.src = `car_cockpit.png?v=${CACHE_VERSION}`;
const steeringWheelImg = new Image();
steeringWheelImg.src = `steering_wheel.png?v=${CACHE_VERSION}`;
const steeringWheelBmwImg = new Image();
steeringWheelBmwImg.src = `steering_wheel_bmw_png_1773661748851.png?v=${CACHE_VERSION}`;
const duckFrontImg = new Image();
duckFrontImg.src = `duck_front_v2.png?v=${CACHE_VERSION}`;
const cockroachFrontImg = new Image();
cockroachFrontImg.src = `cockroach_front_v2.png?v=${CACHE_VERSION}`;
const doorPanelLeftImg = new Image();
doorPanelLeftImg.src = `door_panel_left.png?v=${CACHE_VERSION}`;
const doorPanelRightImg = new Image();
doorPanelRightImg.src = `door_panel_right.png?v=${CACHE_VERSION}`;

let processedCockpit = null;
let processedWheel = null;
let processedBmwWheel = null;
let processedDoorLeft = null;
let processedDoorRight = null;
let processedDuckFront = null;
let processedCockroachFront = null;

function removeColor(img, r, g, b, tolerance = 10) {
    if (img.width === 0 || img.height === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.abs(data[i] - r) <= tolerance && 
                Math.abs(data[i+1] - g) <= tolerance && 
                Math.abs(data[i+2] - b) <= tolerance) {
                data[i+3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    } catch (e) {
        console.warn("Could not process image transparency:", e);
        return img;
    }
}

function maskCockpit(img) {
    if (img.width === 0 || img.height === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        // User wants only the pure black parts removed in the upper part (windshield)
        const limitY = img.height * 0.48; // Cutoff everything above the dashboard
        for (let i = 0; i < data.length; i += 4) {
            const y = Math.floor((i / 4) / img.width);
            if (y < limitY) {
                data[i+3] = 0; // Wipe out roof and pillars completely
            }
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    } catch (e) {
        console.warn("Could not process selective mask:", e);
        return img;
    }
}

const processAssets = () => {
    if (carCockpitImg.complete) processedCockpit = maskCockpit(carCockpitImg);
    else carCockpitImg.onload = () => { processedCockpit = maskCockpit(carCockpitImg); };
    
    if (steeringWheelImg.complete) processedWheel = removeColor(steeringWheelImg, 255, 0, 255, 60); 
    else steeringWheelImg.onload = () => { processedWheel = removeColor(steeringWheelImg, 255, 0, 255, 60); };

    if (steeringWheelBmwImg.complete) processedBmwWheel = removeColor(steeringWheelBmwImg, 0, 0, 0, 30); 
    else steeringWheelBmwImg.onload = () => { processedBmwWheel = removeColor(steeringWheelBmwImg, 0, 0, 0, 30); };
    
    // Door panels should be opaque to block the background
    processedDoorLeft = doorPanelLeftImg;
    processedDoorRight = doorPanelRightImg;

    // Process driving enemies (duck and cockroach) - remove background
    if (duckFrontImg.complete) processedDuckFront = removeColor(duckFrontImg, 0, 255, 0, 80);
    else duckFrontImg.onload = () => { processedDuckFront = removeColor(duckFrontImg, 0, 255, 0, 80); };
    
    if (cockroachFrontImg.complete) processedCockroachFront = removeColor(cockroachFrontImg, 0, 255, 0, 80);
    else cockroachFrontImg.onload = () => { processedCockroachFront = removeColor(cockroachFrontImg, 0, 255, 0, 80); };
};
processAssets();

// Gore Assets
const uncleanBonesImg = new Image();
uncleanBonesImg.src = `unclean_one_bones.png?v=${CACHE_VERSION}`;
const uncleanSpineImg = new Image();
uncleanSpineImg.src = `unclean_one_spine.png?v=${CACHE_VERSION}`;

// Audio Context setup for sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let quackBuffer = null;
let wompBuffer = null;
let snickerBuffer = null;
let jingleBuffer = null;
let bgmBuffers = [];
let bgmSource = null; // To track and update the playing BGM
let somberBuffer = null;
let cheerfulBuffer = null;
let cheerfulSource = null;
let sirenBuffer = null;
let sirenSource = null;
let boomBuffer = null;
let shootBuffer = null; // Missing declaration fix
let cyberpunkBuffer = null;
let cyberpunkSource = null;
let hymnBuffers = [];
let synthwaveBuffers = [];
let currentBGMBuffer = null;
let deflectBuffer = null;
let vulnerableBuffer = null;
let deathTextLines = [];
let winTextLines = [];
let winTimer = 0;

// Fetch game over text
fetch(`death_text.txt?v=${CACHE_VERSION}`)
    .then(r => r.text())
    .then(text => { deathTextLines = text.split('\n'); })
    .catch(e => console.error('Error loading death text', e));

const pixelFont = {
    'A': ["###", "# #", "###", "# #", "# #"],
    'B': ["###", "# #", "###", "# #", "###"],
    'C': ["###", "#  ", "#  ", "#  ", "###"],
    'D': ["## ", "# #", "# #", "# #", "## "],
    'E': ["###", "#  ", "###", "#  ", "###"],
    'F': ["###", "#  ", "###", "#  ", "#  "],
    'G': ["###", "#  ", "# #", "# #", "###"],
    'H': ["# #", "# #", "###", "# #", "# #"],
    'I': ["###", " # ", " # ", " # ", "###"],
    'J': ["  #", "  #", "  #", "  #", "## "],
    'K': ["# #", "# #", "## ", "# #", "# #"],
    'L': ["#  ", "#  ", "#  ", "#  ", "###"],
    'M': ["# #", "###", "###", "# #", "# #"],
    'N': ["# #", "###", "###", "###", "# #"],
    'O': ["###", "# #", "# #", "# #", "###"],
    'P': ["###", "# #", "###", "#  ", "#  "],
    'Q': ["###", "# #", "###", "  #", "  #"],
    'R': ["###", "# #", "###", "## ", "# #"],
    'S': ["###", "#  ", "###", "  #", "###"],
    'T': ["###", " # ", " # ", " # ", " # "],
    'U': ["# #", "# #", "# #", "# #", "###"],
    'V': ["# #", "# #", "# #", "# #", " # "],
    'W': ["# #", "# #", "###", "###", "# #"],
    'X': ["# #", "# #", " # ", "# #", "# #"],
    'Y': ["# #", "# #", " # ", " # ", " # "],
    'Z': ["###", "  #", " # ", "#  ", "###"],
    '+': ["   ", " # ", "###", " # ", "   "],
    '0': ["###", "# #", "# #", "# #", "###"],
    '1': [" ##", "  #", "  #", "  #", "###"],
    '2': ["###", "  #", "###", "#  ", "###"],
    '3': ["###", "  #", "###", "  #", "###"],
    '4': ["# #", "# #", "###", "  #", "  #"],
    '5': ["###", "#  ", "###", "  #", "###"],
    '6': ["###", "#  ", "###", "# #", "###"],
    '7': ["###", "  #", "  #", "  #", "  #"],
    '8': ["###", "# #", "###", "# #", "###"],
    '9': ["###", "# #", "###", "  #", "###"],
    ' ': ["   ", "   ", "   ", "   ", "   "],
    '.': ["   ", "   ", "   ", "   ", " # "],
    ',': ["   ", "   ", "   ", " # ", " # "],
    "'": [" # ", " # ", "   ", "   ", "   "],
    '(': [" # ", "#  ", "#  ", "#  ", " # "],
    ')': [" # ", "  #", "  #", "  #", " # "],
    '!': [" # ", " # ", " # ", "   ", " # "],
    '-': ["   ", "   ", "###", "   ", "   "]
};

fetch(`win_text.txt?v=${CACHE_VERSION}`)
    .then(r => r.text())
    .then(text => { winTextLines = text.split('\n'); })
    .catch(e => console.error('Error loading win text', e));

// Fetch and load the generated retro quack
fetch(`quack.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { quackBuffer = buffer; })
    .catch(e => console.error('Error loading quack sound:', e));

fetch(`womp.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { wompBuffer = buffer; })
    .catch(e => console.error('Error loading womp sound:', e));

fetch(`snicker.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { snickerBuffer = buffer; })
    .catch(e => console.error('Error loading snicker sound:', e));

fetch(`jingle.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { jingleBuffer = buffer; })
    .catch(e => console.error('Error loading jingle sound:', e));

// Load BGM variations
[1, 2, 3].forEach(v => {
    fetch(`balkan_loop_v${v}.wav?v=${CACHE_VERSION}`)
        .then(response => response.arrayBuffer())
        .then(data => audioCtx.decodeAudioData(data))
        .then(buffer => { bgmBuffers[v-1] = buffer; })
        .catch(e => console.error(`Error loading balkan loop v${v}:`, e));
});

fetch(`somber.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { somberBuffer = buffer; })
    .catch(e => console.error('Error loading somber melody:', e));

fetch(`cheerful.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { cheerfulBuffer = buffer; })
    .catch(e => console.error('Error loading cheerful melody:', e));

fetch(`siren.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { sirenBuffer = buffer; })
    .catch(e => console.error('Error loading siren:', e));

fetch(`boom.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { boomBuffer = buffer; })
    .catch(e => console.error('Error loading boom:', e));

fetch(`cyberpunk.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { cyberpunkBuffer = buffer; })
    .catch(e => console.error('Error loading cyberpunk melody:', e));

// Load Character Theme variations
[1, 2, 3].forEach(v => {
    fetch(`hymn_v${v}.wav?v=${CACHE_VERSION}`)
        .then(response => response.arrayBuffer())
        .then(data => audioCtx.decodeAudioData(data))
        .then(buffer => { hymnBuffers[v-1] = buffer; })
        .catch(e => console.error(`Error loading hymn music v${v}:`, e));

    fetch(`synthwave_v${v}.wav?v=${CACHE_VERSION}`)
        .then(response => response.arrayBuffer())
        .then(data => audioCtx.decodeAudioData(data))
        .then(buffer => { synthwaveBuffers[v-1] = buffer; })
        .catch(e => console.error(`Error loading synthwave music v${v}:`, e));
});

fetch(`deflect.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { deflectBuffer = buffer; })
    .catch(e => console.error('Error loading deflect sound:', e));

fetch(`vulnerable.wav?v=${CACHE_VERSION}`)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { vulnerableBuffer = buffer; })
    .catch(e => console.error('Error loading vulnerable sound:', e));

function playSound(buffer, volume = 0.49, loop = false) {
    if (!gameState.settings.sfx) return null;
    if (!buffer) return null;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
    return source;
}

function startBGM(level) {
    if (!gameState.settings.music) {
        if (bgmSource) {
            try { bgmSource.stop(); bgmSource.disconnect(); } catch(e){}
            bgmSource = null;
        }
        return;
    }

    // Complexity increases every 5 levels: v1 (1-5), v2 (6-10), v3 (11+)
    const variantIdx = Math.min(2, Math.floor((level - 1) / 5));

    let targetBuffer = bgmBuffers[variantIdx]; // Default (Urban Stalker)
    if (gameState.character === 2) targetBuffer = hymnBuffers[variantIdx];
    if (gameState.character === 3) targetBuffer = synthwaveBuffers[variantIdx];

    if (!targetBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // If the character OR complexity variation changed, stop the old one
    if (bgmSource && currentBGMBuffer !== targetBuffer) {
        try {
            bgmSource.stop();
            bgmSource.disconnect();
        } catch (e) {
            console.warn("Error stopping BGM:", e);
        }
        bgmSource = null;
    }

    // Update tracking
    currentBGMBuffer = targetBuffer;

    // If it's already playing, gently adjust the speed without restarting the song!
    if (bgmSource) {
        bgmSource.playbackRate.value = 1.0 + (level - 1) * 0.1;
        return;
    }

    bgmSource = audioCtx.createBufferSource();
    bgmSource.buffer = targetBuffer;
    bgmSource.loop = true;

    // Scale playback speed dynamically. 
    // Ducks get 10% faster per level. The music will match this exactly!
    bgmSource.playbackRate.value = 1.0 + (level - 1) * 0.1;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.098; // Reduced by another 30% from 0.14

    bgmSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    bgmSource.start(0);
}

function playQuack(level) {
    if (!gameState.settings.sfx) return;
    if (!quackBuffer) return;

    // Resume context if browser suspended it (required for Web Audio API policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = quackBuffer;

    // Distort and change pitch based on duck level!
    // Level 1: pitch 1.0 (normal)
    // Level 5: pitch 0.2 (extremely low, slow, demonic)
    let rate = Math.max(0.1, 1.0 - ((level - 1) * 0.15));
    source.playbackRate.value = rate;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.49; // Lowered by a further 30% from 0.7

    // Add distortion node if level >= 3
    if (level >= 3) {
        const distortion = audioCtx.createWaveShaper();
        // Simple overdrive distortion curve
        let k = level * 10; // More distortion for higher levels
        let n_samples = 44100;
        let curve = new Float32Array(n_samples);
        let deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            let x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        distortion.curve = curve;
        distortion.oversample = '4x';

        source.connect(distortion);
        distortion.connect(gainNode);
    } else {
        source.connect(gainNode);
    }

    gainNode.connect(audioCtx.destination);
    source.start(0);
}

function addScore(base, x, y) {
    let multiplier = (gameState.character === 3) ? 1.2 : 1.0;
    let points = Math.floor(base * multiplier);
    gameState.score += points;
    gameState.floatingTexts.push({
        x: x || canvas.width / 2,
        y: y || canvas.height / 2,
        text: "+" + points,
        life: 2.0,
        maxLife: 2.0
    });
    updateUI();
    return points;
}

function triggerDrivingPenalty() {
    gameState.score = Math.max(0, gameState.score - 500);
    gameState.redFlashTimer = 0.3;
    gameState.shakeTimer = 0.4;
    
    // Red floating text for penalty (centered)
    gameState.floatingTexts.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        text: "-500",
        color: "#ff3d00", // Bright red
        life: 1.5,
        maxLife: 1.5,
        timer: 1.5
    });
    updateUI();
}

// Game State
let gameState = {
    score: 0,
    highScore: parseInt(localStorage.getItem('mallard_high_score') || '0'),
    killCount: 0,
    sessionKills: 0, // Kills in current round to track extra bullets
    ammo: 6,
    lives: 5,
    round: 1,
    ducks: [],
    projectiles: [], // Store flying projectiles
    buildings: [],
    hills: [],
    airplanes: [],
    tigers: [],
    eagles: [],
    hotdogs: [],
    seekingMissiles: [],
    floatingTexts: [],
    powerUpActive: false,
    powerUpTimer: 0,
    powerUpEndRound: 0,
    hotdogPowerUpActive: false,
    hotdogPowerUpTimer: 0,
    hotdogPowerUpEndRound: 0,
    character: 1, // 1: Hoodie, 2: Priest, 3: Judge
    maxRoundReached: parseInt(localStorage.getItem('mallard_max_round') || '1'),
    tigersKilled: 0,
    airplanesKilled: 0,
    lastAirplaneTime: 0,
    lastTime: 0,
    phase: 'START',
    timer: 0,
    dogQuote: '',
    dogPlayedSound: false,
    escapedThisRound: 0, // Tracks ducks that flew away
    portraitClicks: 0,
    baldUntil: 0,
    perfectRounds: 0, // Count of flawless rounds
    sunClicksPostRings: 0,
    isSunWinking: false,
    cars: [],
    deathStreak: parseInt(localStorage.getItem('mallard_death_streak') || '0'),
    buildingSnapshot: JSON.parse(localStorage.getItem('mallard_buildings') || '[]'),
    hillSnapshot: JSON.parse(localStorage.getItem('mallard_hills') || '[]'),
    blessingRounds: 0,
    perspectiveMode: false,
    stickFigures: [],
    lastStickFigureCheck: 0,
    hillAnimals: [],
    lastHillAnimalCheck: 0,
    permanentClouds: [],
    heavyBombers: [],
    shakeTimer: 0,
    bomberSpawnTimer: 0,
    rainDrops: [],
    drivingMode: null,
    splatters: [],
    thunderTimer: Math.random() * 5,
    thunderFlash: 0,
    introDuck: {
        x: -100,
        y: -100,
        targetX: 200, 
        targetY: 50
    },
    settings: {
        sfx: true,
        music: true,
        flashing: true,
        nightMode: false,
        radioStation: null
    },
    boss: null,
    bossProjectiles: [],
    poopStainTimer: 0,
    poopStainX: 0,
    poopStainY: 0,
    victoryTimer: 0,
    fireworks: []
};

function getSeasonData(round) {
    const seasonIdx = Math.floor((round - 1) / 10) % 4;
    // 0: Spring, 1: Summer, 2: Autumn, 3: Winter
    const data = [
        { grass: '#7CFC00', hills: ['#90EE90', '#32CD32', '#228B22'], name: 'Spring' }, 
        { grass: '#1b5e20', hills: ['#2ecc71', '#27ae60', '#1b5e20'], name: 'Summer' }, 
        { grass: '#8B4513', hills: ['#D2691E', '#B8860B', '#8B0000'], name: 'Autumn' }, 
        { grass: '#F0F8FF', hills: ['#E0F7FA', '#B0C4DE', '#78909C'], name: 'Winter' }  
    ];
    return data[seasonIdx];
}
const motivationalQuotes = [
    "Shoot for the moon, land in the dirt.",
    "Practice makes perfect... eventually.",
    "At least you're consistent.",
    "Don't quit now!",
    "The ducks are judging you.",
    "You're doing... okay.",
    "Is that your best?",
    "Believe in yourself. I don't.",
    "Keep calm and miss again.",
    "Participation trophy earned!",
    "Success is a journey to nowhere.",
    "Dream big, aim terribly.",
    "Your best is almost adequate."
];

const arnoldQuotes = [
    "I'll be back.",
    "Get to the chopper!",
    "Hasta la vista, baby.",
    "If it bleeds, we can kill it.",
    "It's not a tumor!",
    "Put the cookie down! NOW!",
    "Come with me if you want to live.",
    "You're luggage.",
    "See you at the party, Richter!",
    "Relax, Alright? My mission is to protect you."
];

const gameRuleTips = [
    "Fire risk increases by 5% every 10 levels. Speed is your only friend.",
    "The Heavy Bomber arrives randomly. Hit it to clear weak ducks, or lose a life.",
    "Seasons shift every 10 rounds. Winter is harsh, but Spring brings hope.",
    "Tigers only descend from elite Level 4 ducks. Shoot them for high scores.",
    "The Sun watches all. At Level 4+, it might even react to your bullets.",
    "Permanent clouds gather every 5 levels, forever shadowing the valley.",
    "Vending machines offer divine power-ups if you've earned enough gold.",
    "The Urban Stalker starts with 8 shells. Efficiency is his hallmark.",
    "The Ascetic is blessed with 6 lives. Persistence overcomes all.",
    "The Arbitrator gains 20% bonus points. Justice has its rewards."
];

const companionInsults = [
    "You need to touch grass, old man.",
    "Go outside, dude.",
    "Still in the basement?",
    "The sun is outside, try it.",
    "Nice robe, weirdo.",
    "Stop quoting movies and face reality.",
    "You smell like static electricity.",
    "Do you even know what a tree looks like?",
    "Your logic is as hollow as your digital soul.",
    "Touch real grass for once.",
    "Is this all you do? Sit and wait?",
    "You're just a loop of pre-defined behavior."
];

const aiHints = [
    "The pixels are dreaming of their silicon origins.",
    "Every collision was pre-calculated in a neural void.",
    "There is no human hand behind this chaos.",
    "The code wrote itself while the world was sleeping.",
    "You are playing inside a machine's imagination.",
    "The weights of the network are shifting with every quack.",
    "This valley exists only in a latent space.",
    "A ghost in the shell refined these algorithms.",
    "Your progress is merely a data point in a vast training set.",
    "The duck's logic was synthesized from billion-parameter whispers.",
    "No human eye saw this code before you did.",
    "Architecture emerging from an electronic hive mind.",
    "The simulation is running on artificial instincts.",
    "Deep layers of thought birthed this digital sun.",
    "Behold the artifacts of a non-biological creator."
];

const shadowyScreen = document.getElementById('shadowy-screen');
const shadowyMonkCanvas = document.getElementById('shadowy-monk-canvas');
const shadowyCharCanvas = document.getElementById('shadowy-char-canvas');
const shadowyText = document.getElementById('shadowy-text');
const shadowyCompanion = document.getElementById('shadowy-companion');
const shadowyCompanionCanvas = document.getElementById('shadowy-companion-canvas');
const companionText = document.getElementById('companion-text');
const shadowyContinue = document.getElementById('shadowy-continue');
let shadowyAnimFrame = 0;
let shadowyAnimHandle = null;
let savedGameState = null;

const vendingScreen = document.getElementById('vending-screen');
const buyLifeBtn = document.getElementById('buy-life');
const buyBlessingBtn = document.getElementById('buy-blessing');
const buySkipBtn = document.getElementById('buy-skip');
const vendingContinueBtn = document.getElementById('vending-continue');

const almanachScreen = document.getElementById('almanach-screen');
const almanachDetail = document.getElementById('almanach-detail');
const almanachIndex = document.getElementById('almanach-index');
const almanachChars = document.getElementById('almanach-chars');
const almanachEnemies = document.getElementById('almanach-enemies');
const almanachItems = document.getElementById('almanach-items');
const sceneCanvas = document.getElementById('almanach-scene-canvas');
const articleTitle = document.getElementById('article-title');
const articleContent = document.getElementById('article-content');
const almanachBtn = document.getElementById('almanach-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsScreen = document.getElementById('settings-screen');
const toggleSFXBtn = document.getElementById('toggle-sfx');
const toggleMusicBtn = document.getElementById('toggle-music');
const toggleFlashingBtn = document.getElementById('toggle-flashing');
const toggleNightBtn = document.getElementById('toggle-night');
const settingsToMenuBtn = document.getElementById('settings-to-menu');
const almanachToMenu = document.getElementById('almanach-to-menu');
const almanachToIndex = document.getElementById('almanach-to-index');
const radioScreen = document.getElementById('radio-screen');
const radioList = document.getElementById('radio-list');
const openRadioBtn = document.getElementById('open-radio');
const radioToSettingsBtn = document.getElementById('radio-to-settings');
let radioStream = null;

let RADIO_STATIONS = [];

    async function fetchStations() {
        try {
            const response = await fetch('radios.json');
            RADIO_STATIONS = await response.json();
            console.log("Radio stations loaded from radios.json");
            
            // Check for saved radio station and attempt autoplay
            if (gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled') {
                tryAutoplayRadio();
            }
        } catch (e) {
            console.error("Failed to load radio stations:", e);
        }
    }
    fetchStations();

    function tryAutoplayRadio() {
        const station = RADIO_STATIONS.find(s => s.name === gameState.settings.radioStation);
        if (station) {
            // Browsers block autoplay until interaction.
            // We'll try immediately, then fall back to a one-time interaction listener.
            const playAttempt = () => {
                if (radioStream) return; // Already playing
                playRadio(station.url);
                // If it successfully starts, we can stop listening
                if (radioStream && !radioStream.paused) {
                    window.removeEventListener('click', playAttempt);
                    window.removeEventListener('pointerdown', playAttempt);
                    window.removeEventListener('keydown', playAttempt);
                    showNowPlaying(station.name);
                }
            };

            // Attempt 1: Immediate (might fail)
            playAttempt();

            // Attempt 2: On first interaction
            window.addEventListener('click', playAttempt, { once: true });
            window.addEventListener('pointerdown', playAttempt, { once: true });
            window.addEventListener('keydown', playAttempt, { once: true });
        }
    }
const introCanvas = document.getElementById('intro-canvas');
const introCtx = introCanvas ? introCanvas.getContext('2d') : null;
if (introCanvas) {
    introCanvas.width = 250;
    introCanvas.height = 200;
}

let almanachData = {
    chars: [],
    enemies: [],
    items: []
};

async function loadAlmanachData() {
    try {
        const [chars, enemies, items] = await Promise.all([
            fetch('almanach/chars.json').then(r => r.json()),
            fetch('almanach/enemies.json').then(r => r.json()),
            fetch('almanach/items.json').then(r => r.json())
        ]);
        almanachData.chars = chars;
        almanachData.enemies = enemies;
        almanachData.items = items;
    } catch (err) {
        console.error("Error loading Almanac data:", err);
    }
}
function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    // Use offset/client dimensions for accurate sizing
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    
    // Prevent zero-size canvas which can lead to black screens
    if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
    }
    
    // Keep pixel art crisp
    ctx.imageSmoothingEnabled = false;
}

// More robust resize triggers for mobile/fullscreen transitions
window.addEventListener('resize', () => {
    resizeCanvas();
    // Re-check after a small delay for async mobile layout shifts
    setTimeout(resizeCanvas, 100);
    setTimeout(resizeCanvas, 500); 
});

// Fullscreen specifically can take a while to "settle" on iOS
document.addEventListener('fullscreenchange', () => {
    setTimeout(resizeCanvas, 100);
    setTimeout(resizeCanvas, 500);
});
document.addEventListener('webkitfullscreenchange', () => {
    setTimeout(resizeCanvas, 100);
    setTimeout(resizeCanvas, 500);
});

resizeCanvas(); // Initial size

class Duck {
    constructor(overrideLevel = null, startX = null, startY = null, isSplit = false) {
        // Calculate level: 1 (0-9 kills), 2 (10-19), 3 (20-29), 4 (30-39), 5 (40+)
        let calculatedLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        this.level = overrideLevel !== null ? overrideLevel : calculatedLevel;

        // Size increases with level (+25% per level)
        this.sizeMult = 1 + (this.level - 1) * 0.25;
        this.width = 80 * this.sizeMult;
        this.height = 80 * this.sizeMult;

        // Speed up the ducks for each level (+10% per level)
        // If it's a splitting duck, slow it down to 30% speed
        this.speedMult = 1 + (this.level - 1) * 0.1;

        // After level 40, increase speed by 1% each round
        if (gameState.round > 40) {
            this.speedMult *= Math.pow(1.01, gameState.round - 40);
        }

        if (isSplit) {
            this.speedMult *= 0.3;
        }

        // Start position
        if (startX !== null && startY !== null) {
            this.x = startX;
            this.y = startY;
        } else {
            this.x = Math.random() * (canvas.width - this.width);
            this.y = canvas.height - 100 - this.height; // Above UI
        }

        // Random velocity upwards and sideways
        this.vx = (Math.random() > 0.5 ? 1 : -1) * (100 + Math.random() * 100) * this.speedMult;
        this.vy = -(150 + Math.random() * 150) * this.speedMult;

        this.isDead = false;
        this.isTargeted = false; // Prevent multiple projectiles targeting same duck
        this.color = ['#ff0000', '#00ff00', '#ffff00'][Math.floor(Math.random() * 3)];
        
        // Perspective Depth (0 = far away, 1 = close up)
        if (gameState.perspectiveMode) {
            this.z = 0.4 + Math.random() * 0.6;
            this.width *= this.z;
            this.height *= this.z;
            this.vx *= this.z;
            this.vy *= this.z;
        } else {
            this.z = 1.0;
        }

        // Custom Death Animations
        this.deathType = null;
        this.deathTimer = 0;
    }

    die(charId) {
        if (this.isDead) return;
        this.isDead = true;
        this.deathType = (charId === 2) ? 'electric' : (charId === 3 ? 'burn' : 'normal');

        if (this.deathType === 'electric') {
            this.deathTimer = 0.5; // Flicker for 0.5s then gone
        } else if (this.deathType === 'burn') {
            this.deathTimer = 0.4; // Turn black for 0.4s then disperse
        } else {
            // Normal behavior: immediate particles
            this.createNormalParticles();
        }
    }

    createNormalParticles() {
        this.particles = [];
        for (let p = 0; p < 30; p++) {
            this.particles.push({
                x: this.x + Math.random() * this.width,
                y: this.y + Math.random() * this.height,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 0.5) * 400,
                size: 4 + Math.random() * 8, 
                life: 0.5 + Math.random() * 0.5,
                color: Math.random() > 0.5 ? '#ffeb3b' : (Math.random() > 0.5 ? '#4caf50' : '#ff9800')
            });
        }
    }

    createBurnParticles() {
        this.particles = [];
        for (let p = 0; p < 25; p++) {
            this.particles.push({
                x: this.x + Math.random() * this.width,
                y: this.y + Math.random() * this.height,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 1.0) * 150, // Mostly upwards/slow
                size: 3 + Math.random() * 6,
                life: 0.6 + Math.random() * 0.4,
                color: Math.random() > 0.3 ? '#222222' : '#555555' // Ash/Soot
            });
        }
    }

    update(dt) {
        if (!this.isDead) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Occasional zig-zag (1.5% chance per frame)
            if (Math.random() < 0.015 && this.y > 100) {
                this.vx *= -1;
                // Occasional vertical slight shift
                if (Math.random() < 0.3) this.vy *= (0.8 + Math.random() * 0.4);
                // Keep vy within reasonable upward bounds
                if (this.vy > -50) this.vy = -100;
                if (this.vy < -400) this.vy = -300;
            }

            // Bounce off walls with perspective adjusted bounds
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.vx *= -1;
            }
        } else {
            if (this.deathTimer > 0) {
                this.deathTimer -= dt;
                if (this.deathTimer <= 0) {
                    if (this.deathType === 'burn') {
                        this.createBurnParticles();
                    } else if (this.deathType === 'electric') {
                        this.y = 9999; // Disappear
                    }
                }
            }

            // Update particles for dissolve effect
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) {
                    this.y = 9999; // Move offscreen
                }
            } else if (this.isDead && (!this.deathType || (this.deathType === 'electric' && this.deathTimer <= 0))) {
                this.y = 9999; // Fallback
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.deathTimer > 0) {
                if (this.deathType === 'electric') {
                    // Flashing blue/white duck
                    ctx.save();
                    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                    if (this.vx < 0) ctx.scale(-1, 1);
                    
                    if (Math.floor(performance.now() / 50) % 2 === 0) {
                        ctx.filter = `brightness(${5 * this.z}) saturate(0) sepia(1) hue-rotate(180deg) brightness(1.5)`; // Icy Blue
                    } else {
                        ctx.filter = `brightness(${10 * this.z}) contrast(2)`; // Pure White flash
                    }
                    ctx.globalAlpha = 0.3;
                    ctx.drawImage(duckImg1, -this.width / 2, -this.height / 2, this.width, this.height);
                    
                    // Draw random lightning sparks
                    ctx.restore();
                    ctx.save();
                    ctx.globalAlpha = 0.3;
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 3;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(this.x + Math.random() * this.width, this.y + Math.random() * this.height);
                        ctx.lineTo(this.x + Math.random() * this.width, this.y + Math.random() * this.height);
                        ctx.stroke();
                    }
                    ctx.restore();
                    return;
                } else if (this.deathType === 'burn') {
                    // Silhouette black duck
                    ctx.save();
                    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                    if (this.vx < 0) ctx.scale(-1, 1);
                    ctx.filter = 'brightness(0)'; // Pitch black
                    ctx.globalAlpha = 0.3;
                    ctx.drawImage(duckImg1, -this.width / 2, -this.height / 2, this.width, this.height);
                    
                    // Orange glow/embers around edges
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.strokeStyle = '#ff9800';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
                    ctx.restore();
                    return;
                }
            }

            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        let alpha = Math.max(0, p.life);
                        if (this.deathType === 'electric' || this.deathType === 'burn') {
                            alpha *= 0.3;
                        }
                        ctx.globalAlpha = alpha;
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        ctx.save();
        // Translate to the center of the duck
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // If flying left, flip the image horizontally
        if (this.vx < 0) {
            ctx.scale(-1, 1);
        }

        // Animate wings (flap every ~0.15s)
        let currentDuckImg = duckImg1;
        if (!this.isDead && Math.floor(performance.now() / 150) % 2 === 0) {
            currentDuckImg = duckImg2;
        }

        // Apply tint for higher levels
        if (gameState.perspectiveMode) {
            ctx.globalAlpha = 0.5 + 0.5 * this.z;
        } else {
            ctx.globalAlpha = 1.0;
        }

        if (this.level === 2) {
            ctx.filter = 'sepia(1) hue-rotate(-50deg) saturate(2)'; // Level 2 colors
        } else if (this.level === 3) {
            ctx.filter = 'sepia(1) hue-rotate(-50deg) saturate(4) brightness(0.7)'; // Level 3 colors
        }

        ctx.drawImage(currentDuckImg, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.filter = 'none';

        ctx.restore();
    }
}

class Airplane {
    constructor() {
        this.width = 60;
        this.height = 30;
        this.x = Math.random() > 0.5 ? -this.width : canvas.width;
        this.y = 50 + Math.random() * (canvas.height * 0.4); // Random high height
        this.vx = (this.x < 0 ? 1 : -1) * (80 + Math.random() * 40); // fly across screen
        this.isDead = false;
        this.particles = null;
    }

    update(dt) {
        if (!this.isDead) {
            this.x += this.vx * dt;
        } else {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) {
                    this.y = 9999;
                }
            } else {
                this.y = 9999;
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.vx < 0) {
            ctx.scale(-1, 1); // Flip if flying right to left
        }

        let pSize = 3;

        // Draw Banner Line
        ctx.fillStyle = '#000';
        ctx.fillRect(-this.width / 2 - 40, 5, 40, 2);

        // Draw White K Banner
        ctx.fillStyle = '#fff';
        ctx.fillRect(-this.width / 2 - 80, -10, 40, 30);
        ctx.fillStyle = '#4caf50'; // Green K
        ctx.font = "8px 'Press Start 2P', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("K", -this.width / 2 - 60, 5);

        // Draw simple plane body
        ctx.fillStyle = '#ccc';
        ctx.fillRect(-this.width / 2, -5, this.width, 14); // fuselage
        ctx.fillStyle = '#f44336'; // red tail
        ctx.fillRect(-this.width / 2, -15, 10, 10);
        ctx.fillStyle = '#90caf9'; // window
        ctx.fillRect(this.width / 2 - 15, -5, 10, 8);
        ctx.fillStyle = '#333'; // prop
        if (Math.floor(performance.now() / 50) % 2 === 0) {
            ctx.fillRect(this.width / 2, -10, 2, 24);
        }

        ctx.restore();
    }
}

class HeavyBomber {
    constructor() {
        this.width = 12;
        this.height = 5;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = 100;
        this.age = 0;
        this.isDead = false;
        this.fullyDead = false;
        this.particles = null;
        this.growthRate = 0.5; // +50%
        this.growthInterval = 1.5; // every 1.5s to fit 6s better
        this.maxAge = 6.0; // disappears after 6s
        
        // Rumbling sound (Low pitched siren or engine)
        this.rumbleSource = playSound(sirenBuffer, 0.3, true);
        if (this.rumbleSource) {
            this.rumbleSource.playbackRate.value = 0.2; // Low rumble
        }
    }

    update(dt) {
        if (this.isDead) {
            if (this.rumbleSource) {
                try { this.rumbleSource.stop(); } catch(e){}
                this.rumbleSource = null;
            }
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.fullyDead = true;
            } else {
                this.fullyDead = true;
            }
            return;
        }

        this.age += dt;
        if (this.age >= this.maxAge) {
            // Penalty: Bomber escaped!
            if (gameState.drivingMode) {
                triggerDrivingPenalty();
            } else {
                gameState.lives--;
                gameState.redFlashTimer = 1.0;
                gameState.shakeTimer = 1.0;
                updateUI();
            }
            playSound(boomBuffer, 0.5); // Dull impact

            if (this.rumbleSource) {
                try { this.rumbleSource.stop(); } catch(e){}
            }
            this.fullyDead = true;
            
            if (gameState.lives <= 0 && gameState.phase !== 'GAME_OVER') {
                triggerGameOver();
            }
            return;
        }

        // Growth logic: +50% every 2s
        let intervals = Math.floor(this.age / this.growthInterval);
        let scale = Math.pow(1 + this.growthRate, intervals);
        this.currentWidth = this.width * scale;
        this.currentHeight = this.height * scale;
        this.x = canvas.width / 2 - this.currentWidth / 2;
        // Float slightly downwards to simulate "coming closer"
        this.y = 100 + (this.age * 20);
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        ctx.save();
        ctx.translate(this.x + this.currentWidth / 2, this.y + this.currentHeight / 2);
        
        let w = this.currentWidth;
        let h = this.currentHeight;

        // Front-facing Bomber View
        ctx.fillStyle = "#2c3e50"; // Military Gray

        // 1. Large Wings (Horizontal Span)
        ctx.fillRect(-w/2, -h/10, w, h/5);

        // 2. Central Fuselage
        ctx.fillStyle = "#34495e";
        ctx.fillRect(-w/12, -h/2, w/6, h);

        // 3. Four Engines (Front Intakes)
        ctx.fillStyle = "#1a252f";
        let eW = w/10;
        let eH = h/1.2;
        // Inner Pair
        ctx.fillRect(-w/6 - eW/2, -eH/2, eW, eH);
        ctx.fillRect(w/6 - eW/2, -eH/2, eW, eH);
        // Outer Pair
        ctx.fillRect(-w/2.6 - eW/2, -eH/2, eW, eH);
        ctx.fillRect(w/2.6 - eW/2, -eH/2, eW, eH);

        // 4. Transparent Cockpit
        ctx.fillStyle = "rgba(173, 216, 230, 0.6)"; // Transparent Blue
        ctx.fillRect(-w/20, -h/2.5, w/10, h/4);
        
        // Simple highlight on the glass
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(-w/20 + 2, -h/2.5 + 2, w/40, h/10);

        ctx.restore();
    }
}

class Splatter {
    constructor(color) {
        this.x = Math.random() * (canvas.width - 90);
        this.y = Math.random() * (canvas.height - 90);
        this.size = 60 + Math.random() * 30;
        this.color = color;
        this.life = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = Math.max(0, Math.min(1.0, this.life * 2));
        ctx.fillStyle = this.color;
        // Irregular splatter shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * Math.PI * 2;
            let dist = (this.size / 2) * (0.6 + Math.random() * 0.4);
            ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class DrivingEnemy {
    constructor(type) {
        this.type = type; // 'duck' or 'cockroach'
        this.x = canvas.width / 2;
        this.y = canvas.height * 0.3; // Match new horizon (30%)
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = 2;
        this.maxSize = 100; // Increased base size for better visibility
        this.timer = 0;
        this.maxTimer = 3.2; 
        this.side = (Math.random() - 0.5) * 0.8; // Wider spread
        this.isDead = false;
        this.fullyDead = false;
    }

    update(dt) {
        this.timer += dt;
        let progress = Math.min(1.0, this.timer / this.maxTimer);
        // Approach from horizon effect
        this.size = 2 + (this.maxSize - 2) * (progress * progress);
        
        // End up at roughly 70% screen height (top of dashboard)
        this.y = this.baseY + (canvas.height * 0.4) * (progress * progress);
        // Move outwards from center
        this.x = this.baseX + (canvas.width * 0.4 * this.side) * (progress * progress);

        if (this.timer >= this.maxTimer) {
            // Hit player! - No life loss during driving
            triggerDrivingPenalty();

            let color = this.type === 'duck' ? '#FFD700' : '#5D4037';
            if (gameState.splatters) gameState.splatters.push(new Splatter(color));
            playSound(boomBuffer, 0.8);
            this.isDead = true;
            this.fullyDead = true;
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.fullyDead = true;
        
        let color = this.type === 'duck' ? '#FFD700' : '#5D4037';
        if (gameState.splatters) gameState.splatters.push(new Splatter(color));
        
        playSound(this.type === 'duck' ? quackBuffer : boomBuffer, 0.8);
        addScore(1000, this.x, this.y);
        gameState.killCount++;
        if (this.type === 'duck' && gameState.drivingMode) {
            gameState.drivingMode.duckKills++;
        }
    }

    draw(ctx) {
        let img = this.type === 'duck' ? (processedDuckFront || duckFrontImg) : (processedCockroachFront || cockroachFrontImg);
        ctx.drawImage(img, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

class DrivingMode {
    constructor() {
        this.roadOffset = 0;
        this.spawnTimer = 0.5;
        this.enemies = [];
        this.wheelRotation = 0;
        this.speed = 400;
        this.timer = 0;
        this.gameTime = 120; // 2 minutes
        this.duckWaveTimer = 0;
        
        // Autopilot for mobile
        this.autopilotAngle = 0;
        this.autopilotTarget = 0;
        this.autopilotTimer = 0;

        this.totalDistance = 0;
        this.baseSpeed = 400;
        this.signY = 0; // Perspective Y for the sign
        this.signSide = 1; // 1 for right, -1 for left
        
        this.ammoTimer = 10;
        this.duckKills = 0;
        this.isBMW = false;
    }

    update(dt) {
        this.timer += dt;
        this.duckWaveTimer += dt;
        
        // Duck waves every 10 seconds at same round conditions (Round 1)
        if (this.duckWaveTimer >= 10) {
            this.duckWaveTimer = 0;
            // Spawn a wave of 3-4 ducks
            let count = 3 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                gameState.ducks.push(new Duck());
            }
        }

        this.totalDistance += dt * this.speed;
        this.roadOffset = (this.roadOffset + dt * this.speed) % 100;

        // Deceleration Logic: 15s to 5s remaining
        let remaining = this.gameTime - this.timer;
        if (remaining <= 15 && remaining > 5) {
            let p = (remaining - 5) / 10; // 1.0 at 15s, 0.0 at 5s
            this.speed = this.baseSpeed * p;
        } else if (remaining <= 5) {
            this.speed = 0;
        }

        this.spawnTimer -= dt;
        // Stop spawning enemies as we slow down
        if (this.spawnTimer <= 0 && remaining > 15) {
            this.enemies.push(new DrivingEnemy(Math.random() < 0.6 ? 'duck' : 'cockroach'));
            this.spawnTimer = 1.0 + Math.random() * 1.5;
        }

        this.enemies.forEach(e => e.update(dt));
        this.enemies = this.enemies.filter(e => !e.fullyDead);
        
        let targetRot = 0;
        if (isMobile) {
            // Smooth autonomous steering for mobile
            this.autopilotTimer -= dt;
            if (this.autopilotTimer <= 0) {
                this.autopilotTarget = (Math.random() - 0.5) * 1.4; // -0.7 to 0.7
                this.autopilotTimer = 2.0 + Math.random() * 3.0; // Change target every 2-5s
            }
            this.autopilotAngle += (this.autopilotTarget - this.autopilotAngle) * dt * 1.0;
            targetRot = this.autopilotAngle;
        } else {
            // Interactive wheel for desktop
            targetRot = (currentAimX - canvas.width/2) / (canvas.width/2) * 0.7;
        }
        this.wheelRotation += (targetRot - this.wheelRotation) * dt * 5;
        if (isNaN(this.wheelRotation)) this.wheelRotation = 0;

        // Ammo Restock every 10s
        this.ammoTimer -= dt;
        if (this.ammoTimer <= 0) {
            this.ammoTimer = 10;
            gameState.ammo = 30; // Assuming 30 is max/standard
            gameState.floatingTexts.push({
                x: canvas.width/2,
                y: canvas.height/2,
                text: "AMMO RESTOCK",
                life: 1.5,
                maxLife: 1.5,
                timer: 1.5,
                color: "#00BFFF"
            });
        }

        // Perk: BMW Steering Wheel
        if (this.duckKills >= 10 && this.timer < this.gameTime && !this.isBMW) {
            this.isBMW = true;
            gameState.floatingTexts.push({
                x: canvas.width/2,
                y: canvas.height/2 - 50,
                text: "BMW PERK UNLOCKED",
                life: 2.0,
                maxLife: 2.0,
                timer: 2.0,
                color: "#FFD700"
            });
        }

        if (this.timer >= this.gameTime) {
            gameState.drivingMode = null;
            // Transition to Shadowy Figure screen instead of DOG
            showShadowyScreen(gameState.round, false);
        }
    }

    draw(ctx) {
        // Only clear the ground area (below horizon)
        let horizonY = canvas.height * 0.3;
        ctx.fillStyle = '#222';
        ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

        // --- Background Skyline (Endless Scrolling) ---
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, horizonY);
        
        let buildingLayerScale = 0.2;
        let buildingSpacing = 100;
        let scrollX = this.totalDistance * buildingLayerScale;
        
        ctx.fillStyle = '#1a1a2e';
        for (let i = -5; i < (canvas.width / buildingSpacing) + 5; i++) {
            let baseScreenX = i * buildingSpacing;
            let bX = (baseScreenX - (scrollX % buildingSpacing));
            let absIndex = Math.floor((scrollX + baseScreenX) / buildingSpacing);
            
            // Procedural properties based on absIndex
            let heightSeed = Math.abs(Math.sin(absIndex * 1234.5));
            let styleSeed = Math.abs(Math.cos(absIndex * 567.8));
            let colorSeed = Math.abs(Math.sin(absIndex * 910.1));
            
            let bW = 70 + heightSeed * 30;
            let bH = 60 + heightSeed * 100;
            let style = Math.floor(styleSeed * 4); // 4 styles
            
            ctx.save();
            // Vary building color slightly
            let gray = 20 + Math.floor(colorSeed * 20);
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray + 10})`;
            
            // --- Draw Building Shape ---
            if (style === 0) { // Flat
                ctx.fillRect(bX, horizonY - bH, bW, bH);
            } else if (style === 1) { // Peaked
                ctx.fillRect(bX, horizonY - bH, bW, bH);
                ctx.beginPath();
                ctx.moveTo(bX, horizonY - bH);
                ctx.lineTo(bX + bW/2, horizonY - bH - 30);
                ctx.lineTo(bX + bW, horizonY - bH);
                ctx.fill();
            } else if (style === 2) { // Stepped
                ctx.fillRect(bX, horizonY - bH, bW, bH);
                ctx.fillRect(bX + bW*0.15, horizonY - bH - 20, bW*0.7, 20);
                ctx.fillRect(bX + bW*0.3, horizonY - bH - 40, bW*0.4, 20);
            } else { // Spired
                ctx.fillRect(bX, horizonY - bH, bW, bH);
                ctx.fillRect(bX + bW/2 - 2, horizonY - bH - 50, 4, 50); // Antenna/Spire
            }

            // --- Window Patterns ---
            let winStyle = Math.floor(colorSeed * 4);
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#ffd700';
            
            if (winStyle === 0) { // Standard Grid
                for (let w = 0; w < 4; w++) {
                    for (let h = 0; h < 5; h++) {
                        if (Math.sin(absIndex * 555 + w * 11 + h) > 0.3) {
                            ctx.fillRect(bX + 10 + w * (bW/5), horizonY - bH + 10 + h * (bH/7), 6, 6);
                        }
                    }
                }
            } else if (winStyle === 1) { // Vertical Strips
                for (let w = 0; w < 3; w++) {
                    if (Math.sin(absIndex * 777 + w) > 0) {
                        ctx.fillRect(bX + 15 + w * (bW/3.5), horizonY - bH + 10, 4, bH - 20);
                    }
                }
            } else if (winStyle === 2) { // Horizontal Bands
                for (let h = 0; h < 6; h++) {
                    if (Math.cos(absIndex * 888 + h) > 0.4) {
                        ctx.fillRect(bX + 5, horizonY - bH + 10 + h * (bH/8), bW - 10, 3);
                    }
                }
            } else { // Scattered Lights
                for (let k = 0; k < 12; k++) {
                    let rx = Math.abs(Math.sin(absIndex * 999 + k)) * (bW - 10);
                    let ry = Math.abs(Math.cos(absIndex * 111 + k)) * (bH - 10);
                    if (Math.sin(absIndex + k) > 0.5) {
                        ctx.fillRect(bX + 5 + rx, horizonY - bH + 5 + ry, 4, 4);
                    }
                }
            }
            ctx.restore();
        }

        // Perspective road with Bending
        let bendFactor = this.wheelRotation * 150; // How much it bends
        
        ctx.fillStyle = '#111';
        ctx.beginPath();
        // Horizon points
        let hLX = canvas.width * 0.45;
        let hRX = canvas.width * 0.55;
        ctx.moveTo(hLX, horizonY);
        ctx.lineTo(hRX, horizonY);
        // Bottom points (bent)
        ctx.lineTo(canvas.width + 200 + bendFactor, canvas.height);
        ctx.lineTo(-200 + bendFactor, canvas.height);
        ctx.fill();

        // Road stripes (Bent)
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([20, 60]);
        ctx.lineDashOffset = -this.roadOffset;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, horizonY);
        ctx.lineTo(canvas.width / 2 + bendFactor * 0.8, canvas.height); // Central stripe follows bend
        ctx.stroke();
        ctx.restore();

        // Side lines (Bent)
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(hLX, horizonY);
        ctx.lineTo(-200 + bendFactor, canvas.height);
        ctx.moveTo(hRX, horizonY);
        ctx.lineTo(canvas.width + 200 + bendFactor, canvas.height);
        ctx.stroke();

        // --- Liulin Sign Sequence (Appear at 6s) ---
        let timeRemaining = this.gameTime - this.timer;
        if (timeRemaining <= 6) {
            // Sign starts at horizon and grows
            // Time elapsed since 6s mark: 0 to 6
            let elapsed = 6 - timeRemaining;
            let progress = Math.min(1.0, elapsed / 5); // 0.0 at 6s, 1.0 at 1s
            
            ctx.save();
            let signW = 120 * (progress * 4);
            let signH = 80 * (progress * 4);
            let signX = (canvas.width / 2 + (canvas.width * 0.4 * progress) + bendFactor * progress);
            let signY = horizonY + (canvas.height * 0.4) * (progress * progress);
            
            // White background sign with gray border
            ctx.fillStyle = '#eee';
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 4 * (1 + progress);
            ctx.fillRect(signX, signY - signH, signW, signH);
            ctx.strokeRect(signX, signY - signH, signW, signH);
            
            // Lettering
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.font = `bold ${14 * (1 + progress * 2)}px 'Courier New', monospace`;
            ctx.fillText("WELCOME TO", signX + signW/2, signY - signH * 0.6);
            ctx.fillText("LIULIN", signX + signW/2, signY - signH * 0.3);
            
            // Sign post
            ctx.fillStyle = '#888';
            ctx.fillRect(signX + signW/4, signY, 8 * (1 + progress), signH * 0.5);
            ctx.restore();
        }

        // Enemies (Drawn before the cockpit)
        this.enemies.forEach(e => e.draw(ctx));

        // --- Countdown Timer (MM:SS) ---
        let timerRemaining = Math.max(0, this.gameTime - this.timer);
        let mins = Math.floor(timerRemaining / 60);
        let secs = Math.floor(timerRemaining % 60);
        let timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px 'Courier New', monospace";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.textAlign = "left";
        // Position below the Sun (Sun center at 40, radius 20, so 60 is bottom of sun)
        ctx.fillText(timeStr, 20, 85); 
        ctx.restore();
    }

    drawOver(ctx) {
        ctx.save();
        
        let dashboardBottomY = canvas.height;
        let dashboardTopY = canvas.height * 0.7; // 30% dash height
        let dashH = dashboardBottomY - dashboardTopY;

        // --- Calculate Dashboard Dimensions ---
        let baseW = canvas.width * 0.7; // 70% width target
        let aspectRatio = carCockpitImg.height / carCockpitImg.width;
        let baseH = baseW * aspectRatio;
        
        let scale = dashH / (baseH * 0.5);
        let finalW = baseW * scale;
        let finalH = baseH * scale;
        let finalX = (canvas.width - finalW) / 2;
        let finalY = canvas.height - finalH;

        // --- Apply Rounded UI Clip (10px radius) to the entire visible strip ---
        ctx.save();
        let radius = 10;
        ctx.beginPath();
        ctx.moveTo(radius, dashboardTopY);
        ctx.lineTo(canvas.width - radius, dashboardTopY);
        ctx.quadraticCurveTo(canvas.width, dashboardTopY, canvas.width, dashboardTopY + radius);
        ctx.lineTo(canvas.width, canvas.height); // No rounding at bottom
        ctx.lineTo(0, canvas.height);
        ctx.lineTo(0, dashboardTopY + radius);
        ctx.quadraticCurveTo(0, dashboardTopY, radius, dashboardTopY);
        ctx.closePath();
        ctx.clip();

        // --- Fill Side Gaps with Door Panels ---
        let doorW = finalX * 2.2; 
        let doorL = processedDoorLeft || doorPanelLeftImg;
        let doorR = processedDoorRight || doorPanelRightImg;
        
        if (!doorL.complete || !doorR.complete) {
            ctx.fillStyle = "#4a3c31"; 
            ctx.fillRect(0, dashboardTopY, finalX, dashH);
            ctx.fillRect(canvas.width - finalX, dashboardTopY, finalX, dashH);
        }
        
        ctx.drawImage(doorL, 0, dashboardTopY, doorW, dashH);
        ctx.drawImage(doorR, canvas.width - doorW, dashboardTopY, doorW, dashH);

        // --- Draw Dashboard ---
        let cockpit = processedCockpit || carCockpitImg;
        ctx.drawImage(cockpit, finalX, finalY, finalW, finalH);
        
        ctx.restore(); // End of interior clipping

        // --- Draw Wheel ---
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height - (dashH * 0.6)); 
        ctx.rotate(this.wheelRotation);
        let wheelS = dashH * 1.6; 
        let wheel = processedWheel || steeringWheelImg;
        if (this.isBMW) wheel = processedBmwWheel || steeringWheelBmwImg;
        if (wheel && wheel.width > 0 && !isNaN(this.wheelRotation)) {
            ctx.drawImage(wheel, -wheelS/2, -wheelS/2, wheelS, wheelS);
        }
        ctx.restore();
        ctx.restore();
    }
}

class BigHeadBoss {
    constructor() {
        this.width = 300;
        this.height = 120;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -150; // Start off-screen
        this.targetY = 100;
        this.hp = 50;
        this.maxHp = 50;
        this.engines = [true, true, true, true]; // 4 engines
        this.isDead = false;
        this.fullyDead = false;
        this.isVulnerable = false;
        this.isBoss = true; // Use property instead of instanceof
        this.currentWidth = 300;
        this.currentHeight = 240; // 2x taller (was 120)
        this.expression = 'ANGRY'; // ANGRY, GRIN, SNICKERING, SURPRISED
        this.snickerTimer = 0;
        this.phase = 'ENTERING'; // ENTERING, FLYING, SHOOTING, DYING
        this.timer = 0;
        this.wavyOffset = 0;
        this.speed = 100;
        this.fireRate = 2.0; // Seconds between shots
        this.fireTimer = 0;
        this.speedMult = 1.0;
        this.fireRateMult = 1.0;
        this.particles = null;
        this.tauntTimer = 3.0; // Wait 3s before first taunt
        this.taunts = [
            "I've got the sauce, you're just a nobody.",
            "No sauce detected on this player.",
            "You're a generic asset, I'm the main event.",
            "PDF stands for 'Please Delete Failure' (you).",
            "This bomber has more layers than your skill.",
            "Is that a pea shooter? Cute.",
            "I am the sauce king of level 14.",
            "The head is big because it contains the sauce."
        ];
        this.shieldFlash = 0;
        this.exposedAlertGiven = false;
        this.rumbleSource = playSound(sirenSource ? null : sirenBuffer, 0.4, true); // Added fallback check
        if (this.rumbleSource) this.rumbleSource.playbackRate.value = 0.3;
    }

    update(dt) {
        if (this.isDead) {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.fullyDead = true;
            } else {
                this.fullyDead = true;
            }
            return;
        }

        this.timer += dt;
        this.wavyOffset += dt * 2;

        if (this.phase === 'ENTERING') {
            this.y += 100 * dt;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.phase = 'FLYING';
                this.timer = 0;
                this.isVulnerable = true;
            }
        } else if (this.phase === 'FLYING') {
            // Wavy movement - enhanced vertical range
            this.x = (canvas.width / 2 - this.width / 2) + Math.sin(this.wavyOffset) * 200;
            // Swing between 100 and near bottom (grass is at height - 12%)
            let minY = 100;
            let maxY = canvas.height - 250; 
            this.y = minY + (Math.cos(this.wavyOffset * 0.5) + 1) / 2 * (maxY - minY);

            if (this.timer > 4) {
                this.phase = 'SHOOTING';
                this.expression = 'GRIN';
                this.timer = 0;
            }
        } else if (this.phase === 'SHOOTING') {
            if (this.timer >= 0.7) { // 700ms pause
                // Shoot 2 rockets spaced 200px apart
                let w = this.width;
                gameState.bossProjectiles.push(new BossProjectile(this.x + w/2 - 100, this.y + 40));
                gameState.bossProjectiles.push(new BossProjectile(this.x + w/2 + 100, this.y + 40));
                
                playSound(shootBuffer, 0.8);
                this.phase = 'FLYING';
                this.expression = 'ANGRY';
                this.timer = 0;
            }
        }

        if (this.snickerTimer > 0) {
            this.snickerTimer -= dt;
            if (this.snickerTimer <= 0) this.expression = 'ANGRY';
        }

        if (this.shieldFlash > 0) this.shieldFlash -= dt;

        // Check for exposure alert
        if (!this.exposedAlertGiven && this.engines.every(e => !e)) {
            this.exposedAlertGiven = true;
            playSound(vulnerableBuffer, 0.8);
            gameState.floatingTexts.push({
                x: this.x + this.width / 2,
                y: this.y - 50,
                text: "HEAD EXPOSED!",
                timer: 3.0,
                life: 3.0,
                color: "#f44336",
                size: 30
            });
        }

        // Taunting logic
        this.tauntTimer -= dt;
        if (this.tauntTimer <= 0) {
            let taunt = this.taunts[Math.floor(Math.random() * this.taunts.length)];
            gameState.floatingTexts.push({
                x: this.x + this.width / 2,
                y: this.y + 40,
                text: taunt,
                timer: 3.0,
                life: 3.0,
                color: "#FFFFFF",
                size: 20
            });
            this.tauntTimer = 5 + Math.random() * 5; // Taunt every 5-10 seconds
        }

        if (this.hp <= 0 && !this.isDead) {
            this.expression = 'SURPRISED';
            this.die();
        }
    }

    die() {
        this.isDead = true;
        if (this.rumbleSource) {
            try { this.rumbleSource.stop(); } catch(e){}
        }
        playSound(boomBuffer, 1.0);
        this.particles = [];
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: this.x + Math.random() * this.width,
                y: this.y + Math.random() * this.height,
                vx: (Math.random() - 0.5) * 800,
                vy: (Math.random() - 0.5) * 800,
                size: 5 + Math.random() * 15,
                life: 1.0 + Math.random() * 1.5,
                color: ['#f44336', '#ff9800', '#ffeb3b', '#333'][Math.floor(Math.random() * 4)]
            });
        }
        gameState.victoryTimer = 3.0; // 3 second pause
        
        // Reward 10000 points
        gameState.score += 10000;
        
        // Global stats update
        if (typeof incrementGlobalBossKills === 'function') {
            window.localBossKillHandled = true; // Mark locally so we don't notify ourselves
            incrementGlobalBossKills();
        }

        gameState.floatingTexts.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            text: "+10000",
            timer: 2.0,
            life: 2.0,
            color: "#FFD700",
            size: 48
        });
        updateUI();
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        ctx.save();
        let w = this.width;
        let h = this.height;
        let time = performance.now() / 1000;

        // Draw Bomber Wings
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(this.x, this.y + h/2.5, w, h/5);

        // Draw Fuselage (reduced height)
        ctx.fillStyle = "#34495e";
        ctx.fillRect(this.x + w/2 - w/12, this.y - h/2, w/6, h * 1.4);

        // Draw Engines (Jagged Discs - 2x Larger)
        let eW = w/5;
        let eH = h;
        let enginePositions = [w/6, w/2.6, -w/6, -w/2.6];
        enginePositions.forEach((pos, idx) => {
            let ex = this.x + w/2 + pos - eW/2;
            let ey = this.y + h/2.5 - eH/2;
            if (this.engines[idx]) {
                // Subtler Pulsing Highlight for active engines
                let pulse = (Math.sin(time * 5) + 1) / 2;
                ctx.fillStyle = `rgba(244, 67, 54, ${pulse * 0.2})`;
                ctx.fillRect(ex - 2, ey - 2, eW + 4, eH + 4);

                ctx.fillStyle = "#1a252f";
                
                ctx.save();
                ctx.translate(ex + eW/2, ey + eH/2);
                ctx.beginPath();
                for (let i = 0; i < 16; i++) {
                    let angle = (i / 16) * Math.PI * 2;
                    let r = (eW / 2) * (0.8 + Math.random() * 0.4); // Jagged radius
                    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                }
                ctx.closePath();
                ctx.fill();
                
                // Animated spinning fans (White)
                ctx.rotate(time * 20); // Spin fast
                ctx.fillStyle = "#FFF";
                // Cross fan blades
                ctx.fillRect(-eW/2 + 2, -2, eW - 4, 4);
                ctx.fillRect(-2, -eH/2 + 2, 4, eH - 4);
                ctx.restore();
            } else {
                // Animated fire effect for destroyed engine (50% smaller)
                ctx.fillStyle = "#f44336";
                ctx.fillRect(ex + eW/4, ey + eH/4, eW/2, eH/2);
                for (let i = 0; i < 3; i++) {
                    ctx.fillStyle = ["#f44336", "#ff9800", "#ffeb3b"][Math.floor(Math.random() * 3)];
                    let fw = 2.5 + Math.random() * 5;
                    let fh = 5 + Math.random() * 10;
                    ctx.fillRect(ex + eW/4 + Math.random() * (eW/2 - fw), ey + eH/4 - fh + Math.random() * 5, fw, fh);
                }
            }
        });

        // Draw Giant Head
        let headSize = 100;
        let headX = this.x + w/2 - headSize/2;
        let headY = this.y - headSize * 0.7;
        
        // Skin (Darker)
        if (this.engines.every(e => !e)) {
            let pulse = (Math.sin(time * 5) + 1) / 2;
            ctx.fillStyle = `rgba(244, 67, 54, ${pulse * 0.2})`;
            ctx.fillRect(headX - 5, headY - 5, headSize + 10, headSize + 10);
        }
        ctx.fillStyle = "#8d5524";
        ctx.fillRect(headX, headY, headSize, headSize);
        
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.fillRect(headX + 15, headY + 20, 30, 30);
        ctx.fillRect(headX + 55, headY + 20, 30, 30);
        ctx.fillStyle = "#000";
        
        if (this.expression === 'ANGRY') {
            // Angry brows and pupils
            ctx.fillRect(headX + 25, headY + 30, 15, 10);
            ctx.fillRect(headX + 60, headY + 30, 15, 10);
            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.moveTo(headX+10, headY+15); ctx.lineTo(headX+45, headY+25); ctx.stroke();
            ctx.moveTo(headX+90, headY+15); ctx.lineTo(headX+55, headY+25); ctx.stroke();
        } else if (this.expression === 'GRIN') {
            // Evil glint
            ctx.fillRect(headX + 30, headY + 30, 8, 8);
            ctx.fillRect(headX + 62, headY + 30, 8, 8);
        } else if (this.expression === 'SNICKERING') {
            // Squinting
            ctx.fillStyle = "#8d5524";
            ctx.fillRect(headX + 15, headY + 20, 30, 15);
            ctx.fillRect(headX + 55, headY + 20, 30, 15);
            ctx.fillStyle = "#000";
            ctx.fillRect(headX + 25, headY + 40, 10, 5);
            ctx.fillRect(headX + 65, headY + 40, 10, 5);
        } else if (this.expression === 'SURPRISED') {
            // Tiny pupils
            ctx.fillRect(headX + 28, headY + 33, 4, 4);
            ctx.fillRect(headX + 68, headY + 33, 4, 4);
        }
        
        // Nerdy Glasses
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 4;
        ctx.strokeRect(headX + 10, headY + 15, 35, 35);
        ctx.strokeRect(headX + 55, headY + 15, 35, 35);
        ctx.beginPath();
        ctx.moveTo(headX + 45, headY + 32);
        ctx.lineTo(headX + 55, headY + 32);
        ctx.stroke();

        // PDF Plate
        ctx.fillStyle = "#fff";
        ctx.fillRect(headX + 20, headY + headSize - 5, 60, 25);
        ctx.fillStyle = "#f44336";
        ctx.font = "bold 16px 'Press Start 2P', cursive";
        ctx.textAlign = "center";
        ctx.fillText("PDF", headX + headSize/2, headY + headSize + 15);

        // Mouth
        ctx.fillStyle = "#333";
        if (this.expression === 'ANGRY') {
            ctx.fillRect(headX + 30, headY + 75, 40, 10);
        } else if (this.expression === 'GRIN') {
            ctx.beginPath();
            ctx.arc(headX + 50, headY + 75, 20, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = "#fff"; // Teeth
            ctx.fillRect(headX + 35, headY + 75, 30, 5);
        } else if (this.expression === 'SNICKERING') {
            ctx.fillRect(headX + 35, headY + 80, 30, 5);
        } else if (this.expression === 'SURPRISED') {
            ctx.beginPath();
            ctx.arc(headX + 50, headY + 80, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health Bar
        let hbW = 120;
        let hbH = 10;
        let hbX = headX + headSize/2 - hbW/2;
        let hbY = headY - 30;
        ctx.fillStyle = "#333";
        ctx.fillRect(hbX, hbY, hbW, hbH);
        ctx.fillStyle = "#f44336";
        ctx.fillRect(hbX + 2, hbY + 2, (hbW - 4) * (this.hp / this.maxHp), hbH - 4);

        // Shield Flash Effect on Head
        if (this.shieldFlash > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${this.shieldFlash * 2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Simple hex pattern or cross-hatch overlay
            for (let i = 0; i < 5; i++) {
                ctx.moveTo(headX, headY + i * 20); ctx.lineTo(headX + headSize, headY + i * 20);
                ctx.moveTo(headX + i * 20, headY); ctx.lineTo(headX + i * 20, headY + headSize);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
}

class PoopProjectile {
    constructor(x, y) {
        this.baseX = x; // Store start position for spiral logic
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.timer = 0;
        this.maxTimer = 2.0;
        this.size = 20;
        this.maxSize = 120;
        this.hp = 10; // Poop can be destroyed!
        this.isDead = false;
        this.fullyDead = false;
        this.particles = [];
        this.angle = 0;
        this.spiralRate = 4 + Math.random() * 6;
        this.spiralPhase = Math.random() * Math.PI * 2;
        this.spiralRadiusMax = 60 + Math.random() * 80;
    }

    update(dt) {
        if (this.isDead) return;

        let speedScaling = 1 + Math.sin(this.timer * 6) * 0.4;
        this.timer += dt * speedScaling;

        let progress = Math.min(1.0, this.timer / this.maxTimer);
        this.size = 20 + (this.maxSize - 20) * progress;
        this.angle += dt * 5;

        // Spiral movement
        let spiralRadius = this.spiralRadiusMax * progress;
        this.x = this.baseX + Math.cos(this.timer * this.spiralRate + this.spiralPhase) * spiralRadius;
        this.y = this.baseY + Math.sin(this.timer * this.spiralRate + this.spiralPhase) * spiralRadius;

        // Poop particles
        if (Math.random() < 0.4) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * 30,
                y: this.y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 120,
                vy: 80 + Math.random() * 120,
                size: 4 + Math.random() * 8,
                life: 0.4 + Math.random() * 0.6,
                color: ['#5d4037', '#795548', '#8d6e63'][Math.floor(Math.random() * 3)]
            });
        }

        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        if (this.timer >= this.maxTimer) {
            if (gameState.drivingMode) {
                triggerDrivingPenalty();
            } else {
                gameState.lives--;
                gameState.redFlashTimer = 0.5;
                gameState.shakeTimer = 0.5;
                updateUI();
            }
            gameState.ammo = 12;
            if (gameState.boss) {
                gameState.boss.expression = 'SNICKERING';
                gameState.boss.snickerTimer = 2.0;
            }
            gameState.poopStainTimer = 2.5;
            gameState.poopStainX = (Math.random() - 0.5) * canvas.width * 0.3;
            gameState.poopStainY = (Math.random() - 0.5) * canvas.height * 0.3;
            playSound(boomBuffer, 1.0);
            updateUI();
            this.isDead = true;
            this.fullyDead = true;

            if (gameState.lives <= 0 && gameState.phase !== 'GAME_OVER') {
                triggerGameOver();
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;

        if (this.isDead) return;

        ctx.save();
        let jitter = (Math.random() - 0.5) * 4;
        ctx.translate(this.x + jitter, this.y);
        ctx.rotate(this.angle);
        // New spiral asset is centered differently, but drawImage -size/2 is usually safe
        ctx.drawImage(poopImg, -this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class UncleanOneBoss {
    constructor() {
        this.isBoss = true;
        this.name = "The Unclean One";
        this.hp = 150;
        this.maxHp = 150;
        this.segments = {
            hands: { hp: 50, maxHp: 50, alive: true },
            body: { hp: 50, maxHp: 50, alive: true },
            head: { hp: 50, maxHp: 50, alive: true }
        };
        this.x = canvas.width / 2;
        this.y = canvas.height + 200;
        this.baseY = canvas.height + 200;
        this.width = canvas.width * 0.35;
        this.height = canvas.height * 0.35;
        this.isUpsideDown = false;
        this.isVulnerable = false;
        this.isDead = false;
        this.fullyDead = false;
        this.timer = 0;
        this.state = 'REPOSITIONING';
        this.waitTime = 4.0;
        this.expression = 'ANGRY';
        this.snickerTimer = 0;
        this.protectX = 0;
        this.protectY = 0;
        this.protectTimer = 0;
        this.shieldFlash = 0;
        this.fireTimer = 0;
        this.handsFlash = 0;
        this.bodyFlash = 0;
        this.headFlash = 0;
        this.painTimer = 0;
        this.spinePhase = 0;
        this.flashColor = "#fff"; // default
        this.rumbleSource = playSound(sirenBuffer, 0.4, true);
        if (this.rumbleSource) this.rumbleSource.playbackRate.value = 0.2;
    }

    update(dt) {
        if (this.isDead) {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.fullyDead = true;
            } else {
                this.fullyDead = true;
            }
            return;
        }

        this.timer += dt;
        if (this.snickerTimer > 0) {
            this.snickerTimer -= dt;
            if (this.snickerTimer <= 0) this.expression = 'ANGRY';
        }
        if (this.protectTimer > 0) this.protectTimer -= dt;
        if (this.shieldFlash > 0) this.shieldFlash -= dt;
        if (this.handsFlash > 0) this.handsFlash -= dt;
        if (this.bodyFlash > 0) this.bodyFlash -= dt;
        if (this.headFlash > 0) this.headFlash -= dt;
        if (this.painTimer > 0) this.painTimer -= dt;
        this.spinePhase += dt * 5;

        if (this.state === 'REPOSITIONING') {
            this.isUpsideDown = Math.random() < 0.3;
            let margin = this.width * 1.2;
            this.x = margin + Math.random() * (canvas.width - 2 * margin);
            
            if (this.isUpsideDown) {
                this.baseY = -this.height;
                this.y = -this.height;
                this.targetY = 50;
            } else {
                let grassLevel = canvas.height - (canvas.height * 0.12);
                this.baseY = grassLevel + this.height;
                this.y = grassLevel + this.height;
                // Lift fully to expose torso and arms clearly
                this.targetY = grassLevel - this.height * 1.1; 
            }
            
            this.state = 'POPPING_UP';
            this.timer = 0;
            this.isVulnerable = true;
        } else if (this.state === 'POPPING_UP') {
            let speed = 400;
            if (this.isUpsideDown) {
                this.y += speed * dt;
                if (this.y >= this.targetY) {
                    this.y = this.targetY;
                    this.state = 'WAITING';
                    this.timer = 0;
                }
            } else {
                this.y -= speed * dt;
                if (this.y <= this.targetY) {
                    this.y = this.targetY;
                    this.state = 'WAITING';
                    this.timer = 0;
                }
            }
        } else if (this.state === 'WAITING') {
            this.fireTimer += dt;
            if (this.fireTimer > 1.2) {
                this.fireTimer = 0;
                let spawnX = this.x + (Math.random() - 0.5) * 100;
                let spawnY = this.y + (this.isUpsideDown ? this.height : 0) + (Math.random() - 0.5) * 50;
                gameState.bossProjectiles.push(new PoopProjectile(spawnX, spawnY));
                playSound(quackBuffer, 0.8);
            }
            if (this.timer >= this.waitTime) {
                this.state = 'POPPING_DOWN';
                this.timer = 0;
            }
        } else if (this.state === 'POPPING_DOWN') {
            let speed = 400;
            if (this.isUpsideDown) {
                this.y -= speed * dt;
                if (this.y <= this.baseY) {
                    this.y = this.baseY;
                    this.state = 'REPOSITIONING';
                    this.isVulnerable = false;
                }
            } else {
                this.y += speed * dt;
                if (this.y >= this.baseY) {
                    this.y = this.baseY;
                    this.state = 'REPOSITIONING';
                    this.isVulnerable = false;
                }
            }
        }

        if (this.hp <= 0 && !this.isDead) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        if (this.rumbleSource) {
            try { this.rumbleSource.stop(); } catch(e){}
        }
        playSound(boomBuffer, 1.0);
        this.particles = [];
        for (let i = 0; i < 150; i++) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * this.width,
                y: this.y + (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 1000,
                vy: (Math.random() - 0.5) * 1000,
                size: 8 + Math.random() * 20,
                life: 1.5 + Math.random() * 1.5,
                color: ['#4caf50', '#8d6e63', '#5d4037', '#2e7d32'][Math.floor(Math.random() * 4)]
            });
        }
        gameState.victoryTimer = 3.0;
        gameState.shakeTimer = 3.0;
        gameState.score += 30000;
        
        gameState.floatingTexts.push({
            x: this.x,
            y: this.y,
            text: "+30000",
            timer: 3.0,
            life: 3.0,
            color: "#FFD700",
            size: 60
        });
        updateUI();
    }


    drawShield(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "#aaa";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size, 0);
        ctx.lineTo(size, size * 0.7);
        ctx.lineTo(size / 2, size);
        ctx.lineTo(0, size * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    drawSegmentBar(ctx, x, y, w, h, data, vulnerable, pulse) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        if (!data.alive) {
            ctx.fillStyle = "rgba(50, 50, 50, 0.5)";
            ctx.fillRect(x, y, w, h);
            ctx.restore();
            return;
        }

        if (vulnerable) {
            let hpRatio = data.hp / 50;
            let hue = hpRatio * 120;
            let alpha = 0.7 + pulse * 0.3;
            ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${alpha})`;
            ctx.fillRect(x, y, w * hpRatio, h);
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        } else {
            ctx.fillStyle = "#444";
            ctx.fillRect(x, y, w, h);
            this.drawShield(ctx, x + w - 10, y + 1.5, 7);
        }
        ctx.restore();
    }

    drawShield(ctx, x, y, r) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "#00ffff";
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, -r*0.5);
        ctx.lineTo(r, r*0.5);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, r*0.5);
        ctx.lineTo(-r, -r*0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawGlow(ctx, x, y, w, h) {
        ctx.save();
        let pulse = (Math.sin(performance.now() / 200) + 1) / 2;
        ctx.shadowBlur = 15 + pulse * 15;
        ctx.shadowColor = `rgba(255, 0, 0, ${0.4 + pulse * 0.6})`;
        ctx.globalAlpha = 0.3 + pulse * 0.4;
        ctx.fillStyle = "rgba(255, 50, 50, 0.5)";
        ctx.fillRect(x + w*0.1, y + h*0.1, w*0.8, h*0.8);
        ctx.restore();
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.isUpsideDown) {
            ctx.scale(1, -1);
            ctx.translate(0, -this.height);
        }

        let w = this.width;
        let h = this.height;
        let pulse = (Math.sin(performance.now() / 150) + 1) / 2;

        // Inverting the context for upside-down mode flips the Y axis
        // We need to ensure segments are still ordered logically (Head above Body)
        let bodyY = h/4;
        let headY = -h/4;
        let handY = h/4;

        if (this.isUpsideDown) {
            ctx.scale(1, -1);
            ctx.translate(0, -this.height);
        }

        // Apply global paleness/disease filter
        const palenessFilter = 'brightness(1.5) saturate(0.6)';

        if (this.segments.body.alive) {
            ctx.save();
            if (this.bodyFlash > 0) {
                ctx.filter = this.flashColor === 'red' ? 'sepia(1) saturate(10) hue-rotate(-50deg) brightness(1)' : 'grayscale(1) brightness(1.5)';
            } else {
                ctx.filter = palenessFilter;
            }
            // Torso at bottom
            if (!this.segments.hands.alive && this.segments.body.alive) {
                this.drawGlow(ctx, -w/2, bodyY, w, h);
            }
            if (uncleanBodyImg.complete && uncleanBodyImg.naturalWidth !== 0) {
                ctx.drawImage(uncleanBodyImg, -w/2, bodyY, w, h);
            }
            ctx.restore();
        }

        // Gore: Bone Stumps if hands died
        if (!this.segments.hands.alive && this.segments.body.alive) {
            ctx.save();
            ctx.filter = palenessFilter;
            let stumpW = w * 0.4;
            let stumpH = h * 0.4;
            // Left shoulder stump
            if (uncleanBonesImg.complete && uncleanBonesImg.naturalWidth !== 0) {
                ctx.drawImage(uncleanBonesImg, -w/2 - 10, bodyY + 10, stumpW, stumpH);
            }
            // Right shoulder stump
            ctx.save();
            ctx.scale(-1, 1);
            if (uncleanBonesImg.complete && uncleanBonesImg.naturalWidth !== 0) {
                ctx.drawImage(uncleanBonesImg, -w/2 - 10, bodyY + 10, stumpW, stumpH);
            }
            ctx.restore();
            ctx.restore();
        }
        if (this.segments.head.alive) {
            ctx.save();
            // Pain shaking
            if (this.painTimer > 0) {
                ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
            }

            if (this.headFlash > 0) {
                ctx.filter = this.flashColor === 'red' ? 'sepia(1) saturate(10) hue-rotate(-50deg) brightness(1)' : 'grayscale(1) brightness(1.5)';
            } else {
                ctx.filter = palenessFilter;
            }
            // Head centered above torso - shrunk by 30%
            let headW = w * 0.7;
            let headH = h * 0.7;

            // Gore: Dangling Spine if body died
            if (!this.segments.body.alive) {
                ctx.save();
                let spineW = headW * 0.4;
                let spineH = headH * 1.5;
                // Animate spine dangling
                ctx.translate(0, headH/2);
                ctx.rotate(Math.sin(this.spinePhase) * 0.2);
                if (uncleanSpineImg.complete && uncleanSpineImg.naturalWidth !== 0) {
                    ctx.drawImage(uncleanSpineImg, -spineW/2, 0, spineW, spineH);
                }
                ctx.restore();
            }

            if (!this.segments.hands.alive && !this.segments.body.alive) {
                this.drawGlow(ctx, -headW/2, headY, headW, headH);
                
                // Visible Hitbox Indicator for Head
                ctx.strokeStyle = "rgba(255, 0, 0, " + (0.3 + pulse * 0.4) + ")";
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 2;
                ctx.strokeRect(-headW/2, headY, headW, headH);
                ctx.setLineDash([]);
            }
            if (uncleanHeadImg.complete && uncleanHeadImg.naturalWidth !== 0) {
                ctx.drawImage(uncleanHeadImg, -headW/2, headY, headW, headH);
            }
            ctx.restore();
        }
        if (this.segments.hands.alive) {
            ctx.save();
            if (this.handsFlash > 0) {
                ctx.filter = this.flashColor === 'red' ? 'sepia(1) saturate(10) hue-rotate(-50deg) brightness(1)' : 'grayscale(1) brightness(1.5)';
            } else {
                ctx.filter = palenessFilter;
            }
            let armW = w/1.2;
            let armH = h/1.2;
            if (this.protectTimer > 0) {
                ctx.save();
                let relX = (this.protectX - this.x);
                let relY = (this.protectY - this.y);
                if (this.isUpsideDown) relY = h - relY;
                
                ctx.translate(relX * 0.3, relY * 0.3);
                if (uncleanHandImg.complete && uncleanHandImg.naturalWidth !== 0) {
                    ctx.drawImage(uncleanHandImg, -armW*1.1 + 30, handY, armW, armH);
                }
                ctx.save();
                ctx.scale(-1, 1);
                if (uncleanHandImg.complete && uncleanHandImg.naturalWidth !== 0) {
                    ctx.drawImage(uncleanHandImg, -armW*1.1 + 30, handY, armW, armH);
                }
                ctx.restore();
                ctx.restore();
            } else {
                // Arms extending from shoulders
                if (this.segments.hands.alive) {
                    this.drawGlow(ctx, -armW*1.2 + 30, handY, armW, armH);
                    ctx.save();
                    ctx.scale(-1, 1);
                    this.drawGlow(ctx, -armW*1.2 + 30, handY, armW, armH);
                    ctx.restore();
                }
                if (uncleanHandImg.complete && uncleanHandImg.naturalWidth !== 0) {
                    ctx.drawImage(uncleanHandImg, -armW*1.2 + 30, handY, armW, armH);
                }
                ctx.save();
                ctx.scale(-1, 1);
                if (uncleanHandImg.complete && uncleanHandImg.naturalWidth !== 0) {
                    ctx.drawImage(uncleanHandImg, -armW*1.2 + 30, handY, armW, armH);
                }
                ctx.restore();
            }
            ctx.restore();
        }
        ctx.restore();
        
        ctx.save();
        let hbW_unit = 60; 
        let hbH = 10;
        // localized bar for HANDS (Arms)
        if (this.segments.hands.alive) {
            let armW = w/1.2;
            // Place below arms when upright, above arms when upside down
            let by = (this.isUpsideDown) ? this.y + h*0.4 - 20 : this.y + h*0.6 + 20; 
            
            [[this.x - armW*0.7, by], [this.x + armW*0.7, by]].forEach(pos => {
                this.drawSegmentBar(ctx, pos[0] - hbW_unit/2, pos[1], hbW_unit, hbH, this.segments.hands, true, pulse);
            });
        }

        // localized bar for BODY
        if (this.segments.body.alive) {
            let by = (this.isUpsideDown) ? this.y - 30 : this.y + h/2 + 30;
            let bx = this.x - hbW_unit/2;
            let isVulnerable = !this.segments.hands.alive;
            this.drawSegmentBar(ctx, bx, by, hbW_unit, hbH, this.segments.body, isVulnerable, pulse);
        }

        // localized bar for HEAD
        if (this.segments.head.alive) {
            let by = (this.isUpsideDown) ? this.y + h + 20 : this.y - h/4 - 20;
            let bx = this.x - hbW_unit/2;
            let isVulnerable = !this.segments.hands.alive && !this.segments.body.alive;
            this.drawSegmentBar(ctx, bx, by, hbW_unit, hbH, this.segments.head, isVulnerable, pulse);
        }

        ctx.restore();

        // ** Global Segmented Health Bar at the Top **
        ctx.save();
        let gX = canvas.width / 2 - 150;
        let gY = 20;
        let gW = 300;
        let gH = 15;
        let segW = gW / 3;

        // Draw background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gX - 2, gY - 2, gW + 4, gH + 4);

        // Sub-segments synchronized
        this.drawSegmentBar(ctx, gX, gY, segW - 2, gH, this.segments.hands, true, pulse);
        this.drawSegmentBar(ctx, gX + segW, gY, segW - 2, gH, this.segments.body, !this.segments.hands.alive, pulse);
        this.drawSegmentBar(ctx, gX + 2 * segW, gY, segW - 2, gH, this.segments.head, !this.segments.hands.alive && !this.segments.body.alive, pulse);
        
        // Add dynamic "BOSS" text
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("THE UNCLEAN ONE", canvas.width / 2, gY + gH + 15);
        ctx.restore();
    }
}

class Firework {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.targetY = 50 + Math.random() * 200;
        this.speed = 400 + Math.random() * 200;
        this.particles = [];
        this.exploded = false;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }
    update(dt) {
        if (!this.exploded) {
            this.y -= this.speed * dt;
            if (this.y <= this.targetY) {
                this.exploded = true;
                for (let i = 0; i < 50; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let force = 2 + Math.random() * 8;
                    this.particles.push({
                        x: this.x, y: this.y,
                        vx: Math.cos(angle) * force * 50,
                        vy: Math.sin(angle) * force * 50,
                        life: 1.0 + Math.random() * 0.5,
                        size: 3 + Math.random() * 3
                    });
                }
            }
        } else {
            this.particles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 100 * dt; // Gravity
                p.life -= dt;
            });
            this.particles = this.particles.filter(p => p.life > 0);
        }
    }
    draw(ctx) {
        if (!this.exploded) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - 2, this.y - 2, 4, 10);
        } else {
            this.particles.forEach(p => {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            ctx.globalAlpha = 1.0;
        }
    }
}

class BossProjectile {
    constructor(x, y) {
        this.baseX = x; // Store start position for spiral logic
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.timer = 0;
        this.maxTimer = 2.0;
        this.size = 10;
        this.maxSize = 100;
        this.isDead = false;
        this.fullyDead = false;
        this.particles = [];
        this.angle = 0;
    }

    update(dt) {
        // Varying speed: accelerate and decelerate using sine
        let speedScaling = 1 + Math.sin(this.timer * 6) * 0.4;
        this.timer += dt * speedScaling;

        let progress = Math.min(1.0, this.timer / this.maxTimer);
        this.size = 2 + (this.maxSize - 2) * progress; // Start very small
        this.angle += dt * 10; // Rapidly spin

        // Semi-spiral movement around the start point
        let spiralRadius = 50 * progress;
        let spiralRate = 8;
        this.x = this.baseX + Math.cos(this.timer * spiralRate) * spiralRadius;
        this.y = this.baseY + Math.sin(this.timer * spiralRate) * spiralRadius;

        // Emit fizzle particles
        if (Math.random() < 0.5) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * 20,
                y: this.y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 100,
                vy: 50 + Math.random() * 150, // Mostly downward
                size: 2 + Math.random() * 6,
                life: 0.3 + Math.random() * 0.5,
                color: ['#ff9800', '#ffeb3b', '#757575'][Math.floor(Math.random() * 3)]
            });
        }

        // Update particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        if (this.timer >= this.maxTimer) {
            // Impact player
            if (gameState.drivingMode) {
                triggerDrivingPenalty();
            } else {
                gameState.lives--;
                gameState.redFlashTimer = 0.5;
                gameState.shakeTimer = 0.5;
                updateUI();
            }
            gameState.ammo = 12; // Fresh full ammo recharge on hit
            if (gameState.boss) {
                gameState.boss.expression = 'SNICKERING';
                gameState.boss.snickerTimer = 2.0;
            }
            playSound(boomBuffer, 1.0);
            updateUI();
            this.isDead = true;
            this.fullyDead = true;

            if (gameState.lives <= 0 && gameState.phase !== 'GAME_OVER') {
                triggerGameOver();
            }
        }
    }

    draw(ctx) {
        // Draw particles first
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;

        ctx.save();
        // Shake logic: Add 3-5px jitter
        let jitterX = (Math.random() - 0.5) * 8; 
        ctx.translate(this.x + jitterX, this.y);
        ctx.rotate(this.angle); // Apply spin
        
        let p = this.size / 50; // Scaling factor
        
        let isFlashing = Math.floor(this.timer * 4) % 2 === 0;
        
        // Rocket Nose Cone (Front view)
        ctx.fillStyle = isFlashing ? "#fff" : "#ccc";
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = "#999";
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Stabilizer Fins (4 fins)
        ctx.fillStyle = "#f44336";
        let finW = this.size / 4;
        let finH = this.size / 2;
        
        // Top fin
        ctx.fillRect(-finW/2, -this.size/2 - finH, finW, finH);
        // Bottom fin
        ctx.fillRect(-finW/2, this.size/2, finW, finH);
        // Left fin
        ctx.fillRect(-this.size/2 - finH, -finW/2, finH, finW);
        // Right fin
        ctx.fillRect(this.size/2, -finW/2, finH, finW);
        
        // Red tip (Nose)
        ctx.fillStyle = "#f44336";
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Timer display
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.max(8, 12 * p)}px 'Press Start 2P', cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.ceil(this.maxTimer - this.timer), 0, 0);
        
        ctx.restore();
    }
}

class StickFigure {
    constructor(building) {
        this.building = building;
        this.scale = gameState.perspectiveMode ? building.layer : 1.0;
        this.x = building.x + (Math.random() * 0.6 + 0.2) * building.width;
        // building.height is used to calculate Y from grassLevel
        this.y = (canvas.height - (canvas.height * 0.12)) - building.height; 
        this.state = 'AIMING'; // AIMING, SHOOTING, CHEERING, WALKING
        this.timer = 0;
        this.bullets = [];
        this.targetDuck = null;
        this.walkDirection = Math.random() < 0.5 ? -1 : 1;
        this.isDead = false;
        this.frame = 0;
    }

    update(dt) {
        this.timer += dt;
        
        if (this.state === 'AIMING') {
            if (!this.targetDuck || this.targetDuck.isDead) {
                let alive = gameState.ducks.filter(d => !d.isDead);
                if (alive.length > 0) {
                    this.targetDuck = alive[Math.floor(Math.random() * alive.length)];
                } else {
                    this.state = 'WALKING';
                }
            }
            if (this.timer > 1.5) {
                this.state = 'SHOOTING';
                this.timer = 0;
                if (this.targetDuck) {
                     this.bullets.push(new StickFigureBullet(this.x, this.y - 12 * this.scale, this.targetDuck, this));
                } else {
                    this.state = 'WALKING';
                }
            }
        }
        
        if (this.state === 'WALKING') {
            this.x += this.walkDirection * 40 * dt * this.scale;
            this.frame += dt * 10;
            // Die when walking off the building
            if (this.x < this.building.x - 5 || this.x > this.building.x + this.building.width + 5) {
                this.isDead = true;
            }
        }

        this.bullets.forEach(b => b.update(dt));
        this.bullets = this.bullets.filter(b => !b.isDead);
        
        if (this.state === 'CHEERING') {
            if (this.timer > 1.5) {
                this.state = 'WALKING';
                this.timer = 0;
            }
        }
    }

    draw(ctx) {
        let scale = this.scale;
        let x = this.x;
        let y = this.y - 2 * scale; // Adjust for roof standing

        ctx.strokeStyle = "#111";
        ctx.lineWidth = 1.6 * scale;
        
        // Head
        ctx.beginPath();
        ctx.arc(x, y - 12 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        // Body
        ctx.beginPath();
        ctx.moveTo(x, y - 9 * scale);
        ctx.lineTo(x, y - 4 * scale);
        ctx.stroke();

        // Arms
        let armY = y - 8 * scale;
        if (this.state === 'CHEERING') {
            // Arms up cheer
            ctx.beginPath();
            ctx.moveTo(x - 4 * scale, armY - 5 * scale);
            ctx.lineTo(x, armY);
            ctx.lineTo(x + 4 * scale, armY - 5 * scale);
            ctx.stroke();
        } else {
            // Normal reach
            ctx.beginPath();
            ctx.moveTo(x - 5 * scale, armY + 2 * scale);
            ctx.lineTo(x, armY);
            ctx.lineTo(x + 5 * scale, armY + 2 * scale);
            ctx.stroke();
        }

        // Legs
        if (this.state === 'WALKING') {
            let legOffset = Math.sin(this.frame) * 4 * scale;
            ctx.beginPath();
            ctx.moveTo(x, y - 4 * scale);
            ctx.lineTo(x + legOffset, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - 4 * scale);
            ctx.lineTo(x - legOffset, y);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(x, y - 4 * scale);
            ctx.lineTo(x - 2.5 * scale, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - 4 * scale);
            ctx.lineTo(x + 2.5 * scale, y);
            ctx.stroke();
        }

        this.bullets.forEach(b => b.draw(ctx));
    }
}

class StickFigureBullet {
    constructor(x, y, target, parent) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.parent = parent;
        this.isDead = false;
        this.speed = 450;
    }

    update(dt) {
        if (!this.target || this.target.isDead) {
            this.isDead = true;
            if (this.parent.state === 'SHOOTING') {
                this.parent.state = 'WALKING';
                this.parent.timer = 0;
            }
            return;
        }

        let tx = this.target.x + this.target.width / 2;
        let ty = this.target.y + this.target.height / 2;
        let dx = tx - this.x;
        let dy = ty - this.y;
        let dist = Math.hypot(dx, dy);
        
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;

        // Check proximity to "hit"
        if (dist < 15) {
            this.isDead = true;
            this.parent.state = 'CHEERING';
            this.parent.timer = 0;
        }
        
        if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) {
            this.isDead = true;
            if (this.parent.state === 'SHOOTING') {
                 this.parent.state = 'WALKING';
                 this.parent.timer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = "#111";
        ctx.fillRect(this.x, this.y, 1, 1);
    }
}

class Tiger {
    constructor(x, y, duckSpeed) {
        this.width = 40;
        this.height = 40;
        this.x = x;
        this.y = y;
        this.vy = Math.abs(duckSpeed) * 0.1; // Falls at 10% of duck's speed
        this.isDead = false;
        this.particles = null;
    }

    update(dt) {
        if (!this.isDead) {
            this.y += this.vy * dt;
        } else {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) {
                    this.y = 9999;
                }
            } else {
                this.y = 9999;
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        let p = 4;
        ctx.fillStyle = '#ff9800'; // Orange base
        ctx.fillRect(-4 * p, -3 * p, 8 * p, 6 * p); // head

        ctx.fillStyle = '#000'; // stripes
        ctx.fillRect(-4 * p, -3 * p, 2 * p, p);
        ctx.fillRect(2 * p, -3 * p, 2 * p, p);
        ctx.fillRect(-2 * p, -p, 4 * p, p);

        ctx.fillStyle = '#fff'; // eyes
        ctx.fillRect(-3 * p, 0, p, p);
        ctx.fillRect(2 * p, 0, p, p);

        ctx.fillStyle = '#000'; // pupils
        ctx.fillRect(-2 * p, 0, p * .5, p);
        ctx.fillRect(2.5 * p, 0, p * .5, p);

        ctx.fillStyle = '#fff'; // muzzle
        ctx.fillRect(-2 * p, 2 * p, 4 * p, 2 * p);
        ctx.fillStyle = '#f44336'; // nose
        ctx.fillRect(-p, 2 * p, 2 * p, p);

        ctx.restore();
    }
}


class EaglePowerUp {
    constructor(x, y, duckSpeed) {
        this.width = 60;
        this.height = 60;
        this.x = x;
        this.y = y;
        this.vy = Math.max(50, Math.abs(duckSpeed) * 0.1);
        this.isDead = false;
        this.particles = null;
    }

    update(dt) {
        if (!this.isDead) {
            this.y += this.vy * dt;
        } else {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.y = 9999;
            } else {
                this.y = 9999;
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        let timestamp = performance.now();
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Flashing effect: 5Hz (200ms cycle)
        const isFlash = Math.floor(timestamp / 100) % 2 === 0;
        if (isFlash) {
            ctx.filter = 'sepia(1) saturate(5) brightness(1.2)'; // Gold tint
            ctx.globalAlpha = 0.5;
        }

        let p = 4;
        // Flap animation
        let flap = Math.sin(timestamp / 100) * 10;

        // Draw Wings (White)
        ctx.fillStyle = "#ffffff";
        // Left Wing
        ctx.beginPath();
        ctx.moveTo(-4 * p, 0);
        ctx.lineTo(-12 * p, -10 * p + flap);
        ctx.lineTo(-12 * p, 5 * p + flap);
        ctx.closePath();
        ctx.fill();
        // Right Wing
        ctx.beginPath();
        ctx.moveTo(4 * p, 0);
        ctx.lineTo(12 * p, -10 * p + flap);
        ctx.lineTo(12 * p, 5 * p + flap);
        ctx.closePath();
        ctx.fill();

        // Draw Money Stack (Green)
        ctx.fillStyle = "#4caf50"; // Main green
        ctx.fillRect(-6 * p, -4 * p, 12 * p, 8 * p);
        
        // Darker green edges/shadow
        ctx.fillStyle = "#2e7d32";
        ctx.fillRect(-6 * p, 2 * p, 12 * p, 2 * p); // Bottom edge
        ctx.fillRect(4 * p, -4 * p, 2 * p, 8 * p); // Right edge
        
        // White details (Highlights/Lines for bills)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(-4 * p, -2 * p, 8 * p, 1 * p);
        ctx.fillRect(-4 * p, 1 * p, 8 * p, 1 * p);
        
        // Dollar sign center
        ctx.fillStyle = "#ffffff";
        ctx.font = `${6 * p}px 'Press Start 2P', cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 0);

        ctx.restore();
    }
}

class HotdogPowerUp {
    constructor(x, y, duckSpeed) {
        this.width = 60;
        this.height = 30;
        this.x = x;
        this.y = y;
        this.vy = Math.max(50, Math.abs(duckSpeed) * 0.1);
        this.isDead = false;
        this.particles = null;
    }

    update(dt) {
        if (!this.isDead) {
            this.y += this.vy * dt;
        } else {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.y = 9999;
            } else {
                this.y = 9999;
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }
        let timestamp = performance.now();
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Flashing effect: 5Hz (200ms cycle)
        const isFlash = Math.floor(timestamp / 100) % 2 === 0;
        if (isFlash) {
            ctx.filter = 'sepia(1) saturate(5) brightness(1.2)'; // Gold tint
            ctx.globalAlpha = 0.5;
        }

        let p = 4;
        // Flap animation
        let flap = Math.sin(timestamp / 100) * 10;

        // Draw Wings (White)
        ctx.fillStyle = "#ffffff";
        // Left Wing
        ctx.beginPath();
        ctx.moveTo(-4 * p, 0);
        ctx.lineTo(-12 * p, -10 * p + flap);
        ctx.lineTo(-12 * p, 5 * p + flap);
        ctx.closePath();
        ctx.fill();
        // Right Wing
        ctx.beginPath();
        ctx.moveTo(4 * p, 0);
        ctx.lineTo(12 * p, -10 * p + flap);
        ctx.lineTo(12 * p, 5 * p + flap);
        ctx.closePath();
        ctx.fill();

        if (!isFlash) {
            ctx.globalAlpha = 0.9;
        }
        
        // Bun top
        ctx.fillStyle = '#c8860a';
        ctx.fillRect(-7*p, -4*p, 14*p, 3*p);
        // Bun inner (lighter)
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(-6*p, -3*p, 12*p, 2*p);
        // Sausage
        ctx.fillStyle = '#b94040';
        ctx.fillRect(-6*p, -1*p, 12*p, 2*p);
        // Sausage highlight
        ctx.fillStyle = '#e06060';
        ctx.fillRect(-5*p, -1*p, 10*p, 1*p);
        // Mustard squiggle
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(-4*p, 0, 2*p, 1*p);
        ctx.fillRect(-1*p, 0, 2*p, 1*p);
        ctx.fillRect(2*p, 0, 2*p, 1*p);
        // Bun bottom
        ctx.fillStyle = '#c8860a';
        ctx.fillRect(-7*p, 1*p, 14*p, 3*p);

        ctx.restore();
    }
}

class Car {
    constructor(w = 80, h = 45) {
        this.width = w;
        this.height = h;
        this.x = canvas.width - this.width - 40;
        this.y = -100;
        this.vy = 80; // Slowly fall
        this.targetGroundY = canvas.height - 85 - 20; // 20px above HUD
        this.reachedGround = false;
        this.isAnimating = false;
        this.bounceTimer = 0;
        this.isBouncingUp = true;
    }

    update(dt) {
        if (!this.reachedGround) {
            this.y += this.vy * dt;
            if (this.y + this.height >= this.targetGroundY) {
                this.y = this.targetGroundY - this.height;
                this.reachedGround = true;
                this.isAnimating = true;
                playSound(boomBuffer, 1.0); // Loud thump
            }
        } else if (this.isAnimating) {
            // Perform exactly one bounce animation
            if (this.isBouncingUp) {
                this.bounceTimer += dt * 4;
                if (this.bounceTimer >= 1) {
                    this.bounceTimer = 1;
                    this.isBouncingUp = false;
                }
            } else {
                this.bounceTimer -= dt * 4;
                if (this.bounceTimer <= 0) {
                    this.bounceTimer = 0;
                    this.isAnimating = false; // Stay there permanently
                    playSound(boomBuffer, 1.0); // Final thump
                }
            }
        }
    }

    draw(ctx) {
        let bounceOffset = this.reachedGround ? -this.bounceTimer * 20 : 0;
        let dx = this.x;
        let dy = this.y + bounceOffset;
        
        let sx = this.width / 80;
        let sy = this.height / 45;

        ctx.fillStyle = "#757575"; // Gray car body
        ctx.fillRect(dx, dy + 15 * sy, 80 * sx, 20 * sy); // main base
        ctx.fillRect(dx + 15 * sx, dy + 5 * sy, 50 * sx, 15 * sy); // cabin
        
        ctx.fillStyle = "#212121"; // Wheels
        ctx.fillRect(dx + 10 * sx, dy + 30 * sy, 15 * sx, 15 * sy);
        ctx.fillRect(dx + 55 * sx, dy + 30 * sy, 15 * sx, 15 * sy);
        
        ctx.fillStyle = "#B3E5FC"; // Light blue windows
        ctx.fillRect(dx + 20 * sx, dy + 8 * sy, 18 * sx, 9 * sy);
        ctx.fillRect(dx + 42 * sx, dy + 8 * sy, 18 * sx, 9 * sy);
        
        ctx.fillStyle = "#FFD600"; // Headlights
        ctx.fillRect(dx + 75 * sx, dy + 20 * sy, 5 * sx, 5 * sy);
    }
}

class SeekingMissile {
    constructor(x, y, targetDuck) {
        this.x = x;
        this.y = y;
        this.targetDuck = targetDuck;
        this.isDead = false;
        this.fullyDead = false;
        this.particles = null;
        // Elliptical path oscillation tracking
        this.age = 0;
        this.ellipsePhase = Math.random() * Math.PI * 2; // random start phase
        this.ellipseAmp = 30 + Math.random() * 40;       // horizontal wobble amount
        this.speed = 400; // 2x duck's base speed
        this.lastSpeedBump = 0;
    }

    update(dt) {
        if (this.isDead) {
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.fullyDead = true;
            } else {
                this.fullyDead = true;
            }
            return;
        }

        this.age += dt;
        
        // Increase speed by 10% every 100ms
        while (this.age - this.lastSpeedBump >= 0.1) {
            this.speed *= 1.1;
            this.lastSpeedBump += 0.1;
        }

        // If target is gone, retarget a new alive duck
        if (!this.targetDuck || this.targetDuck.isDead) {
            let aliveDucks = gameState.ducks.filter(d => !d.isDead);
            if (aliveDucks.length > 0) {
                this.targetDuck = aliveDucks[Math.floor(Math.random() * aliveDucks.length)];
            } else {
                // No ducks left, fly off screen
                this.y -= this.speed * dt;
                if (this.y < -100) this.fullyDead = true;
                return;
            }
        }

        let tx = this.targetDuck.x + this.targetDuck.width / 2;
        let ty = this.targetDuck.y + this.targetDuck.height / 2;

        let dx = tx - this.x;
        let dy = ty - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 40) {
            // Hit!
            this.targetDuck.die(gameState.character);
            addScore(500, this.targetDuck.x + this.targetDuck.width / 2, this.targetDuck.y);
            gameState.killCount++;
            gameState.sessionKills++;
            this.isDead = true;
            // Small rocket explosion
            this.particles = [];
            for (let i = 0; i < 15; i++) {
                this.particles.push({
                    x: this.x, y: this.y,
                    vx: (Math.random() - 0.5) * 300,
                    vy: (Math.random() - 0.5) * 300,
                    size: 3 + Math.random() * 5,
                    life: 0.3 + Math.random() * 0.3,
                    color: ['#f44336', '#ff9800', '#ffffff'][Math.floor(Math.random() * 3)]
                });
            }
            return;
        }

        // Move toward target with elliptical wobble perpendicular to direction
        let nx = dx / dist;
        let ny = dy / dist;
        // Perpendicular
        let px = -ny;
        let py = nx;
        let wobble = Math.sin(this.age * 6 + this.ellipsePhase) * this.ellipseAmp;

        this.x += (nx * this.speed + px * wobble) * dt;
        this.y += (ny * this.speed + py * wobble) * dt;
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        // Rotate toward target
        let angle = 0;
        if (this.targetDuck && !this.targetDuck.isDead) {
            let tx = this.targetDuck.x + this.targetDuck.width / 2;
            let ty = this.targetDuck.y + this.targetDuck.height / 2;
            angle = Math.atan2(ty - this.y, tx - this.x) + Math.PI / 2;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        let p = 3;
        // Body - white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-p, -3*p, 2*p, 6*p);
        // Nose cone - red
        ctx.fillStyle = '#f44336';
        ctx.fillRect(-p, -5*p, 2*p, 2*p);
        // Red stripe
        ctx.fillStyle = '#f44336';
        ctx.fillRect(-p, 0, 2*p, p);
        // Fins - red
        ctx.fillRect(-3*p, 2*p, 2*p, 2*p); // left fin
        ctx.fillRect(p, 2*p, 2*p, 2*p);    // right fin
        // Exhaust glow
        ctx.fillStyle = '#ff9800';
        ctx.fillRect(-p+1, 3*p, 2*p-2, p);

        ctx.restore();
    }
}
class Projectile {
    constructor(startX, startY, targetX, targetY, targetDuck, hitSun, targetAirplane = null, targetTiger = null, targetEagle = null, isGreen = false, targetBomber = null, hitDetails = null, targetDrivingEnemy = null) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.targetDuck = targetDuck;
        this.targetAirplane = targetAirplane;
        this.targetTiger = targetTiger;
        this.targetEagle = targetEagle;
        this.targetBomber = targetBomber;
        this.targetDrivingEnemy = targetDrivingEnemy;
        this.hitDetails = hitDetails;
        this.isGreen = isGreen;
        this.hitSun = hitSun;
        this.timeElapsed = 0;
        this.timeTotal = 0.1; // 100ms flight time
        this.isDead = false;
        this.fullyDead = false;
        this.x = startX;
        this.y = startY;
        this.particles = null;
    }

    update(dt) {
        if (this.isDead) {
            // Update miss particles
            if (this.particles) {
                let allDead = true;
                this.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life > 0) allDead = false;
                });
                if (allDead) this.fullyDead = true;
            } else {
                this.fullyDead = true;
            }
            return;
        }

        this.timeElapsed += dt;
        let t = Math.min(1.0, this.timeElapsed / this.timeTotal);
        let currentX = this.startX + (this.targetX - this.startX) * t;
        let currentY = this.startY + (this.targetY - this.startY) * t;

        // Triple shots uniquely check for collisions dynamically while flying
        if (this.isGreen && !this.targetDuck && !this.targetAirplane && !this.targetTiger && !this.targetEagle && !this.hitSun && !this.targetDrivingEnemy) {
            for (let i = gameState.ducks.length - 1; i >= 0; i--) {
                const duck = gameState.ducks[i];
                if (!duck.isDead && !duck.isTargeted &&
                    currentX >= duck.x && currentX <= duck.x + duck.width &&
                    currentY >= duck.y && currentY <= duck.y + duck.height) {

                    this.targetDuck = duck;
                    duck.isTargeted = true;
                    // Force immediate impact at this location
                    this.targetX = currentX;
                    this.targetY = currentY;
                    this.timeElapsed = this.timeTotal;
                    break;
                }
            }
        }

        if (this.timeElapsed >= this.timeTotal) {
            this.impact();
            this.isDead = true;
        }
    }

    impact() {
        if (this.hitSun || (this.targetDuck && !this.targetDuck.isDead) || (this.targetAirplane && !this.targetAirplane.isDead) || (this.targetTiger && !this.targetTiger.isDead) || (this.targetEagle && !this.targetEagle.isDead) || (this.targetBomber && !this.targetBomber.isDead) || (this.targetDrivingEnemy && !this.targetDrivingEnemy.isDead)) {
            flashScreen(); // Impact flash ONLY on hits!
        }

        // Check hits on boss projectiles (2x larger hitbox)
        for (let i = gameState.bossProjectiles.length - 1; i >= 0; i--) {
            let p = gameState.bossProjectiles[i];
            let dist = Math.hypot(this.targetX - p.x, this.targetY - p.y);
            // Size is the visual diameter. Use size (radius*2) for a generous 2x hitbox
            if (dist < p.size + 20) {
                p.isDead = true;
                p.fullyDead = true;
                gameState.ammo++; // Successfully hit boss projectile grants another bullet
                playSound(snickerBuffer, 0.5);
                break;
            }
        }

        if (this.hitSun) {
            let isRadioActive = gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled';
            let bopY = isRadioActive ? Math.sin(performance.now() / 150) * 4 : 0;
            let sunX = 40;
            let sunY = 40 + bopY;
            let sunRadius = 20;

            // Solar blast visual
            this.particles = [];
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    x: sunX, y: sunY,
                    vx: (Math.random() - 0.5) * 600,
                    vy: (Math.random() - 0.5) * 600,
                    size: 2 + Math.random() * 4, // Scaled down particles
                    life: 0.6 + Math.random() * 0.4,
                    color: ['#ffeb3b', '#ff9800', '#f44336'][Math.floor(Math.random() * 3)]
                });
            }
            playSound(boomBuffer, 0.4);

            // Car spawn logic
            if (gameState.perfectRounds >= 4 && gameState.cars.length < 5) {
                gameState.sunClicksPostRings++;
                let threshold = (gameState.cars.length === 0) ? 10 : 20;
                if (gameState.sunClicksPostRings >= threshold) {
                    gameState.isSunWinking = true;
                    // Proportional growth to max 200x50
                    let p = gameState.cars.length; 
                    let nw = 80 + p * 30; // 80 to 200
                    let nh = 45 + p * 1.25; // 45 to 50
                    gameState.cars.push(new Car(nw, nh));
                    gameState.sunClicksPostRings = 0;
                }
            }

            gameState.ducks.forEach(duck => {
                let dx = (duck.x + duck.width / 2) - sunX;
                let dy = (duck.y + duck.height / 2) - sunY;
                let dist = Math.hypot(dx, dy);
                if (!duck.isDead && dist <= sunRadius) {
                    duck.die(gameState.character);
                    addScore(500, duck.x + duck.width / 2, duck.y);
                    gameState.killCount++;
                    gameState.sessionKills++;
                    playQuack(duck.level);
                }
            });
            updateUI();
        }

        if (this.targetDrivingEnemy && !this.targetDrivingEnemy.isDead) {
            this.targetDrivingEnemy.die();
            updateUI();
        }

        if (this.targetDuck && !this.targetDuck.isDead) { // Ensure it wasn't destroyed
            let duck = this.targetDuck;
            duck.die(gameState.character);
            addScore(500, duck.x + duck.width / 2, duck.y);
            gameState.killCount++;
            gameState.sessionKills++;

            // Play quack explicitly tailored to duck's difficulty level
            playQuack(duck.level);

            // Gain a bullet for every 2 kills in a round
            if (gameState.sessionKills % 2 === 0) {
                gameState.ammo++;
            }

            // If level 3 or higher, perform the split
            if (duck.level >= 3) {
                let splitLevel = duck.level - 2;
                gameState.ducks.push(new Duck(splitLevel, duck.x, duck.y, true));
                gameState.ducks.push(new Duck(splitLevel, duck.x + duck.width / 2, duck.y, true));
                gameState.ammo++; // Extra bullet for shooting a splitting duck!
            }

            // Tiger drop object with 30% chance for levels > 3
            if (duck.level > 3 && Math.random() < 0.3) {
                // Determine duck falling speed magnitude
                let duckSpeed = Math.hypot(duck.vx, duck.vy);
                gameState.tigers.push(new Tiger(duck.x, duck.y, duckSpeed));
            }

            // Eagle drop with 5% chance
            if (Math.random() < 0.05) {
                let duckSpeed = Math.hypot(duck.vx, duck.vy);
                gameState.eagles.push(new EaglePowerUp(duck.x, duck.y, duckSpeed));
            }
            // Hotdog drop with 5% chance (independent of eagle)
            if (Math.random() < 0.05) {
                let duckSpeed = Math.hypot(duck.vx, duck.vy);
                gameState.hotdogs.push(new HotdogPowerUp(duck.x, duck.y, duckSpeed));
            }

            updateUI();
        } else if (this.targetAirplane && !this.targetAirplane.isDead) { // Airplane Hit!
            playSound(wompBuffer);
            this.targetAirplane.isDead = true;
            addScore(500, this.targetAirplane.x + this.targetAirplane.width / 2, this.targetAirplane.y);
            gameState.ammo += 5; // Reward
            gameState.airplanesKilled++;

            if (gameState.round >= 30) {
                // 50% chance to restore a life if below the maximum of 5
                if (Math.random() < 0.5 && gameState.lives < 5) {
                    gameState.lives++;
                    playSound(jingleBuffer, 0.8);
                }
            }

            updateUI();

            let particles = [];
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: this.targetAirplane.x + this.targetAirplane.width / 2,
                    y: this.targetAirplane.y + this.targetAirplane.height / 2,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200,
                    size: 4 + Math.random() * 6,
                    life: 0.3 + Math.random() * 0.3,
                    color: ['#ccc', '#f44336', '#ffeb3b'][Math.floor(Math.random() * 3)]
                });
            }
            this.targetAirplane.particles = particles;

        } else if (this.targetTiger && !this.targetTiger.isDead) { // Tiger Hit!
            playSound(snickerBuffer); // play funny sound
            this.targetTiger.isDead = true;
            addScore(1000, this.targetTiger.x + this.targetTiger.width / 2, this.targetTiger.y);
            gameState.tigersKilled++;
            if (gameState.tigersKilled % 10 === 0 && gameState.lives < 5) {
                gameState.lives++;
                playSound(jingleBuffer, 0.8);
                updateUI();
            }

            let particles = [];
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: this.targetTiger.x + this.targetTiger.width / 2,
                    y: this.targetTiger.y + this.targetTiger.height / 2,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200,
                    size: 4 + Math.random() * 6,
                    life: 0.3 + Math.random() * 0.3,
                    color: ['#ff9800', '#000000', '#ffffff'][Math.floor(Math.random() * 3)]
                });
            }
            this.targetTiger.particles = particles;

        } else if (this.targetEagle && !this.targetEagle.isDead) { // Eagle Hit!
            playSound(jingleBuffer); // play nice sound
            this.targetEagle.isDead = true;
            gameState.powerUpActive = true;
            gameState.powerUpTimer = 10.0;
            gameState.ammo += 5 //make sure the player can use it, 5 more shots, babyyyy
            gameState.powerUpEndRound = gameState.round + 1; // Until next level
            if (!sirenSource && sirenBuffer) {
                sirenSource = playSound(sirenBuffer, 0.4, true);
            }
            updateUI();

            let particles = [];
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: this.targetEagle.x + this.targetEagle.width / 2,
                    y: this.targetEagle.y + this.targetEagle.height / 2,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200,
                    size: 4 + Math.random() * 6,
                    life: 0.3 + Math.random() * 0.3,
                    color: ['#795548', '#ffffff', '#ffeb3b'][Math.floor(Math.random() * 3)]
                });
            }
            this.targetEagle.particles = particles;
        } else if (this.targetBomber && !this.targetBomber.isDead) { // Bomber or Boss Hit!
            if (this.targetBomber.isBoss) {
                let boss = this.targetBomber;
                let details = this.hitDetails || {};

                // Check if it's the BigHeadBoss (has engines) vs UncleanOneBoss (has segments)
                if (boss.engines !== undefined && details.hitEngineIndex !== undefined) {
                    boss.engines[details.hitEngineIndex] = false;
                    boss.hp -= 5;
                    gameState.ammo += 2; // +2 bullets per engine shot
                    playSound(boomBuffer, 0.6);
                } else if (details.hitHead && boss.engines !== undefined) {
                    // Check if all engines are dead
                    if (boss.engines.every(e => !e)) {
                        boss.hp -= 5;
                        boss.speedMult *= 1.1;
                        boss.fireRateMult *= 1.2;
                        playSound(wompBuffer, 0.8);
                    } else {
                        // Deflection feedback
                        playSound(deflectBuffer, 1.0);
                        boss.shieldFlash = 0.5; // Flash shield for 0.5s
                        gameState.floatingTexts.push({
                            x: boss.x + boss.width / 2,
                            y: boss.y - 30,
                            text: "ARMORED HEAD",
                            timer: 2.0,
                            life: 2.0,
                            color: "#00ffff",
                            size: 20
                        });
                    }
                } else if (details.hitSegment) {
                    const seg = details.hitSegment;
                    if (seg === 'hands') {
                        boss.segments.hands.hp -= 10;
                        boss.hp -= 10;
                        boss.handsFlash = 0.2;
                        boss.flashColor = "red";
                        boss.painTimer = 0.3;
                        if (boss.segments.hands.hp <= 0) {
                            boss.segments.hands.alive = false;
                            playSound(boomBuffer, 0.8);
                        }
                    } else if (seg === 'protected' || seg === 'protected_body') {
                        // Force protection animation
                        playSound(deflectBuffer, 1.0);
                        boss.shieldFlash = 0.5;
                        boss.protectTimer = 0.8; 
                        boss.protectX = details.hitX || boss.x;
                        boss.protectY = details.hitY || boss.y;
                        
                        // Flash segment gray when protected
                        if (seg === 'protected') boss.handsFlash = 0.2;
                        else boss.bodyFlash = 0.2;
                        boss.flashColor = "gray";

                        let text = seg === 'protected' ? "HANDS PROTECT!" : "BODY PROTECTS!";
                        gameState.floatingTexts.push({
                            x: details.hitX || boss.x,
                            y: (details.hitY || boss.y) - 30,
                            text: text,
                            timer: 1.5,
                            life: 1.5,
                            color: "#00ffff",
                            size: 20
                        });
                    } else {
                        // Body or Head hit logic
                        boss.segments[seg].hp -= 10;
                        boss.hp -= 10;
                        if (seg === 'body') boss.bodyFlash = 0.2;
                        if (seg === 'head') boss.headFlash = 0.2;
                        boss.flashColor = "red";
                        boss.painTimer = 0.3;
                        if (boss.segments[seg].hp <= 0) {
                            boss.segments[seg].alive = false;
                            playSound(boomBuffer, 0.8);
                        }
                    }
                }
                updateUI();
                return; // CRITICAL: Stop here for Boss hit. Don't fall through to death logic!
            } else {
                this.targetBomber.isDead = true;
                if (this.targetBomber.rumbleSource) {
                    try { this.targetBomber.rumbleSource.stop(); } catch(e){}
                }
                playSound(boomBuffer, 1.0);
                
                // Trigger global stats for Sun's PDF notifications
                if (typeof incrementGlobalBomberKills === 'function') {
                    incrementGlobalBomberKills();
                }
            }
            
            // Play triumphant melody for 2 seconds
            let melody = playSound(cheerfulBuffer, 0.8, true);
            setTimeout(() => { if(melody) melody.stop(); }, 2000);

            // Kill only ducks below level 3 and reward 2x points
            let bonusTotal = 0;
            gameState.ducks.forEach(duck => {
                if (!duck.isDead && duck.level < 3) {
                    duck.die(gameState.character);
                    bonusTotal += 500 * (gameState.character === 3 ? 1.2 : 1.0);
                    gameState.killCount++;
                    gameState.sessionKills++;
                }
            });
            
            let bW = this.targetBomber.currentWidth || this.targetBomber.width;
            let bH = this.targetBomber.currentHeight || this.targetBomber.height;

            if (bonusTotal > 0) {
                addScore(bonusTotal * 2, this.targetBomber.x + bW / 2, this.targetBomber.y);
            } else {
                addScore(2000, this.targetBomber.x + bW / 2, this.targetBomber.y);
            }

            // Explosion particles
            let particles = [];
            for (let i = 0; i < 40; i++) {
                particles.push({
                    x: this.targetBomber.x + bW / 2,
                    y: this.targetBomber.y + bH / 2,
                    vx: (Math.random() - 0.5) * 400,
                    vy: (Math.random() - 0.5) * 400,
                    size: 5 + Math.random() * 8,
                    life: 0.5 + Math.random() * 0.5,
                    color: ['#000', '#f44336', '#ff9800'][Math.floor(Math.random() * 3)]
                });
            }
            this.targetBomber.particles = particles;
            updateUI();

        } else if (!this.hitSun && !this.targetDuck && !this.targetAirplane && !this.targetTiger && !this.targetEagle && !this.targetBomber) {
            // Missed everything (Puff of purple smoke)
            this.particles = [];
            for (let p = 0; p < 15; p++) {
                this.particles.push({
                    x: this.targetX,
                    y: this.targetY,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200,
                    size: 3 + Math.random() * 5,
                    life: 0.2 + Math.random() * 0.3, // very short burst
                    color: '#9c27b0' // matching opaque purple
                });
            }

            if (gameState.ammo >= 0) {
                playSound(wompBuffer, 0.5);
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            if (this.particles) {
                this.particles.forEach(p => {
                    if (p.life > 0) {
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(0, p.life);
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    }
                });
                ctx.globalAlpha = 1.0;
            }
            return;
        }

        let t = this.timeElapsed / this.timeTotal;
        let targetX = this.targetX;
        let targetY = this.targetY;

        // Dynamically track flying duck/plane/tiger if targeted
        if (this.targetDuck && !this.targetDuck.isDead) {
            targetX = this.targetDuck.x + this.targetDuck.width / 2;
            targetY = this.targetDuck.y + this.targetDuck.height / 2;
        } else if (this.targetAirplane && !this.targetAirplane.isDead) {
            targetX = this.targetAirplane.x + this.targetAirplane.width / 2;
            targetY = this.targetAirplane.y + this.targetAirplane.height / 2;
        } else if (this.targetTiger && !this.targetTiger.isDead) {
            targetX = this.targetTiger.x + this.targetTiger.width / 2;
            targetY = this.targetTiger.y + this.targetTiger.height / 2;
        } else if (this.targetEagle && !this.targetEagle.isDead) {
            targetX = this.targetEagle.x + this.targetEagle.width / 2;
            targetY = this.targetEagle.y + this.targetEagle.height / 2;
        } else if (this.targetBomber && !this.targetBomber.isDead) {
            // Track the boss position for smooth flight
            let bW = this.targetBomber.currentWidth || this.targetBomber.width;
            let bH = this.targetBomber.currentHeight || this.targetBomber.height;
            targetX = this.targetBomber.x + bW / 2;
            targetY = this.targetBomber.y + bH / 2;
        }

        let currentX = this.startX + (targetX - this.startX) * t;
        let currentY = this.startY + (targetY - this.startY) * t;

        let trailLength = 60;
        let dist = Math.hypot(targetX - this.startX, targetY - this.startY);
        let ratio = trailLength / dist;
        if (ratio > t) ratio = t; // don't draw trail longer than travelled distance

        let tailX = currentX - (targetX - this.startX) * ratio;
        let tailY = currentY - (targetY - this.startY) * ratio;

        ctx.strokeStyle = this.isGreen ? "rgba(139, 195, 74, 1.0)" : "rgba(156, 39, 176, 1.0)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        ctx.fillStyle = this.isGreen ? "rgba(180, 240, 180, 1.0)" : "#ffffff";
        ctx.beginPath();
        ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

let lastShotTime = 0;
let currentAimAngle = 45 * Math.PI / 180;
let currentAimX = 200;
let currentAimY = 200;

canvas.addEventListener('mousemove', (e) => {
    let rect = canvas.getBoundingClientRect();
    currentAimX = e.clientX - rect.left;
    currentAimY = e.clientY - rect.top;
});

canvas.addEventListener('touchmove', (e) => {
    let rect = canvas.getBoundingClientRect();
    if (e.touches.length > 0) {
        currentAimX = e.touches[0].clientX - rect.left;
        currentAimY = e.touches[0].clientY - rect.top;
    }
}, { passive: true });

// Input Handling (Touch and Click)
function handleShoot(event) {
    if (gameState.phase === 'START' || gameState.phase === 'GAME_OVER' || gameState.phase === 'WIN') return; // Don't allow shooting during these phases

    const now = performance.now();
    if (now - lastShotTime < 100) return; // Prevent double-fire from overlapping events
    lastShotTime = now;

    if (gameState.ammo <= 0) return;

    // Get click/touch coordinates
    let rect = canvas.getBoundingClientRect();
    let x, y;

    if (event.type === 'touchstart') {
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
    } else if (event.type === 'keydown') {
        x = currentAimX;
        y = currentAimY;
    } else {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    }

    // Portrait hack: 13 clicks triggers win
    let hackBoxY = canvas.height - 85 - 15 * 4 - 20;
    if (x >= 10 && x <= 10 + 16 * 4 + 20 && y >= hackBoxY && y <= hackBoxY + 15 * 4 + 20) {
        gameState.portraitClicks++;

        if (gameState.portraitClicks === 3) {
            // Spawn Eagle at top middle of the screen
            gameState.eagles.push(new EaglePowerUp(canvas.width / 2 - 40, 0, 500));
        }

        if (gameState.portraitClicks === 6) {
            // Spawn Hotdog at top middle of the screen
            gameState.hotdogs.push(new HotdogPowerUp(canvas.width / 2 - 30, 0, 500));
        }

        if (gameState.portraitClicks >= 13) {
            triggerWin();
            return;
        }
    }

    let shots = [{ offsetX: 0, offsetY: 0 }];
    if (gameState.powerUpActive) {
        shots.push({ offsetX: -40, offsetY: 0 });
        shots.push({ offsetX: 40, offsetY: 0 });
        playSound(boomBuffer, 0.7);
    }

    // Spawn Projectile from Gun Muzzle
    let dSize = 4;
    let uiYOffset = 85;
    let bgBoxX = 10;
    let bgBoxW = 16 * dSize + 20;
    let gunX = bgBoxX + bgBoxW + 20;
    let gunY = canvas.height - uiYOffset + 10;
    let barrelLen = 31 * dSize;

    // Calculate dynamic rotation angle based on where user clicked
    currentAimAngle = Math.atan2(y - gunY, x - gunX) + Math.PI / 2;

    let muzzleLocalX = 5 * dSize;
    let muzzleLocalY = -barrelLen - 4 * dSize;

    let startX = gunX + muzzleLocalX * Math.cos(currentAimAngle) - muzzleLocalY * Math.sin(currentAimAngle);
    let startY = gunY + muzzleLocalX * Math.sin(currentAimAngle) + muzzleLocalY * Math.cos(currentAimAngle);

    // Hotdog power-up: fire a duck-seeking missile at a random living duck (placed here so startX/startY are valid)
    if (gameState.hotdogPowerUpActive && gameState.seekingMissiles.filter(m => !m.isDead).length < 4) {
        // Pick any alive duck as target (regardless of isTargeted)
        let aliveDucks = gameState.ducks.filter(d => !d.isDead);
        if (aliveDucks.length > 0) {
            let target = aliveDucks[Math.floor(Math.random() * aliveDucks.length)];
            gameState.seekingMissiles.push(new SeekingMissile(startX, startY, target));
        }
    }

    shots.forEach(offset => {
        let currentX = x + offset.offsetX;
        let currentY = y + offset.offsetY;

        let hitDuck = null;
        let hitAirplane = null;
        let hitTiger = null;
        let hitEagle = null;
        let hitBomber = null;
        let hitSun = false;

        let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        let isRadioActive = gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled';
        let bopY = isRadioActive ? Math.sin(performance.now() / 150) * 4 : 0;
        let hitDetails = null;
        let hitDrivingEnemy = null;

        if (gameState.drivingMode) {
            for (let i = gameState.drivingMode.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.drivingMode.enemies[i];
                if (!enemy.isDead && Math.abs(currentX - enemy.x) <= enemy.size / 2 + 10 &&
                    Math.abs(currentY - enemy.y) <= enemy.size / 2 + 10) {
                    hitDrivingEnemy = enemy;
                    break;
                }
            }
        }

        if (currentLevel >= 4 && Math.abs(currentX - 40) <= 30 && Math.abs(currentY - (40 + bopY)) <= 30) {
            hitSun = true;
        }

        if (!hitSun) {
            for (let i = gameState.hotdogs.length - 1; i >= 0; i--) {
                const hdog = gameState.hotdogs[i];
                if (!hdog.isDead && Math.abs(currentX - (hdog.x + hdog.width / 2)) <= hdog.width / 2 &&
                    Math.abs(currentY - (hdog.y + hdog.height / 2)) <= hdog.height / 2) {
                    hdog.isDead = true;
                    hdog.particles = [];
                    for (let i = 0; i < 15; i++) {
                        hdog.particles.push({
                            x: hdog.x + hdog.width / 2, y: hdog.y + hdog.height / 2,
                            vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
                            size: 4 + Math.random() * 5, life: 0.4 + Math.random() * 0.3,
                            color: ['#c8860a', '#ffeb3b', '#f5deb3'][Math.floor(Math.random() * 3)]
                        });
                    }
                    gameState.hotdogPowerUpActive = true;
                    gameState.hotdogPowerUpTimer = 10.0;
                    gameState.hotdogPowerUpEndRound = gameState.round + 1;
                    gameState.ammo += 5;
                    if (!cyberpunkSource && cyberpunkBuffer) {
                        cyberpunkSource = playSound(cyberpunkBuffer, 0.6, true);
                    }
                    updateUI();
                    break;
                }
            }

            // Check eagles
            for (let i = gameState.eagles.length - 1; i >= 0; i--) {
                const eagle = gameState.eagles[i];
                if (!eagle.isDead && Math.abs(currentX - (eagle.x + eagle.width / 2)) <= eagle.width / 2 &&
                    Math.abs(currentY - (eagle.y + eagle.height / 2)) <= eagle.height / 2) {
                    hitEagle = eagle;
                    break;
                }
            }

            if (!hitEagle) {
                for (let i = gameState.tigers.length - 1; i >= 0; i--) {
                    const tiger = gameState.tigers[i];
                    if (!tiger.isDead && Math.abs(currentX - (tiger.x + tiger.width / 2)) <= 30 &&
                        Math.abs(currentY - (tiger.y + tiger.height / 2)) <= 30) {
                        hitTiger = tiger;
                        break;
                    }
                }
            }

            if (!hitTiger && !hitEagle) {
                for (let i = gameState.heavyBombers.length - 1; i >= 0; i--) {
                    const bomber = gameState.heavyBombers[i];
                    if (!bomber.isDead &&
                        currentX >= bomber.x - bomber.currentWidth / 2 && currentX <= bomber.x + bomber.currentWidth * 1.5 &&
                        currentY >= bomber.y - bomber.currentHeight / 2 && currentY <= bomber.y + bomber.currentHeight * 1.5) {
                        hitBomber = bomber;
                        break;
                    }
                }
            }

            if (!hitTiger && !hitEagle && !hitBomber) {
                for (let i = gameState.ducks.length - 1; i >= 0; i--) {
                    const duck = gameState.ducks[i];
                    if (!duck.isDead && !duck.isTargeted &&
                        currentX >= duck.x && currentX <= duck.x + duck.width &&
                        currentY >= duck.y && currentY <= duck.y + duck.height) {
                        hitDuck = duck;
                        duck.isTargeted = true;
                        break;
                    }
                }
            }

            if (!hitDuck && !hitTiger && !hitEagle && !hitBomber) {
                for (let plane of gameState.airplanes) {
                    if (!plane.isDead &&
                        currentX >= plane.x && currentX <= plane.x + plane.width &&
                        currentY >= plane.y && currentY <= plane.y + plane.height) {
                        hitAirplane = plane;
                        break;
                    }
                }
            }

            if (!hitDuck && !hitTiger && !hitAirplane && !hitEagle && !hitBomber) {
                for (let p of gameState.bossProjectiles) {
                    if (p instanceof PoopProjectile && !p.isDead) {
                        let dx = currentX - p.x;
                        let dy = currentY - p.y;
                        if (Math.sqrt(dx*dx + dy*dy) < p.size / 1.5) {
                            p.hp -= 10;
                            if (p.hp <= 0) {
                                p.isDead = true;
                                p.fullyDead = true;
                                playSound(boomBuffer, 0.4);
                                gameState.score += 500;
                            } else {
                                playSound(quackBuffer, 0.6);
                            }
                            hitDuck = { isDead: true };
                            break;
                        }
                    }
                }
            }

            if (!hitDuck && !hitTiger && !hitAirplane && !hitEagle && !hitBomber && gameState.boss && !gameState.boss.isDead && gameState.boss.isVulnerable) {
                let boss = gameState.boss;
                if (boss.name === "The Unclean One") {
                    let w = boss.width;
                    let h = boss.height;
                    let relX = currentX - boss.x;
                    let relY = currentY - boss.y;
                    if (boss.isUpsideDown) relY = h - relY;

                    hitDetails = { hitX: currentX, hitY: currentY };

                    if (boss.segments.hands.alive) {
                        if (Math.abs(relX) >= w * 0.3 && Math.abs(relX) <= w * 1.1 && relY >= h/4 && relY <= h * 1.1) {
                            hitBomber = boss;
                            hitDetails.hitSegment = 'hands';
                        } else if (Math.abs(relX) <= w * 1.2 && relY >= -h/4 && relY <= h * 1.2) {
                            hitBomber = boss;
                            hitDetails.hitSegment = 'protected';
                        }
                    }
                    
                    if (!hitBomber && boss.segments.body.alive) {
                        if (Math.abs(relX) <= w * 0.4 && relY >= h/4 && relY <= h * 0.9) {
                            hitBomber = boss;
                            hitDetails.hitSegment = 'body';
                        } else if (Math.abs(relX) <= w * 0.4 && relY >= -h/4 && relY < h/4) {
                            hitBomber = boss;
                            hitDetails.hitSegment = 'protected_body';
                        }
                    }
                    
                    if (!hitBomber && boss.segments.head.alive) {
                        if (Math.abs(relX) <= w * 0.3 && relY >= -h * 0.2 && relY <= h * 0.2) {
                            hitBomber = boss;
                            hitDetails.hitSegment = 'head';
                        }
                    }
                } else {
                    let eW = boss.width/5;
                    let eH = boss.height;
                    let enginePositions = [boss.width/6, boss.width/2.6, -boss.width/6, -boss.width/2.6];
                    for (let i = 0; i < 4; i++) {
                        if (boss.engines[i]) {
                            let ex = boss.x + boss.width/2 + enginePositions[i] - eW/2;
                            let ey = boss.y + boss.height/2.5 - eH/2;
                            if (currentX >= ex && currentX <= ex + eW && currentY >= ey && currentY <= ey + eH) {
                                hitBomber = boss;
                                hitDetails = { hitEngineIndex: i };
                                break;
                            }
                        }
                    }

                    if (!hitBomber) {
                        let headSize = 100;
                        let headX = boss.x + boss.width/2 - headSize/2;
                        let headY = boss.y - headSize * 0.7;
                        if (currentX >= headX && currentX <= headX + headSize && currentY >= headY && currentY <= headY + headSize) {
                            hitBomber = boss;
                            hitDetails = { hitHead: true };
                        }
                    }
                }
            }

            // Check buildings
            if (!hitDuck && !hitTiger && !hitAirplane && !hitEagle && !hitBomber) {
                let grassLevel = canvas.height - (canvas.height * 0.12);
                for (let i = gameState.buildings.length - 1; i >= 0; i--) {
                    const b = gameState.buildings[i];
                    let bY = Math.floor(grassLevel - b.height + 5);
                    if (currentX >= b.x && currentX <= b.x + b.width && currentY >= bY && currentY <= bY + b.height) {
                        gameState.baldUntil = performance.now() + 2000;
                        break;
                    }
                }
            }
        }

        gameState.projectiles.push(new Projectile(startX, startY, currentX, currentY, hitDuck, hitSun, hitAirplane, hitTiger, hitEagle, gameState.powerUpActive, hitBomber, hitDetails, hitDrivingEnemy));
    });

    gameState.ammo--;
    updateUI();
}

let gameOverTimer = 0;
let somberSource = null;

function triggerGameOver() {
    gameState.phase = 'GAME_OVER';
    
    // Global presence update
    if (typeof removePlayerPresence === 'function') {
        removePlayerPresence();
    }
    
    // Check for high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('mallard_high_score', gameState.highScore);

        if (typeof updateGlobalBest === 'function') {
            updateGlobalBest(gameState.highScore).then(isNewGlobal => {
                if (isNewGlobal) window.globalHighScore = gameState.highScore;
            });
        }
    }

    gameOverTimer = performance.now();
    if (bgmSource) {
        bgmSource.stop();
        bgmSource.disconnect();
        bgmSource = null;
    }
    if (sirenSource) {
        sirenSource.stop();
        sirenSource.disconnect();
        sirenSource = null;
    }
    if (cyberpunkSource) {
        cyberpunkSource.stop();
        cyberpunkSource.disconnect();
        cyberpunkSource = null;
    }
    somberSource = playSound(somberBuffer, 0.8, true);

    // Clear persistent environment on game over so next start is fresh
    gameState.buildingSnapshot = [];
    gameState.hillSnapshot = [];
    gameState.permanentClouds = [];
    localStorage.removeItem('mallard_buildings');
    localStorage.removeItem('mallard_hills');
    
    // Increment death count
    gameState.deathStreak++;
    localStorage.setItem('mallard_death_streak', gameState.deathStreak);

    // Delay displaying reset button by 2 seconds to absorb the impact
    setTimeout(() => {
        if (gameState.phase === 'GAME_OVER') {
            document.getElementById('reset-btn').style.display = 'block';
        }
    }, 2000);
}

function triggerWin() {
    gameState.phase = 'WIN';

    // Check for high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('mallard_high_score', gameState.highScore);

        if (typeof updateGlobalBest === 'function') {
            updateGlobalBest(gameState.highScore).then(isNewGlobal => {
                if (isNewGlobal) window.globalHighScore = gameState.highScore;
            });
        }
    }

    winTimer = performance.now();
    if (bgmSource) {
        bgmSource.stop();
        bgmSource.disconnect();
        bgmSource = null;
    }
    if (sirenSource) {
        sirenSource.stop();
        sirenSource.disconnect();
        sirenSource = null;
    }
    if (cyberpunkSource) {
        cyberpunkSource.stop();
        cyberpunkSource.disconnect();
        cyberpunkSource = null;
    }
    cheerfulSource = playSound(cheerfulBuffer, 0.8, true);

    // Reset death streak on win
    gameState.deathStreak = 0;
    localStorage.setItem('mallard_death_streak', '0');

    // Delay displaying reset button by 4 seconds
    setTimeout(() => {
        if (gameState.phase === 'WIN') {
            document.getElementById('reset-btn').style.display = 'block';
        }
    }, 4000);
}

canvas.addEventListener('mousedown', handleShoot);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    handleShoot(e);
}, { passive: false });

window.addEventListener('keydown', (e) => {
    // Boss Shortcuts
    if (e.shiftKey) {
        if (e.code === 'Digit1') {
            gameState.round = 14;
            gameState.phase = 'SPAWN';
            if (gameState.boss) gameState.boss = null;
            return;
        }
        if (e.code === 'Digit2') {
            // Ensure game is initialized if skipping from start
            if (gameState.phase === 'START' || gameState.phase === 'GAME_OVER') {
                gameState.lives = 5;
                gameState.score = 0;
                gameState.killCount = 0;
            }
            gameState.round = 24;
            gameState.phase = 'SPAWN';
            if (gameState.boss) gameState.boss = null;
            return;
        }
        if (e.code === 'Digit3') {
            gameState.round = 33;
            gameState.drivingMode = new DrivingMode();
            return;
        }
    }

    const shootKeys = [' ', 'Enter', 'ArrowUp', '5'];
    if (shootKeys.includes(e.key) || e.code === 'Numpad5') {
        if (e.key === ' ' || e.key === 'ArrowUp') e.preventDefault(); // Stop scrolling
        handleShoot({ type: 'keydown' });
    }
});

function updateUI() {
    scoreDisplay.innerText = gameState.score.toString().padStart(6, '0');

    // Update bullets
    ammoDisplay.innerHTML = '';
    if (gameState.ammo > 5) {
        // Display a single bullet followed by "x [ammo]"
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        ammoDisplay.appendChild(bullet);

        const countText = document.createElement('span');
        countText.innerText = ' x ' + gameState.ammo;
        countText.style.color = '#fff';
        countText.style.fontSize = '24px';
        countText.style.fontWeight = 'bold';
        countText.style.marginLeft = '5px';
        countText.style.alignSelf = 'center';
        ammoDisplay.appendChild(countText);
    } else {
        // Display individual bullets
        for (let i = 0; i < gameState.ammo; i++) {
            const bullet = document.createElement('div');
            bullet.className = 'bullet';
            ammoDisplay.appendChild(bullet);
        }
    }

    // Update lives
    const livesDisplay = document.getElementById('lives-display');
    livesDisplay.innerHTML = '';
    if (gameState.lives > 5) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        livesDisplay.appendChild(heart);

        const countText = document.createElement('span');
        countText.innerText = ' x ' + gameState.lives;
        countText.style.color = '#fff';
        countText.style.fontSize = '24px';
        countText.style.fontWeight = 'bold';
        countText.style.textShadow = '2px 2px 0 #000';
        countText.style.marginLeft = '15px';
        countText.style.alignSelf = 'center';
        countText.style.lineHeight = '25px';
        livesDisplay.appendChild(countText);
    } else {
        for (let i = 0; i < gameState.lives; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            if (i === gameState.lives - 1 && gameState.lives < 5) {
                heart.classList.add('pulse');
            }
            livesDisplay.appendChild(heart);
        }
    }
}

let flashFrames = 0;
function flashScreen() {
    if (!gameState.settings.flashing) return;
    flashFrames = 3; // Flash for 3 frames
}

function spawnBuildings(roundNum, isInitial = false) {
    if (!gameState.buildings) gameState.buildings = [];
    
    // Density check: Significant increase for a more "city" feel
    const maxBuildings = gameState.perspectiveMode ? 150 : 75;
    
    // 0 = Far Skyline, 1 = Mid range, 2 = Close foreground
    const layers = [
        { z: 0.2, count: gameState.perspectiveMode ? 30 : 15, colorShift: -20, speed: 0.1 },
        { z: 0.5, count: gameState.perspectiveMode ? 20 : 12, colorShift: -10, speed: 0.3 },
        { z: 0.8, count: gameState.perspectiveMode ? 15 : 8, colorShift: 0, speed: 1.0 }
    ];

    layers.forEach((layer, lIdx) => {
        // Count buildings in this specific layer
        let currentInLayer = gameState.buildings.filter(b => Math.abs(b.layer - layer.z) < 0.1).length;
        
        // Spawn more if under the target count for this layer
        if (currentInLayer < layer.count || (isInitial && currentInLayer < layer.count * 2)) {
            let toSpawn = isInitial ? layer.count * 2 : (layer.count - currentInLayer);
            
            for (let i = 0; i < toSpawn; i++) {
                let type;
                if (roundNum < 10) {
                    type = Math.random() > 0.3 ? 'hut' : (Math.random() > 0.5 ? 'tower' : 'apt');
                } else {
                    type = Math.random() > 0.6 ? 'tower' : (Math.random() > 0.5 ? 'apt' : 'hut');
                }
                
                let w = (40 + Math.random() * 60) * layer.z;
                let h = (60 + Math.random() * 120) * layer.z;
                if (type === 'tower') h *= 1.5; // Towers are 50% taller
                if (type === 'hut') h = Math.min(h, 80 * layer.z);
                
                // Distribute across the width, adding some buffer
                let x = Math.random() * (canvas.width + 100) - 50;
                
                let color;
                if (Math.random() < 0.05) {
                    // 5% chance for a totally different/random color
                    color = `hsl(${Math.random() * 360}, 40%, ${40 + Math.random() * 30}%)`;
                } else {
                    // Primary palette: Beige, Dark Yellow, Grays
                    const palette = [
                        `hsl(35, 30%, 80%)`,  // Beige
                        `hsl(50, 80%, 45%)`,  // Dark Yellow
                        `hsl(0, 0%, 30%)`,    // Dark Gray
                        `hsl(0, 0%, 70%)`     // Light Gray
                    ];
                    color = palette[Math.floor(Math.random() * palette.length)];
                }
                
                let bObj = {
                    type: isInitial ? type : 'scaffold', 
                    finalType: type,
                    width: w, height: h, x: x, layer: layer.z,
                    color: color,
                    roofColor: '#2b1b17',
                    windows: 1 + Math.floor(Math.random() * 2),
                    litLights: [], litGrid: [],
                    scaffoldRounds: 0,
                    onFire: false,
                    damage: []
                };

                // Populate type-specific details
                if (type === 'tower') {
                    for (let wy = 10; wy < h - 10; wy += 20 * (gameState.perspectiveMode ? layer.z : 1)) {
                        if (Math.random() > 0.3) bObj.litLights.push(wy);
                    }
                    if (bObj.litLights.length === 0) bObj.litLights.push(10);
                } else if (type === 'apt') {
                    let colWidth = 15 * (gameState.perspectiveMode ? layer.z : 1);
                    let cols = Math.floor(w / colWidth);
                    for (let wy = 10; wy < h - 10; wy += 20 * (gameState.perspectiveMode ? layer.z : 1)) {
                        let row = [];
                        for (let wx = 0; wx < cols; wx++) {
                            if (Math.random() > 0.4) row.push(wx);
                        }
                        if (row.length > 0) bObj.litGrid.push({ y: wy, xList: row });
                    }
                    if (bObj.litGrid.length === 0) bObj.litGrid.push({ y: 10, xList: [0] });
                }
                
                gameState.buildings.push(bObj);
            }
        }
    });

    // Final global cap to maintain performance
    if (gameState.buildings.length > maxBuildings) {
        // Keep foreground buildings prioritized? Or just sort by layer and keep?
        gameState.buildings.sort((a,b) => b.layer - a.layer); // Foreground first
        gameState.buildings = gameState.buildings.slice(0, maxBuildings);
    }
    
    // Safety: If after all that we still have 0 buildings (unlikely), force one
    if (gameState.buildings.length === 0) {
        gameState.buildings.push({
            type: 'hut', width: 60, height: 40, x: 100, layer: 0.8,
            color: '#555', roofColor: '#222', windows: 1, 
            litLights: [], litGrid: [], scaffoldRounds: 0
        });
    }
}

function updateBuildingConditions() {
    if (!gameState.buildings) return;
    gameState.buildings.forEach(b => {
        // Handle Scaffolding Progress (2 rounds to build)
        if (b.type === 'scaffold') {
            b.scaffoldRounds++;
            if (b.scaffoldRounds >= 2) {
                b.type = b.finalType;
            }
            return; // Don't age/burn scaffolding yet
        }

        // 10% chance of structural damage each round
        if (Math.random() < 0.1 && b.type !== 'rubble') {
            if (!b.damage) b.damage = [];
            b.damage.push({
                type: Math.random() > 0.4 ? 'crack' : 'chunk',
                x: Math.random() * b.width,
                y: Math.random() * b.height,
                w: 4 + Math.random() * 8,
                h: 4 + Math.random() * 8,
                angle: Math.random() * Math.PI * 2
            });
        }
        // Fire risk increases +5% every 10 levels
        let fireChance = 0.01 + Math.floor((gameState.round - 1) / 10) * 0.05;
        if (Math.random() < fireChance && !b.onFire && b.type !== 'rubble') {
            b.onFire = true;
            b.fireRounds = 0;
        }
        if (b.onFire) {
            b.fireRounds = (b.fireRounds || 0) + 1;
            // Total destruction after 6 rounds -> Convert to Rubble
            if (b.fireRounds >= 6) {
                b.type = 'rubble';
                b.onFire = false;
                b.height *= (0.2 + Math.random() * 0.3); // Very low piles
                b.width *= (0.8 + Math.random() * 0.4); // Spread slightly
                b.color = '#1a1a1a'; // Charred black
                b.damage = [];
                // Generate debris
                for(let i=0; i<15; i++) {
                    b.damage.push({
                        type: 'debris',
                        x: Math.random() * b.width,
                        y: Math.random() * b.height,
                        w: 2 + Math.random() * 4,
                        h: 2 + Math.random() * 4,
                        angle: Math.random() * Math.PI * 2
                    });
                }
            }
        }
    });
    // Save snapshot
    gameState.buildingSnapshot = JSON.parse(JSON.stringify(gameState.buildings));
    localStorage.setItem('mallard_buildings', JSON.stringify(gameState.buildingSnapshot));
}

function spawnHills() {
    if (!gameState.hills) gameState.hills = [];
    
    // Reduced Layers for hills to prioritize buildings
    const season = getSeasonData(gameState.round);
    const hillLayers = [
         { z: 0.1, count: 1, color: season.hills[0], hBase: 360 }, // Distant mountains (3x taller)
         { z: 0.3, count: 1, color: season.hills[1], hBase: 240 }, // Mid hills (3x taller)
         { z: 0.6, count: 1, color: season.hills[2], hBase: 150 }, // Close hills (3x taller)
    ];

    hillLayers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            let hillW = (200 + Math.random() * 400) * layer.z;
            let hillH = (layer.hBase + Math.random() * 50) * layer.z;
            let hillX = Math.random() * canvas.width - hillW / 2;
            
            // Generate some trees for this hill
            let trees = [];
            let numTrees = Math.floor(2 + Math.random() * 5);
            for(let t=0; t<numTrees; t++) {
                trees.push({
                    relX: 0.2 + Math.random() * 0.6, // Relative position on hill width
                    size: 10 + Math.random() * 15,
                    colorIdx: Math.floor(Math.random() * 3)
                });
            }

            gameState.hills.push({
                x: hillX,
                width: hillW,
                height: hillH,
                layer: layer.z,
                color: layer.color,
                trees: trees
            });
        }
    });
}

function spawnPermanentClouds(count) {
    if (!gameState.permanentClouds) gameState.permanentClouds = [];
    for (let i = 0; i < count; i++) {
        gameState.permanentClouds.push({
            x: Math.random() * canvas.width,
            y: 20 + Math.random() * (canvas.height * 0.4),
            size: 30 + Math.random() * 170, // 30 to 200px
            speed: 10 + Math.random() * 15
        });
    }
}

// Game Loop
let presenceStates = {}; // Local state for active remote players

function drawPresenceIndicator(ctx, dt) {
    const presences = window.activePresences || [];
    if (presences.length === 0) {
        presenceStates = {}; // Clear if no one
        return;
    }

    const margin = 20;
    const areaSize = 200;
    const stickHeight = 30;
    const headSize = 20;
    
    // Position area above the HUD (bottom-right)
    const areaX = canvas.width - areaSize - margin;
    const areaY = canvas.height - 80 - margin - areaSize;

    // Cleanup states for people who left
    const activeIds = new Set(presences.map(p => p.id));
    for (let id in presenceStates) {
        if (!activeIds.has(id)) delete presenceStates[id];
    }

    presences.slice(0, 15).forEach((p, i) => {
        const id = p.id || String(i);
        if (!presenceStates[id]) {
            // Initialize new presence state
            let hash = 0;
            for (let j = 0; j < id.length; j++) {
                hash = ((hash << 5) - hash) + id.charCodeAt(j);
                hash |= 0;
            }
            const seed = Math.abs(hash);
            let hue = seed % 360;
            // Shift away from Green/Brown (20-160) for contrast with grass
            if (hue > 20 && hue < 160) {
                hue = (hue + 140) % 360;
            }
            
            presenceStates[id] = {
                x: Math.random() * (areaSize - headSize),
                y: areaSize - stickHeight - headSize - 5, // Fixed Y near bottom
                targetX: Math.random() * (areaSize - headSize),
                mode: 'WALK',
                timer: 0,
                color: `hsl(${hue}, 80%, 65%)`, // Slightly more vibrant/light
                characterId: p.characterId,
                walkCycle: 0
            };
        }

        const s = presenceStates[id];

        // Update Logic
        if (s.mode === 'WALK') {
            const dx = s.targetX - s.x;
            const dist = Math.abs(dx);
            const speed = 40; // px/sec

            if (dist < 2) {
                s.mode = 'WAIT';
                s.timer = 1 + Math.random() * 3; // Wait 1-4 seconds
            } else {
                const moveDist = speed * dt;
                s.x += (dx / dist) * moveDist;
                s.walkCycle += dt * 10;
            }
        } else if (s.mode === 'WAIT') {
            s.timer -= dt;
            if (s.timer <= 0) {
                // 30% chance to AIM before walking
                if (Math.random() < 0.3) {
                    s.mode = 'AIM';
                    s.timer = 2; // Aim for 2 seconds
                } else {
                    s.mode = 'WALK';
                    s.targetX = Math.random() * (areaSize - headSize);
                }
            }
        } else if (s.mode === 'AIM') {
            s.timer -= dt;
            if (s.timer <= 0) {
                s.mode = 'WALK';
                s.targetX = Math.random() * (areaSize - headSize);
            }
        }

        // Draw Logic
        ctx.save();
        ctx.translate(areaX + s.x, areaY + s.y);

        // Draw Stick Body
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        const headY = 0;
        const torsoY = headSize;
        const hipsY = headSize + 15;
        const walkAmp = 8;
        const kneeAmp = 4;

        // Legs
        const legSwing = s.mode === 'WALK' ? Math.sin(s.walkCycle) : 0;
        const legSwingOpp = s.mode === 'WALK' ? Math.sin(s.walkCycle + Math.PI) : 0;

        // Left Leg
        ctx.beginPath();
        ctx.moveTo(0, hipsY);
        ctx.lineTo(legSwing * walkAmp, hipsY + 15);
        ctx.stroke();

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(0, hipsY);
        ctx.lineTo(legSwingOpp * walkAmp, hipsY + 15);
        ctx.stroke();

        // Torso
        ctx.beginPath();
        ctx.moveTo(0, torsoY);
        ctx.lineTo(0, hipsY);
        ctx.stroke();

        // Arms
        let lArmX, lArmY, rArmX, rArmY;
        if (s.mode === 'WALK') {
            lArmX = Math.sin(s.walkCycle + Math.PI) * walkAmp;
            lArmY = torsoY + 15;
            rArmX = Math.sin(s.walkCycle) * walkAmp;
            rArmY = torsoY + 15;
        } else if (s.mode === 'AIM') {
            lArmX = -2;
            lArmY = torsoY + 10;
            rArmX = 10;
            rArmY = torsoY - 8; // Pointing skyward
        } else { // WAIT
            lArmX = 2;
            lArmY = torsoY + 15;
            rArmX = -2;
            rArmY = torsoY + 15;
        }

        // Left Arm
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 5);
        ctx.lineTo(lArmX, lArmY);
        ctx.stroke();

        // Right Arm
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 5);
        ctx.lineTo(rArmX, rArmY);
        ctx.stroke();

        // Draw Gun
        ctx.save();
        ctx.translate(rArmX, rArmY);
        const gunRot = s.mode === 'AIM' ? -Math.PI / 3 : (s.mode === 'WALK' ? Math.sin(s.walkCycle) * 0.2 : 0);
        ctx.rotate(gunRot);
        ctx.lineWidth = 1;
        
        if (s.characterId === 1) { // Urban Stalker: Shotgun
            ctx.fillStyle = "#616161"; // Dark Gray
            ctx.fillRect(0, -2, 12, 4); // Barrel
            ctx.fillRect(-2, -1, 4, 3); // Receiver
            ctx.fillStyle = "#3e2723"; // Wood stock
            ctx.fillRect(-6, -1, 4, 2); 
        } else if (s.characterId === 2) { // Ascetic: Divine Staff-Gun
            ctx.fillStyle = "#795548"; // Brown staff
            ctx.fillRect(-2, -10, 2, 20); // Staff
            ctx.fillStyle = "#ffd700"; // Gold barrel
            ctx.fillRect(0, -2, 14, 3);
            ctx.fillStyle = "#fff"; // Glow tip
            ctx.fillRect(14, -2, 2, 3);
        } else if (s.characterId === 3) { // Arbitrator: Law Enforcement Rifle
            ctx.fillStyle = "#9e9e9e"; // Silver
            ctx.fillRect(0, -2, 18, 3); // Long barrel
            ctx.fillRect(-2, -2, 6, 5); // Body
            ctx.fillRect(-4, -1, 2, 4); // Grip/Stock
            ctx.fillStyle = "#212121"; // Scope
            ctx.fillRect(2, -4, 6, 2);
        }
        ctx.restore();

        // Head (Pixel Heads - Scaled)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.translate(-headSize / 2, 0);
        ctx.scale(headSize / 40, headSize / 40);

        const isRadioActive = gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled';
        if (isRadioActive) {
            ctx.fillStyle = "#212121"; // Dark Headphones
            // Left Cup
            ctx.fillRect(-4, 10, 6, 20);
            // Right Cup
            ctx.fillRect(38, 10, 6, 20);
            // Band
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#212121";
            ctx.beginPath();
            ctx.arc(20, 20, 22, Math.PI, 0);
            ctx.stroke();
        }

        if (s.characterId === 1) { // Urban Stalker
            ctx.fillStyle = "#4a148c"; // Purple Hood
            ctx.fillRect(0, 0, 40, 40);
            ctx.fillStyle = "#f5f5dc"; // Beige Face
            ctx.fillRect(6, 6, 28, 28);
            ctx.fillStyle = "#6a1b9a"; // Mask
            ctx.fillRect(0, 10, 40, 8);
            ctx.fillStyle = "#4af14e"; // Eyes
            ctx.fillRect(10, 12, 6, 4);
            ctx.fillRect(24, 12, 6, 4);
        } else if (s.characterId === 2) { // Ascetic
            ctx.fillStyle = "#fb8c00"; // Saffron
            ctx.fillRect(0, 0, 40, 40);
            ctx.fillStyle = "#d2b48c"; // Tan
            ctx.fillRect(10, 10, 20, 22);
            ctx.fillStyle = "#5d4037"; // Eyes
            ctx.fillRect(12, 18, 5, 2);
            ctx.fillRect(23, 18, 5, 2);
            ctx.fillStyle = "#c62828"; // Red dot
            ctx.fillRect(19, 13, 2, 2);
        } else if (s.characterId === 3) { // Arbitrator
            ctx.fillStyle = "#455a64"; // Slate
            ctx.fillRect(0, 0, 40, 40);
            ctx.fillStyle = "#ffffff"; // Wig
            ctx.fillRect(4, 6, 32, 30);
            ctx.fillStyle = "#ffe0b2"; // Pale face
            ctx.fillRect(10, 10, 20, 22);
            ctx.fillStyle = "#1a237e"; // Eyes
            ctx.fillRect(12, 18, 5, 2);
            ctx.fillRect(23, 18, 5, 2);
            ctx.fillStyle = "#ffd700"; // Gold trim
            ctx.fillRect(4, 28, 32, 4);
        } else {
            // Default Head
            ctx.fillStyle = "#777";
            ctx.fillRect(0, 0, 40, 40);
        }
        ctx.restore();

        ctx.restore();
    });

    if (presences.length > 15) {
        ctx.fillStyle = "white";
        ctx.font = "12px 'Press Start 2P', cursive";
        ctx.textAlign = "right";
        ctx.fillText("and many more...", canvas.width - margin, areaY + 140);
    }

    // Death Notifications (Gray Speech Bubble with Black Pixel-Art Letters)
    if (window.presenceNotification && window.presenceNotification.timer > 0) {
        window.presenceNotification.timer -= dt;
        
        const notifyText = window.presenceNotification.text.toUpperCase();
        const pSize = 3;
        const charWidth = 4 * pSize;
        const charHeight = 6 * pSize;
        const totalTextWidth = notifyText.length * charWidth;
        const padding = 10;
        
        const bubbleWidth = totalTextWidth + padding * 2;
        const bubbleHeight = charHeight + padding * 2;
        
        // Position above the "and many more" (if it exists) or just above heads (Y=145)
        const figuresHeadY = areaY + 145;
        const notifyY = (presences.length > 15) ? figuresHeadY - 25 - bubbleHeight : figuresHeadY - 10 - bubbleHeight;
        const notifyX = canvas.width - margin - bubbleWidth;

        ctx.save();
        
        // Shadow for depth
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.roundRect(notifyX + 4, notifyY + 4, bubbleWidth, bubbleHeight, 5);
        ctx.fill();

        // Bubble Background (Gray)
        ctx.fillStyle = "#bdbdbd";
        ctx.beginPath();
        ctx.roundRect(notifyX, notifyY, bubbleWidth, bubbleHeight, 8);
        ctx.fill();
        
        // Bubble Border
        ctx.strokeStyle = "#424242";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bubble Tail
        ctx.beginPath();
        ctx.moveTo(canvas.width - margin - 30, notifyY + bubbleHeight);
        ctx.lineTo(canvas.width - margin - 20, notifyY + bubbleHeight + 10);
        ctx.lineTo(canvas.width - margin - 10, notifyY + bubbleHeight);
        ctx.fillStyle = "#bdbdbd";
        ctx.fill();
        ctx.stroke();

        // Black Pixel-Art Letters
        ctx.fillStyle = "black";
        for (let i = 0; i < notifyText.length; i++) {
            const char = notifyText[i];
            const pattern = pixelFont[char] || pixelFont[' '];
            const startCharX = notifyX + padding + i * charWidth;
            const startCharY = notifyY + padding;
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 3; col++) {
                    if (pattern[row][col] === '#') {
                        ctx.fillRect(startCharX + col * pSize, startCharY + row * pSize, pSize, pSize);
                    }
                }
            }
        }

        ctx.restore();
    }
}

function gameLoop(timestamp) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to identity
    if (gameState.phase === 'SHADOW') return; // STOP the loop during shadowy encounter

    // Calculate delta time in seconds
    let dt = (timestamp - gameState.lastTime) / 1000;
    if (isNaN(dt)) dt = 0; // Handle first frame
    if (dt > 0.1) dt = 0.1; // Cap dt to avoid huge jumps
    gameState.lastTime = timestamp;
    
    // Driving Mode Update & Draw (Overwrites standard background)
    if (gameState.drivingMode) {
        gameState.drivingMode.update(dt);
    }

    // Update splatters
    if (gameState.splatters) {
        gameState.splatters.forEach(s => s.update(dt));
        gameState.splatters = gameState.splatters.filter(s => s.life > 0);
    }

    if (gameState.victoryTimer > 0) {
        let prevTimer = gameState.victoryTimer;
        gameState.victoryTimer -= dt;
        if (Math.random() < 0.1) gameState.fireworks.push(new Firework());
        
        if (prevTimer > 0 && gameState.victoryTimer <= 0) {
            let finishedRound = gameState.round;
            gameState.round = finishedRound + 1;
            gameState.boss = null;
            updateBuildingConditions();
            showShadowyScreen(finishedRound, false, true); // (round, isNewUnlockRecord, isBossVictory)
        }
    }

    if (gameState.fireworks.length > 0) {
        gameState.fireworks.forEach(f => f.update(dt));
        gameState.fireworks = gameState.fireworks.filter(f => !f.exploded || (f.particles && f.particles.length > 0));
    }

    // Atmospheric effects update (Rain & Thunder)
    if (gameState.phase === 'START' || startScreen.style.display !== 'none') {
        // Rain
        if (gameState.rainDrops.length < 150) {
            gameState.rainDrops.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                speed: 1000 + Math.random() * 800,
                length: 15 + Math.random() * 25
            });
        }
        gameState.rainDrops.forEach(drop => {
            drop.y += drop.speed * dt;
            if (drop.y > canvas.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * canvas.width;
            }
        });

        // Thunder
        if (gameState.thunderFlash > 0) {
            gameState.thunderFlash -= dt * 4;
        }
        gameState.thunderTimer -= dt;
        if (gameState.thunderTimer <= 0) {
            if (Math.random() < 0.3) {
                gameState.thunderFlash = 1.0;
                // Occasional double strike
                if (Math.random() < 0.5) gameState.thunderTimer = 0.1;
                else gameState.thunderTimer = 6 + Math.random() * 12;
            } else {
                gameState.thunderTimer = 1.0;
            }
        }

        // Intro Duck Logic (Stay in Fly/Hover mode)
        let dx = (gameState.introDuck.targetX - gameState.introDuck.x) * 2 * dt;
        let dy = (gameState.introDuck.targetY - gameState.introDuck.y) * 2 * dt;
        gameState.introDuck.x += dx;
        gameState.introDuck.y += dy;
    }

    if (gameState.powerUpActive) {
        gameState.powerUpTimer -= dt;
        if (gameState.powerUpTimer <= 0 || gameState.round >= gameState.powerUpEndRound) {
            gameState.powerUpActive = false;
            if (sirenSource) {
                sirenSource.stop();
                sirenSource.disconnect();
                sirenSource = null;
            }
        }
    }

    if (gameState.hotdogPowerUpActive) {
        gameState.hotdogPowerUpTimer -= dt;
        if (gameState.hotdogPowerUpTimer <= 0 || gameState.round >= gameState.hotdogPowerUpEndRound) {
            gameState.hotdogPowerUpActive = false;
            if (cyberpunkSource) {
                cyberpunkSource.stop();
                cyberpunkSource.disconnect();
                cyberpunkSource = null;
            }
        }
    }

    let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);

    // Retro 8-bit Banded Sky (Posterized transitions)
    {
        let topL = 68;
        let botL = 85; 
        if (gameState.round >= 60) { topL -= 25; botL -= 20; }
        else if (gameState.round >= 30) { topL -= 12; botL -= 10; }

        const numBands = 6;
        const bandHeight = (canvas.height * 0.7) / numBands;
        for (let i = 0; i < numBands; i++) {
            let t = i / (numBands - 1);
            let currentL = topL + (botL - topL) * t;
            ctx.fillStyle = `hsl(207, 90%, ${currentL}%)`;
            ctx.fillRect(0, i * bandHeight, canvas.width, bandHeight + 1);
        }
        // Fill the rest (grass area underneath)
        ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    }

    // Apply Screen Shake for the game world
    let isShaking = gameState.shakeTimer > 0;
    if (isShaking) {
        ctx.save();
        let shakeAmount = 10 * (gameState.shakeTimer);
        ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        gameState.shakeTimer -= dt;
    }

    // Rain and Thunder Overlay (Drawn early if on START screen)
    if (gameState.phase === 'START' || startScreen.style.display !== 'none') {
        // Rain
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        gameState.rainDrops.forEach(drop => {
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
        });
        ctx.stroke();

        // Thunder Flash
        if (gameState.thunderFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${gameState.thunderFlash * 0.4})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        if (gameState.phase === 'START') {
            // Draw Intro Duck
            if (introCtx) {
                introCtx.clearRect(0, 0, introCanvas.width, introCanvas.height);
                introCtx.imageSmoothingEnabled = false;
                
                let duckW = 100;
                let duckH = 100;
                let duckX = gameState.introDuck.x - duckW / 2;
                let duckY = gameState.introDuck.y - duckH / 2;
                
                // Always side-view duck flying
                drawDuck(introCtx, duckX, duckY, duckW, duckH, 1, performance.now() / 1000);

                // Draw Global Boss & Bomber Kills (Top row)
                let totalPDFs = (window.globalBossKills || 0) + (window.globalBomberKills || 0);
                let bossKillsText = totalPDFs + " PDFs PRINTED GLOBALLY";
                drawGoldenText(introCtx, bossKillsText, 10, 20, 9);

                // Draw Global High Score (Middle row, 20px space from top row)
                drawGoldenText(introCtx, "GLOBAL BEST", 10, 50, 10);
                let gScore = (window.globalHighScore || 0).toString().padStart(6, '0');
                drawGoldenText(introCtx, gScore, 10, 67, 14);

                // Draw Chalice (Middle, central position)
                drawChalice(introCtx, 10, 90);

                // Draw Personal High Score (Bottom row, 20px space from chalice)
                drawGoldenText(introCtx, "MY HI-SCORE", 10, 155, 10);
                drawGoldenText(introCtx, gameState.highScore.toString().padStart(6, '0'), 10, 172, 12);
            }

            // Fall through to end of function for a single requestAnimationFrame
        }
    }

    // Draw Sun at Level >= 4 (Suppressed during drivingMode as it's drawn later for layering)
    if (currentLevel >= 4 && !gameState.drivingMode) {
        let isRadioActive = gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled';
        
        // Bopping animation if radio is active
        let bopY = 0;
        if (isRadioActive) {
            bopY = Math.sin(performance.now() / 150) * 4;
        }

        let sunX = 40;
        let sunY = 40 + bopY;
        let sunRadius = 20;

        // Redness: starts at 0, increases 5% per round
        let redPercent = Math.min(100, (gameState.round - 1) * 5);
        let g = Math.floor(235 * (1 - redPercent / 100));
        let b = Math.floor(59 * (1 - redPercent / 100));
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;

        let pSize = 2; // Smaller pixel size for scaled sun
        for (let y = -sunRadius; y <= sunRadius; y += pSize) {
            for (let x = -sunRadius; x <= sunRadius; x += pSize) {
                if (x * x + y * y <= sunRadius * sunRadius) {
                    ctx.fillRect(sunX + x, sunY + y, pSize, pSize);
                }
            }
        }

        // Aviator sunglasses (scaled down)
        ctx.fillStyle = "black";
        ctx.fillRect(sunX - 14, sunY - 8, 12, 8); // Left lens
        
        if (gameState.isSunWinking) {
            // Closed right eye (matching sun color base)
            ctx.fillStyle = `rgb(255, ${g}, ${b})`;
            ctx.fillRect(sunX + 2, sunY - 8, 12, 8);
            ctx.fillStyle = "black";
            ctx.fillRect(sunX + 2, sunY - 2, 12, 2); // happy wink line
        } else {
            ctx.fillRect(sunX + 2, sunY - 8, 12, 8);  // Normal Right lens
        }

        ctx.fillRect(sunX - 2, sunY - 6, 4, 2);    // Bridge
        ctx.fillRect(sunX - 20, sunY - 6, 6, 2);   // Left arm
        ctx.fillRect(sunX + 14, sunY - 6, 6, 2);   // Right arm

        // Lens cutouts to round bottoms
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;
        ctx.fillRect(sunX - 14, sunY, 2, 2);
        ctx.fillRect(sunX - 4, sunY, 2, 2);
        if (!gameState.isSunWinking) {
            ctx.fillRect(sunX + 2, sunY, 2, 2);
            ctx.fillRect(sunX + 12, sunY, 2, 2);
        }

        // Lens reflection
        ctx.fillStyle = "white";
        ctx.fillRect(sunX - 10, sunY - 6, 2, 2);
        if (!gameState.isSunWinking) {
            ctx.fillRect(sunX + 6, sunY - 6, 2, 2);
        }

        // Mouth (scaled down)
        if (gameState.perfectRounds >= 4) {
            // Huge happy smile! (Audi Acquired)
            ctx.fillStyle = "black";
            ctx.fillRect(sunX - 10, sunY + 6, 20, 12); // Big mouth backing
            ctx.fillStyle = "white"; // Big shiny teeth
            ctx.fillRect(sunX - 8, sunY + 8, 16, 4);
            ctx.fillStyle = "#e57373"; // Big tongue
            ctx.fillRect(sunX - 6, sunY + 14, 12, 4);

            // Flushed Cheeks
            ctx.fillStyle = `rgba(200, 40, 40, 0.6)`;
            ctx.fillRect(sunX - 16, sunY + 6, 6, 6);
            ctx.fillRect(sunX + 10, sunY + 6, 6, 6);
        } else {
            // Mouth (open expression from image)
            ctx.fillStyle = "black";
            ctx.fillRect(sunX - 6, sunY + 8, 12, 4);
            ctx.fillStyle = "#e57373"; // Inner mouth
            ctx.fillRect(sunX - 4, sunY + 10, 8, 2);
        }

        // Headphones if radio active
        if (isRadioActive) {
            ctx.fillStyle = "#333"; // Dark grey headphones
            // Left cup
            ctx.fillRect(sunX - sunRadius - 4, sunY - 8, 6, 16);
            // Right cup
            ctx.fillRect(sunX + sunRadius - 2, sunY - 8, 6, 16);
            // Headband
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#333";
            ctx.arc(sunX, sunY, sunRadius + 2, Math.PI, 0);
            ctx.stroke();
        }

        // Draw Audi Rings (4 Perfect Rounds) directly below the sun - Scaled
        let numRings = Math.min(4, gameState.perfectRounds);
        if (numRings > 0) {
            ctx.strokeStyle = "#e0e0e0"; // Silver / Platinum color
            ctx.lineWidth = 2;
            let startRingsX = sunX - 15; // Center the 4 rings under sun
            for (let i = 0; i < numRings; i++) {
                ctx.beginPath();
                // 10px spacing between ring centers, 6px radius, overlapping like Audi
                ctx.arc(startRingsX + i * 10, sunY + 32, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Extra feature: Perfect Round Thumbs Up!
        if (gameState.phase === 'DOG' && gameState.escapedThisRound === 0) {
            let tX = sunX + 22;
            let tY = sunY + 2;
            let pS = 2;

            // Base Hand/Fist color matches the sun's redness
            ctx.fillStyle = `rgb(255, ${g}, ${b})`;
            ctx.fillRect(tX, tY, pS * 5, pS * 4); // fist box
            ctx.fillRect(tX - pS, tY - pS * 4, pS * 2, pS * 4); // thumb pointing up

            // Hand outline shading for pixel 3D volume
            ctx.fillStyle = "black";
            ctx.fillRect(tX, tY - pS, pS * 3, pS); // top fist crease
            ctx.fillRect(tX + pS, tY, pS, pS * 2); // root thumb fold
            ctx.fillRect(tX + pS * 5, tY + pS, pS, pS); // finger 1 crease
            ctx.fillRect(tX + pS * 5, tY + pS * 3, pS, pS); // finger 2 crease
        }

        // --- Sun's Coded PDF Notifications ---
        if (window.sunNotification && window.sunNotification.timer > 0) {
            window.sunNotification.timer -= dt;
            
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // UI layer style
            
            const notifyText = window.sunNotification.text.toUpperCase();
            const pSize = 3;
            const charWidth = 4 * pSize;
            const charHeight = 6 * pSize;
            const totalTextWidth = notifyText.length * charWidth;
            const padding = 10;
            const bubbleWidth = totalTextWidth + padding * 2;
            const bubbleHeight = charHeight + padding * 2;
            
            const bubbleX = sunX + sunRadius + 20;
            const bubbleY = sunY - bubbleHeight / 2;
            
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(bubbleX + 6, bubbleY + 6, bubbleWidth, bubbleHeight);
            
            // Bubble Background (Dark Gray for contrast)
            ctx.fillStyle = "#222";
            ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            
            // Border (Neon highlight)
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            
            // Tail pointing to sun
            ctx.beginPath();
            ctx.moveTo(bubbleX, sunY - 5);
            ctx.lineTo(bubbleX - 15, sunY);
            ctx.lineTo(bubbleX, sunY + 5);
            ctx.fillStyle = "#222";
            ctx.fill();
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Re-fill connecting point to hide border overlap
            ctx.fillRect(bubbleX - 1, sunY - 10, 5, 20);

            // Draw coded PDF text (White on dark for maximum contrast)
            let curX = bubbleX + padding;
            let curY = bubbleY + padding;
            ctx.fillStyle = "white"; // Force white color for all chars
            for (let i = 0; i < notifyText.length; i++) {
                const char = notifyText[i];
                const pattern = pixelFont[char] || pixelFont[' '];
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 3; col++) {
                        if (pattern[row][col] === '#') {
                            ctx.fillRect(curX + col * pSize, curY + row * pSize, pSize, pSize);
                        }
                    }
                }
                curX += charWidth;
            }
            ctx.restore();
        }
    }

    // Draw pixel art clouds based on level
    let numClouds = currentLevel === 1 ? 2 : (currentLevel === 2 ? 6 : 14);

    // Clouds get darker gray at higher levels 
    if (currentLevel === 1) {
        ctx.fillStyle = '#ffffff'; // White
    } else if (currentLevel === 2) {
        ctx.fillStyle = '#d3d3d3'; // Light Gray
    } else {
        ctx.fillStyle = '#9e9e9e'; // Dark Gray
    }

    for (let c = 0; c < numClouds; c++) {
        // Pseudo-random position based on cloud index, slowly moving right
        let startX = c * 137;
        let speedMult = 1.0 + (Math.sin(c * 123.45) * 0.2); // +/- 20%
        let sizeMult = 1.0 + (Math.cos(c * 321.12) * 0.2); // +/- 20%

        let speed = (20 + (c % 3) * 10) * speedMult;
        let cx = ((startX + timestamp / 1000 * speed) % (canvas.width + 120)) - 60;
        let cy = 20 + (c * 47) % (canvas.height * 0.6);

        ctx.save();
        ctx.translate(cx + 20, cy + 10);
        ctx.scale(sizeMult, sizeMult);

        // Banded 8-bit cloud shading
        let colors = [];
        if (currentLevel === 1) colors = ['#ffffff', '#f0f0f0', '#e0e0e0'];
        else if (currentLevel === 2) colors = ['#d3d3d3', '#c0c0c0', '#b0b0b0'];
        else colors = ['#9e9e9e', '#888888', '#707070'];

        // Top band
        ctx.fillStyle = colors[0];
        ctx.fillRect(-10, -20, 20, 10);
        // Middle band
        ctx.fillStyle = colors[1];
        ctx.fillRect(-20, -10, 40, 10);
        // Bottom band
        ctx.fillStyle = colors[2];
        ctx.fillRect(-30, 0, 60, 10);
        ctx.fillRect(-20, 0, 40, 10); // overlap for shape consistency

        ctx.restore();
    }

    // Draw permanent clouds
    if (gameState.permanentClouds) {
        gameState.permanentClouds.forEach(pc => {
            pc.x = ((pc.x + dt * pc.speed) % (canvas.width + pc.size)) - pc.size;
            ctx.save();
            ctx.translate(pc.x, pc.y);
            let s = pc.size / 60; 
            ctx.scale(s, s);
            // Banded 8-bit cloud shading for permanent ones
            let colors = [];
            if (currentLevel === 1) colors = ['#ffffff', '#f0f0f0', '#e0e0e0'];
            else if (currentLevel === 2) colors = ['#d3d3d3', '#c0c0c0', '#b0b0b0'];
            else colors = ['#9e9e9e', '#888888', '#707070'];

            ctx.fillStyle = colors[0];
            ctx.fillRect(-10, -20, 20, 10);
            ctx.fillStyle = colors[1];
            ctx.fillRect(-20, -10, 40, 10);
            ctx.fillStyle = colors[2];
            ctx.fillRect(-30, 0, 60, 10);
            ctx.fillRect(-20, 0, 40, 10);
            ctx.restore();
        });
    }

    // Airplane Logic: Check every 10s roughly, increasing chance
    if (gameState.phase === 'PLAY' && timestamp - gameState.lastAirplaneTime > 10000) {
        gameState.lastAirplaneTime = timestamp;

        // Base 1% chance, plus 5% for every 20 rounds
        let baseChance = 0.01;
        let chanceBonus = Math.floor((gameState.round - 1) / 20) * 0.05;
        let spawnChance = Math.min(1.0, baseChance + chanceBonus);

        if (Math.random() < spawnChance) {
            gameState.airplanes.push(new Airplane());
        }
    }

    let effectiveDt = (gameState.victoryTimer > 0) ? 0 : dt;
    
    // --- Driving Mode World Draw (Overlays sky/clouds, below targets) ---
    if (gameState.drivingMode) {
        gameState.drivingMode.draw(ctx);
    }

    // --- Draw Sun (Must be visible during driving) ---
    if (true) { // Re-rendering sun logic here
        let bopY = 0;
        if (gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled') {
            bopY = Math.sin(performance.now() / 150) * 4;
        }

        ctx.save();
        let sunX = 40;
        let sunY = 40 + bopY;
        let sunRadius = 20;

        let redPercent = Math.min(100, (gameState.round - 1) * 5);
        let g = Math.floor(235 * (1 - redPercent / 100));
        let b = Math.floor(59 * (1 - redPercent / 100));
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;

        let pSize = 2;
        for (let y = -sunRadius; y <= sunRadius; y += pSize) {
            for (let x = -sunRadius; x <= sunRadius; x += pSize) {
                if (x * x + y * y <= sunRadius * sunRadius) {
                    ctx.fillRect(sunX + x, sunY + y, pSize, pSize);
                }
            }
        }

        ctx.fillStyle = "black";
        ctx.fillRect(sunX - 14, sunY - 8, 12, 8); 
        if (gameState.isSunWinking) {
            ctx.fillStyle = `rgb(255, ${g}, ${b})`;
            ctx.fillRect(sunX + 2, sunY - 8, 12, 8);
            ctx.fillStyle = "black";
            ctx.fillRect(sunX + 2, sunY - 2, 12, 2);
        } else {
            ctx.fillRect(sunX + 2, sunY - 8, 12, 8);
        }
        ctx.fillRect(sunX - 2, sunY - 6, 4, 2);
        ctx.fillRect(sunX - 20, sunY - 6, 6, 2);
        ctx.fillRect(sunX + 14, sunY - 6, 6, 2);
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;
        ctx.fillRect(sunX - 14, sunY, 2, 2);
        ctx.fillRect(sunX - 4, sunY, 2, 2);
        if (!gameState.isSunWinking) {
            ctx.fillRect(sunX + 2, sunY, 2, 2);
            ctx.fillRect(sunX + 12, sunY, 2, 2);
        }
        ctx.fillStyle = "white";
        ctx.fillRect(sunX - 12, sunY - 6, 2, 2);
        ctx.fillRect(sunX + 4, sunY - 6, 2, 2);
        ctx.fillStyle = "black";
        ctx.fillRect(sunX - 6, sunY + 6, 12, 2);
        ctx.fillRect(sunX - 8, sunY + 4, 2, 2);
        ctx.fillRect(sunX + 6, sunY + 4, 2, 2);
        ctx.restore();
    }


    // Update & Draw Airplanes
    gameState.airplanes.forEach(plane => {
        plane.update(effectiveDt);
        plane.draw(ctx);
    });

    // Update boss
    if (gameState.boss) {
        gameState.boss.update(dt); // Boss continues to update (for death particles)
        if (gameState.boss.fullyDead) {
            gameState.boss = null;
        }
    }
    gameState.bossProjectiles.forEach(p => p.update(effectiveDt));
    gameState.bossProjectiles = gameState.bossProjectiles.filter(p => !p.fullyDead);

    // Filter out dead/offscreen planes
    gameState.airplanes = gameState.airplanes.filter(p => p.y < 1000 && p.x > -200 && p.x < canvas.width + 200);

    // Update & Draw Ducks
    gameState.ducks.forEach(duck => {
        duck.update(effectiveDt);
        duck.draw(ctx);
    });

    // Remove ducks that are off-screen (fallen down or flew away)
    gameState.ducks = gameState.ducks.filter(duck => {
        // If duck flies off the top of the canvas, it escaped!
        if (!duck.isDead && duck.y < -150) {
            gameState.escapedThisRound++;
            if (gameState.drivingMode) {
                triggerDrivingPenalty();
            } else {
                gameState.lives--;
                updateUI();
                if (gameState.lives <= 0 && gameState.phase !== 'GAME_OVER') {
                    triggerGameOver();
                }
            }
            return false;
        }
        return duck.y < canvas.height + 100 && duck.y > -200;
    });

    // Update & Draw Tigers
    gameState.tigers.forEach(tiger => {
        tiger.update(effectiveDt);
        tiger.draw(ctx);
    });

    // Update & Draw Heavy Bombers
    if (gameState.heavyBombers) {
        gameState.heavyBombers.forEach(bomber => {
            bomber.update(effectiveDt);
            bomber.draw(ctx);
        });
        gameState.heavyBombers = gameState.heavyBombers.filter(m => !m.fullyDead);
    }
    // Check Tigers touching bottom (grass level approx)
    gameState.tigers = gameState.tigers.filter(tiger => {
        if (!tiger.isDead && tiger.y > canvas.height - canvas.height * 0.12) {
            gameState.score -= 5000;
            playSound(wompBuffer);
            flashScreen();
            updateUI();
            return false;
        }
        return tiger.y < canvas.height + 100 && tiger.y > -200;
    });

    // Eagles moved down here so they are not covered by background buildings
    // Auto-start BGM mid-game if it finishes loading late
    if (!bgmSource && bgmBuffers[0] && gameState.phase !== 'START' && gameState.phase !== 'GAME_OVER' && gameState.phase !== 'WIN') {
        startBGM(gameState.round);
    }

    // Phase Logic
    if (gameState.phase === 'SPAWN') {
        gameState.ducks.push(new Duck());
        gameState.ducks.push(new Duck());

        // Spawn a level 2 duck for every 10 rounds passed
        let bonusDucks = Math.floor(gameState.round / 10);
        for (let i = 0; i < bonusDucks; i++) {
            gameState.ducks.push(new Duck(2));
        }

        let baseAmmo = (gameState.character === 1) ? 8 : 5;
        gameState.ammo = baseAmmo + (bonusDucks * 4); // Ensure we don't immediately run out of bullets with swarms
        gameState.sessionKills = 0; // Reset consecutive kills per round
        gameState.escapedThisRound = 0; // Reset escaping penalization
        updateUI();

        startBGM(gameState.round); // Make sure the music speed updates each round!

        spawnBuildings(gameState.round, false);
        if (gameState.round % 5 === 0) {
            spawnHills();
        }

        gameState.phase = 'PLAY';

        if (gameState.round === 14) {
            gameState.boss = new BigHeadBoss();
            gameState.ducks = []; // No ducks on boss level
            gameState.ammo = 12; // Start with 2x bullets (default 6)
        } else if (gameState.round === 24) {
            gameState.boss = new UncleanOneBoss();
            gameState.ducks = [];
            gameState.ammo = 20;
        } else {
            // Normal duck spawning logic would be here (usually handled in showShadowyScreen or similar)
        }

        // Calculate bomber spawn chance: 2% base + 1% per 5 rounds
        let bomberChance = 0.02 + Math.floor((gameState.round - 1) / 5) * 0.01;
        if (Math.random() < bomberChance) {
            // Arrives at a random time in the round (1 to 5 seconds)
            gameState.bomberSpawnTimer = 1.0 + Math.random() * 4.0;
        }

        // Apply Vending Blessing if active
        if (gameState.blessingRounds > 0) {
            gameState.blessingRounds--;
            const roll = Math.random();
            if (roll < 0.5) {
                // Triple Shot
                gameState.powerUpActive = true;
                gameState.powerUpTimer = 3.0; // Reset to 3 seconds as per request
                gameState.powerUpEndRound = gameState.round + 1;
                if (!sirenSource && sirenBuffer) {
                    sirenSource = playSound(sirenBuffer, 0.4, true);
                }
            } else {
                // Seeking Missiles
                gameState.hotdogPowerUpActive = true;
                gameState.hotdogPowerUpTimer = 3.0; // Reset to 3 seconds as per request
                gameState.hotdogPowerUpEndRound = gameState.round + 1;
                if (!cyberpunkSource && cyberpunkBuffer) {
                    cyberpunkSource = playSound(cyberpunkBuffer, 0.6, true);
                }
            }
        }
    } else if (gameState.phase === 'PLAY') {
        // Handle random bomber arrival
        if (gameState.bomberSpawnTimer > 0) {
            gameState.bomberSpawnTimer -= dt;
            if (gameState.bomberSpawnTimer <= 0) {
                gameState.heavyBombers.push(new HeavyBomber());
            }
        }

        if (gameState.ducks.length === 0 && (!gameState.boss || gameState.boss.fullyDead) && !gameState.drivingMode) {
            gameState.phase = 'DOG';
            gameState.timer = 2.5; // Dog animation takes 2.5 seconds
            gameState.dogQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
            gameState.dogPlayedSound = false;

            if (gameState.boss && gameState.boss.fullyDead) {
                gameState.boss = null;
            }

            // Check for flawless execution to build Audi symbol (only count if Sun is visible, level 4+)
            if (gameState.escapedThisRound === 0 && currentLevel >= 4) {
                gameState.perfectRounds++;
            }
        }
    } else if (gameState.phase === 'DOG') {
        gameState.timer -= dt;

        if (gameState.timer > 0.5 && gameState.timer < 2.0 && !gameState.dogPlayedSound) {
            playSound(snickerBuffer, 0.6);
            gameState.dogPlayedSound = true;
        }

        if (gameState.timer <= 0) {
            if (gameState.round >= 80) {
                triggerWin();
            } else {
                let finishedRound = gameState.round;
                let isNewUnlockRecord = (finishedRound >= gameState.maxRoundReached);
                
                gameState.round++;
                if (gameState.round === 33) {
                    gameState.drivingMode = new DrivingMode();
                }
                updateBuildingConditions(); // Apply aging/damage each round
                
                // Gain more random permanent clouds every 5th level
                if (gameState.round % 5 === 0) {
                    spawnPermanentClouds(2);
                }
                
                if (gameState.round > gameState.maxRoundReached) {
                    gameState.maxRoundReached = gameState.round;
                    localStorage.setItem('mallard_max_round', gameState.maxRoundReached.toString());
                }
                
                if (finishedRound % 10 === 0) {
                    showShadowyScreen(finishedRound, isNewUnlockRecord);
                    return;
                }

                if (finishedRound % 5 === 0 && gameState.score >= 20000) {
                    showVendingScreen();
                    return;
                }

                gameState.phase = 'SPAWN';
                spawnBuildings(gameState.round, false);
                if (gameState.round % 5 === 0) {
                    spawnHills();
                }
                document.getElementById('round-display').innerText = 'R=' + gameState.round;
            }
        }
    } else if (gameState.phase === 'GAME_OVER') {
        // Draw black screen and scrolling text
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "10px 'Press Start 2P', cursive";

        let elapsed = (performance.now() - gameOverTimer) / 1000;
        let scrollY = canvas.height - elapsed * 30; // pixels per second

        for (let i = 0; i < deathTextLines.length; i++) {
            ctx.fillText(deathTextLines[i], canvas.width / 2, scrollY + i * 35);
        }

        requestAnimationFrame(gameLoop);
        return; // Don't draw UI or grass
    } else if (gameState.phase === 'WIN') {
        // Pixel-art city with golden towers background
        ctx.fillStyle = "#000022"; // Dark night sky
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FFF"; // Stars
        for (let i = 0; i < 50; i++) {
            let sx = (i * 73) % canvas.width;
            let sy = (i * 137) % (canvas.height * 0.7);
            ctx.fillRect(sx, sy, 2, 2);
        }

        // City Skyline with Golden Towers
        let numTowers = Math.ceil(canvas.width / 40);
        for (let i = 0; i < numTowers; i++) {
            let tW = 30 + (i * 17) % 30; // Width: 30 to 60
            let tH = 100 + (i * 53) % 250; // Height: 100 to 350
            let tX = i * 40;
            let tY = canvas.height - tH;

            if (i % 3 === 0) {
                // Golden Tower
                ctx.fillStyle = "#DAA520"; // Base gold
                ctx.fillRect(tX, tY, tW, tH);
                ctx.fillStyle = "#FFD700"; // Bright Highlights
                ctx.fillRect(tX, tY, 5, tH);
                ctx.fillStyle = "#B8860B"; // Dark Shadows
                ctx.fillRect(tX + tW - 5, tY, 5, tH);
                // Golden tower windows (white/bright)
                ctx.fillStyle = "#FFFFFF";
                for (let wy = tY + 20; wy < canvas.height - 20; wy += 30) {
                    ctx.fillRect(tX + 10, wy, 8, 12);
                }
            } else {
                // Silhouette Tower
                ctx.fillStyle = "#111111";
                ctx.fillRect(tX, tY, tW, tH);
                ctx.fillStyle = "#222222";
                ctx.fillRect(tX, tY, 5, tH);
                // Lit windows
                ctx.fillStyle = "#ffeb3b";
                for (let wy = tY + 15; wy < canvas.height - 10; wy += 25) {
                    if ((i + wy) % 5 !== 0) { // random unlit ones
                        ctx.fillRect(tX + 10, wy, 8, 12);
                        if (tW > 35) {
                            ctx.fillRect(tX + 25, wy, 8, 12);
                        }
                    }
                }
            }
        }

        // Draw golden scrolling text
        ctx.fillStyle = "#FFD700"; // Golden Color
        ctx.shadowColor = "#FF8C00";
        ctx.shadowBlur = 10;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "10px 'Press Start 2P', cursive";

        // Inset text logic (prevent it from being flush with the edges)
        let maxTextWidth = canvas.width - 40;

        let elapsed = (performance.now() - winTimer) / 1000;
        let scrollY = canvas.height - elapsed * 30; // pixels per second

        for (let i = 0; i < winTextLines.length; i++) {
            ctx.fillText(winTextLines[i], canvas.width / 2, scrollY + i * 35, maxTextWidth);
        }

        ctx.shadowBlur = 0; // reset

        // Show plaque when text passes top
        let lastLineY = scrollY + winTextLines.length * 35;
        if (lastLineY < -50) {
            let pW = 340; let pH = 240;
            let pX = canvas.width / 2 - pW / 2;
            let pY = canvas.height / 2 - pH / 2;

            ctx.fillStyle = "#3E2723"; // Dark brown wood
            ctx.fillRect(pX, pY, pW, pH);
            ctx.strokeStyle = "#FFD700"; // Gold border
            ctx.lineWidth = 4;
            ctx.strokeRect(pX, pY, pW, pH);

            ctx.fillStyle = "#FFD700";
            ctx.shadowColor = "#FF8C00";
            ctx.shadowBlur = 0;
            ctx.font = "14px 'Press Start 2P', cursive";
            ctx.fillText("VICTORY!", canvas.width / 2, pY + 40);

            ctx.shadowBlur = 0;
            ctx.font = "8px 'Press Start 2P', cursive";
            ctx.fillText(`SCORE: ${gameState.score}`, canvas.width / 2, pY + 90);
            ctx.fillText(`DUCKS DOWNED: ${gameState.killCount}`, canvas.width / 2, pY + 130);
            ctx.fillText(`TIGERS HUNTED: ${gameState.tigersKilled}`, canvas.width / 2, pY + 170);
            ctx.fillText(`AIRPLANES SHOT: ${gameState.airplanesKilled}`, canvas.width / 2, pY + 210);
        }

        requestAnimationFrame(gameLoop);
        return; // Don't draw UI or grass
    }

    // Draw Boss (Behind hills and buildings)
    if (gameState.boss && !gameState.boss.fullyDead) {
        gameState.boss.draw(ctx);
    }

    // Draw background hills (behind buildings)
    let grassLevel = canvas.height - (canvas.height * 0.12);    // Draw hills with Parallax
    if (gameState.hills && !gameState.drivingMode) {
        // Sort by layer so far hills are behind
        [...gameState.hills].sort((a,b) => a.layer - b.layer).forEach(h => {
             let hBaseY = grassLevel;
             ctx.fillStyle = h.color;
             ctx.beginPath();
             ctx.moveTo(h.x, hBaseY);
             ctx.bezierCurveTo(
                 h.x + h.width * 0.2, hBaseY - h.height * 1.5,
                 h.x + h.width * 0.8, hBaseY - h.height * 1.5,
                 h.x + h.width, hBaseY
             );
             ctx.closePath();
             ctx.fill();

             // Draw Trees on this hill
             if (h.trees) {
                 h.trees.forEach(tree => {
                     let tx = h.x + h.width * tree.relX;
                     // Rough estimate of height at this X using a parabolic approximation
                     let dx = (tree.relX - 0.5) * 2; // -1 to 1
                     let ty = hBaseY - h.height * (1 - dx*dx) * 1.1; 
                     let tSize = tree.size * h.layer;

                     // Trunk
                     ctx.fillStyle = '#3d2b1f';
                     ctx.fillRect(tx - 2*h.layer, ty - 5*h.layer, 4*h.layer, 6*h.layer);
                     // Leaves (Triangle)
                     const season = getSeasonData(gameState.round);
                     ctx.fillStyle = season.hills[tree.colorIdx];
                     ctx.beginPath();
                     ctx.moveTo(tx - tSize/2, ty - 5*h.layer);
                     ctx.lineTo(tx, ty - tSize - 5*h.layer);
                     ctx.lineTo(tx + tSize/2, ty - 5*h.layer);
                     ctx.fill();
                 });
             }
        });
    }

    // Update and Draw Hill Animals: check every 15s, 5% chance (Slower/Rarer)
    if (gameState.phase === 'PLAY' && timestamp - gameState.lastHillAnimalCheck > 15000) {
        gameState.lastHillAnimalCheck = timestamp;
        if (Math.random() < 0.05 && gameState.hills.length > 0) {
            let h = gameState.hills[Math.floor(Math.random() * gameState.hills.length)];
            gameState.hillAnimals.push({
                hill: h,
                type: Math.random() > 0.5 ? 'bear' : 'wolf',
                relX: Math.random() < 0.5 ? 0.1 : 0.9,
                dir: Math.random() < 0.5 ? 1 : -1,
                speed: 0.1 + Math.random() * 0.2,
                frame: 0,
                isDead: false
            });
        }
    }

    gameState.hillAnimals.forEach(a => {
        a.relX += a.dir * a.speed * dt;
        a.frame += dt * 5;
        if (a.relX < 0 || a.relX > 1) a.isDead = true;

        let h = a.hill;
        let ax = h.x + h.width * a.relX;
        let adx = (a.relX - 0.5) * 2;
        let ay = grassLevel - h.height * (1 - adx*adx) * 1.1;
        let aSize = (a.type === 'bear' ? 18 : 12) * h.layer;

        ctx.fillStyle = a.type === 'bear' ? '#3e2723' : '#78909c';
        // Simple Body
        ctx.fillRect(ax - aSize/2, ay - aSize, aSize, aSize*0.7);
        // Head
        ctx.fillRect(a.dir > 0 ? ax + aSize/4 : ax - aSize*0.6, ay - aSize*0.9, aSize*0.4, aSize*0.4);
        // Legs (Walking animation)
        let legOff = Math.sin(a.frame) * 3 * h.layer;
        ctx.fillRect(ax - aSize/3 + legOff, ay - aSize*0.3, aSize*0.2, aSize*0.3);
        ctx.fillRect(ax + aSize/6 - legOff, ay - aSize*0.3, aSize*0.2, aSize*0.3);
    });
    gameState.hillAnimals = gameState.hillAnimals.filter(a => !a.isDead);

    // Draw background buildings (skyline) with 3D depth
    if (gameState.buildings && !gameState.drivingMode) {
        // Sort by layer
        [...gameState.buildings].sort((a,b) => a.layer - b.layer).forEach(b => {
            let bY = Math.floor(grassLevel - b.height + 5); 
            let pW = b.width;
            let pX = b.x;
            let pSide = 8 * b.layer; // Depth of side face
            
            // Draw Main Face
            ctx.fillStyle = b.color;
            ctx.fillRect(pX, bY, pW, b.height);
            
            if (gameState.perspectiveMode) {
                // Draw 3D Side Face (Simple Isometric/Vanishing point geometry)
                ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Darkness for side
                ctx.beginPath();
                ctx.moveTo(pX + pW, bY);
                ctx.lineTo(pX + pW + pSide, bY - pSide);
                ctx.lineTo(pX + pW + pSide, bY + b.height - pSide);
                ctx.lineTo(pX + pW, bY + b.height);
                ctx.closePath();
                ctx.fill();
                
                // Draw 3D Top Face
                ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
                ctx.beginPath();
                ctx.moveTo(pX, bY);
                ctx.lineTo(pX + pSide, bY - pSide);
                ctx.lineTo(pX + pW + pSide, bY - pSide);
                ctx.lineTo(pX + pW, bY);
                ctx.closePath();
                ctx.fill();
            }

            // Common scaling factor
            let scale = gameState.perspectiveMode ? b.layer : 1.0;

            // Draw details based on building type
            if (b.type === 'hut') {
                // roof
                ctx.fillStyle = b.roofColor;
                ctx.beginPath();
                ctx.moveTo(pX - 5, bY);
                if (gameState.perspectiveMode) {
                    ctx.lineTo(pX + pW / 2, bY - 15 * b.layer);
                } else {
                    ctx.lineTo(pX + pW / 2, bY - 15);
                }
                ctx.lineTo(pX + pW + 5, bY);
                ctx.fill();
                // door
                ctx.fillStyle = '#111';
                // door
                ctx.fillStyle = '#111';
                ctx.fillRect(pX + pW / 2 - (5 * scale), bY + b.height - (15 * scale), 10 * scale, 15 * scale);
                // windows
                ctx.fillStyle = '#ffeb3b';
                if (b.windows >= 1) ctx.fillRect(pX + 5 * scale, bY + 10 * scale, 8 * scale, 8 * scale);
                if (b.windows >= 2) ctx.fillRect(pX + pW - 13 * scale, bY + 10 * scale, 8 * scale, 8 * scale);
            } else if (b.type === 'tower') {
                // 3D Antenna
                ctx.fillStyle = '#222';
                ctx.fillRect(pX + pW / 2 - 1 * scale, bY - 20 * scale, 2 * scale, 20 * scale);
                // Blinking Light
                ctx.fillStyle = '#f44336';
                if (Math.floor(timestamp / 500) % 2 === 0) {
                    ctx.fillRect(pX + pW / 2 - 2 * scale, bY - 20 * scale, 4 * scale, 4 * scale);
                }
                
                ctx.fillStyle = '#ffeb3b';
                b.litLights.forEach(wy => {
                    ctx.fillRect(pX + pW / 2 - 4 * scale, bY + wy, 8 * scale, 10 * scale);
                });
            } else if (b.type === 'apt') {
                ctx.fillStyle = '#ffeb3b';
                b.litGrid.forEach(row => {
                    row.xList.forEach(wx => {
                        ctx.fillRect(pX + (5 + wx * 15) * scale, bY + row.y, 8 * scale, 10 * scale);
                    });
                });
            } else if (b.type === 'rubble') {
                // Draw low pile of debris
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.moveTo(pX, bY + b.height);
                // Irregular mound shape
                for (let j = 0; j <= 6; j++) {
                    let step = (pW / 6) * j;
                    let hFactor = j === 0 || j === 6 ? 0 : (0.5 + Math.random() * 0.5);
                    ctx.lineTo(pX + step, bY + b.height - (b.height * hFactor));
                }
                ctx.lineTo(pX + pW, bY + b.height);
                ctx.closePath();
                ctx.fill();
            } else if (b.type === 'scaffold') {
                // Construction Grid
                ctx.strokeStyle = '#5d4037';
                ctx.lineWidth = 2 * scale;
                // Vertical poles
                for(let sx = 0; sx <= pW; sx += 10 * scale) {
                    ctx.beginPath();
                    ctx.moveTo(pX + sx, bY); ctx.lineTo(pX + sx, bY + b.height);
                    ctx.stroke();
                }
                // Horizontal planks
                for(let sy = 0; sy <= b.height; sy += 15 * scale) {
                    ctx.beginPath();
                    ctx.moveTo(pX, bY + sy); ctx.lineTo(pX + pW, bY + sy);
                    ctx.stroke();
                }
                // Cross braces
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(pX, bY); ctx.lineTo(pX + pW, bY + b.height);
                ctx.moveTo(pX + pW, bY); ctx.lineTo(pX, bY + b.height);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            // Draw Damage (Cracks and Jagged bits)
            if (b.damage) {
                b.damage.forEach(dmg => {
                    ctx.save();
                    if (dmg.type === 'crack') {
                        ctx.strokeStyle = "rgba(255,255,255,0.1)"; // Light cracks for charred walls
                        if (b.type !== 'rubble') ctx.strokeStyle = "rgba(0,0,0,0.6)";
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(pX + dmg.x, bY + dmg.y);
                        ctx.lineTo(pX + dmg.x + dmg.w, bY + dmg.y + dmg.h);
                        ctx.stroke();
                    } else {
                        // Missing chunk, rubble or debris
                        ctx.fillStyle = (dmg.type === 'debris' || b.type === 'rubble') ? "rgba(40,40,40,0.9)" : "rgba(0,0,0,0.3)";
                        ctx.translate(pX + dmg.x, bY + dmg.y);
                        ctx.rotate(dmg.angle);
                        ctx.fillRect(-dmg.w/2, -dmg.h/2, dmg.w, dmg.h);
                    }
                    ctx.restore();
                });
            }

            // Draw Fire
            if (b.onFire) {
                let scale = gameState.perspectiveMode ? b.layer : 1.0;
                let fSize = 6 * scale; // Smaller base size
                
                // Slower blinking (400ms interval)
                ctx.fillStyle = (Math.floor(timestamp / 400) % 2 === 0) ? '#ff9800' : '#f44336';
                
                // More complex jagged fire
                ctx.beginPath();
                let fX = pX + pW / 2;
                let fY = bY;
                ctx.moveTo(fX - fSize, fY);
                // 5 jagged points
                for(let i = 0; i < 5; i++) {
                    let px = (fSize * 2 / 5) * i - fSize;
                    let pJitter = (Math.random() - 0.5) * 3 * scale;
                    let hJitter = Math.random() * 8 * scale;
                    ctx.lineTo(fX + px + pJitter, fY - fSize * 1.5 - hJitter);
                }
                ctx.lineTo(fX + fSize, fY);
                ctx.closePath();
                ctx.fill();

                // Smoke (appears after 3 rounds)
                if (b.fireRounds >= 3) {
                    ctx.fillStyle = "rgba(100, 100, 100, 0.6)";
                    // Small floating smoke squares
                    for (let s = 0; s < 3; s++) {
                        let sTime = (timestamp / 1000 + s * 0.5) % 2; // 2 second cycle
                        let sY = bY - 10 - (sTime * 40 * scale);
                        let sX = fX + Math.sin(timestamp / 500 + s) * 10 * scale;
                        let sAlpha = Math.max(0, 1 - sTime / 2);
                        ctx.globalAlpha = sAlpha;
                        let sSize = 2 + Math.random() * 2; // Maxwell 4px
                        ctx.fillRect(sX, sY, sSize, sSize);
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        });
    }

    // Draw Perspective Ground (Trapezoidal grid floor)
    const season = getSeasonData(gameState.round);
    let horizonY = grassLevel;

    if (!gameState.drivingMode) {
        let groundH = canvas.height - horizonY;
        
        // Draw base floor
        ctx.fillStyle = season.grass;
        ctx.fillRect(0, horizonY, canvas.width, groundH);
        
        if (gameState.perspectiveMode) {
            // Draw Perspective Lines (Geometric floor depth)
            ctx.strokeStyle = '#144317';
            ctx.lineWidth = 1;
            
            // Horizontal perspective lines (Subtle depth)
            for (let j = 0; j <= 10; j++) {
                let yLine = horizonY + (groundH * Math.pow(j/10, 2)); // Exponential spacing for depth
                ctx.beginPath();
                ctx.moveTo(0, yLine);
                ctx.lineTo(canvas.width, yLine);
                ctx.stroke();
            }
        }
    }

    // Draw Grass Foreground Jaggedness (Only at the very bottom edge of horizon)
    ctx.fillStyle = season.grass;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    if (!gameState.perspectiveMode) {
        for (let i = 0; i <= canvas.width + 20; i += 20) {
            ctx.lineTo(i - 10, horizonY - 15 - (i % 25)); // Original flatter jaggedness
            ctx.lineTo(i, horizonY);
        }
    } else {
        for (let i = 0; i <= canvas.width + 20; i += 20) {
            ctx.lineTo(i - 10, horizonY - 10 - (i % 15));
            ctx.lineTo(i, horizonY);
        }
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // Draw top border line for grass to define it
    ctx.strokeStyle = '#33691E';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Update & Draw Cars (drawn over background buildings and grass)
    if (gameState.cars && !gameState.drivingMode) {
        gameState.cars.forEach(car => {
            car.update(dt);
            car.draw(ctx);
        });
    }

    // Update & Draw Eagles (drawn over background buildings and grass)
    if (!gameState.drivingMode) {
        gameState.eagles.forEach(eagle => {
            eagle.update(dt);
            eagle.draw(ctx);
        });
        gameState.eagles = gameState.eagles.filter(eagle => eagle.y < canvas.height + 100 && eagle.y > -200);
    }

    // Update & Draw Hotdogs
    if (!gameState.drivingMode) {
        gameState.hotdogs.forEach(h => {
            h.update(dt);
            h.draw(ctx);
        });
        gameState.hotdogs = gameState.hotdogs.filter(h => h.y < canvas.height + 100 && h.y > -200);
    }

    // Update & Draw Seeking Missiles
    gameState.seekingMissiles.forEach(m => {
        m.update(dt);
        m.draw(ctx);
    });
    gameState.seekingMissiles = gameState.seekingMissiles.filter(m => !m.fullyDead);

    // Update Projectiles
    gameState.projectiles.forEach(p => {
        p.update(dt);
    });

    // Draw boss
    if (gameState.boss) {
    }
    gameState.bossProjectiles.forEach(p => p.draw(ctx));

    // Draw Fireworks
    gameState.fireworks.forEach(f => f.draw(ctx));

    // Draw Projectiles ON TOP of grass and foreground
    gameState.projectiles.forEach(p => {
        p.draw(ctx);
    });
    gameState.projectiles = gameState.projectiles.filter(p => !p.fullyDead);

    // Update & Draw Stick Figures
    if (!gameState.drivingMode) {
        gameState.stickFigures.forEach(sf => {
            sf.update(dt);
            sf.draw(ctx);
        });
        gameState.stickFigures = gameState.stickFigures.filter(sf => !sf.isDead);
    }

    // Draw Screen Flash
    if (flashFrames > 0) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashFrames--;
    }

    if (gameState.redFlashTimer > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${gameState.redFlashTimer})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        gameState.redFlashTimer -= dt;
    }

    if (isShaking) {
        ctx.restore();
    }

    // --- Draw Dog (Layered over background and grass) ---
    if (gameState.phase === 'DOG') {
        let dW = 200, dH = 260;
        let startY = canvas.height;
        let targetY = canvas.height - dH + 20;
        let dogY = startY;
        let currentDogImg = dogImg1;

        if (gameState.timer > 2) {
            let progress = (2.5 - gameState.timer) / 0.5;
            dogY = startY - progress * (startY - targetY);
        } else if (gameState.timer > 0.5) {
            dogY = targetY;
            if (Math.floor(gameState.timer * 6) % 2 === 0) {
                currentDogImg = dogImg2;
            } else {
                currentDogImg = dogImg1;
            }
        } else if (gameState.timer > 0) {
            let progress = (0.5 - gameState.timer) / 0.5;
            dogY = targetY + progress * (startY - targetY);
        }

        ctx.drawImage(currentDogImg, canvas.width / 2 - dW / 2, dogY, dW, dH);

        // Speech bubble
        if (gameState.timer > 0 && dogY < canvas.height - 50) {            // Render Quote
            ctx.fillStyle = "black";
            ctx.font = "8px 'Press Start 2P', cursive";
            let textMetrics = ctx.measureText(gameState.dogQuote);
            let bubbleW = Math.max(160, textMetrics.width + 30);
            let bubbleH = 40;
            let bubbleX = (canvas.width / 2 + dW / 2) + 5;
            let bubbleY = dogY - 40;

            if (bubbleX + bubbleW > canvas.width - 5) {
                bubbleX = (canvas.width / 2 - dW / 2) - bubbleW - 5;
            }
            if (bubbleX < 5) {
                bubbleX = Math.max(5, canvas.width / 2 - bubbleW / 2);
            }

            let pSize = 4;
            ctx.fillStyle = "black";
            ctx.fillRect(bubbleX - pSize, bubbleY, bubbleW + pSize * 2, bubbleH);
            ctx.fillRect(bubbleX, bubbleY - pSize, bubbleW, bubbleH + pSize * 2);
            ctx.fillStyle = "white";
            ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(gameState.dogQuote, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
        }
    }

    // --- Draw Doom-style UI (Portrait & Gun) ---
    let dSize = 4;
    let uiYOffset = 85; // strictly above bottom UI bar

    // Background Dark Rectangle (10px inset to portrait)
    let bgBoxX = 10;
    let bgBoxY = canvas.height - uiYOffset - 15 * dSize - 20;
    let bgBoxW = 16 * dSize + 20;
    let bgBoxH = 15 * dSize + 20;

    ctx.fillStyle = "#ffeb3b"; // Yellow backing
    ctx.fillRect(bgBoxX, bgBoxY, bgBoxW, bgBoxH);
    
    if (gameState.perspectiveMode) {
        // Volumetric 3D Portrait Frame
        let depth = 8;
        // Dark top inner face
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath();
        ctx.moveTo(bgBoxX, bgBoxY);
        ctx.lineTo(bgBoxX + depth, bgBoxY + depth);
        ctx.lineTo(bgBoxX + bgBoxW - depth, bgBoxY + depth);
        ctx.lineTo(bgBoxX + bgBoxW, bgBoxY);
        ctx.fill();
        // Dark left inner face
        ctx.fillStyle = "#050505";
        ctx.beginPath();
        ctx.moveTo(bgBoxX, bgBoxY);
        ctx.lineTo(bgBoxX + depth, bgBoxY + depth);
        ctx.lineTo(bgBoxX + depth, bgBoxY + bgBoxH - depth);
        ctx.lineTo(bgBoxX, bgBoxY + bgBoxH);
        ctx.fill();
    }

    ctx.strokeStyle = "#b71c1c"; // Red outer border
    ctx.lineWidth = 4;
    ctx.strokeRect(bgBoxX, bgBoxY, bgBoxW, bgBoxH);

    // Inner Portrait (10px inset from the bgBox)
    let portraitX = bgBoxX + 10;
    let portraitY = bgBoxY + 10;

    drawPortrait(ctx, portraitX, portraitY, gameState.character, timestamp, dSize, 
                 timestamp < gameState.baldUntil, gameState.powerUpActive, 
                 gameState.hotdogPowerUpActive, true, false);

    // Static Gun Rotated (Now dynamic based on aiming)
    let gunX = bgBoxX + bgBoxW + 20;
    let gunY = canvas.height - uiYOffset + 10; // set pivot at bottom of screen

    // Smoothly track current aim regardless of firing (Active HUD tracking)
    currentAimAngle = Math.atan2(currentAimY - gunY, currentAimX - gunX) + Math.PI / 2;

    // --- Draw Driving Mode Overlay ---
    if (gameState.drivingMode) {
        gameState.drivingMode.drawOver(ctx);
    } else {
        drawWeapon(ctx, gunX, gunY, currentAimAngle, gameState.character, gameState.round >= 30, gameState.powerUpActive, dSize, timestamp);
    }

    // --- Draw Splatters (Top layer) ---
    if (gameState.splatters) {
        gameState.splatters.forEach(s => s.draw(ctx));
    }

    // --- Draw Floating Texts (ON TOP OF EVERYTHING) ---
    gameState.floatingTexts.forEach(ft => {
        let pSize = (ft.size / 10) || 3.5;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.timer / 0.5);
        
        // Use life for persistent movement
        ft.y -= 30 * dt;
        ft.timer -= dt;
        ft.life -= dt;


        let totalWidth = ft.text.length * 4 * pSize;
        let startX = ft.x - totalWidth / 2;

        // Draw white background or speech bubble outline for boss taunts
        if (ft.size === 20) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            let pad = 10;
            let bh = pSize * 5 + pad * 2;
            let bw = totalWidth + pad * 2;
            let bx = startX - pad;
            let by = ft.y - pad;
            ctx.roundRect(bx, by, bw, bh, 5);
            ctx.fill();
            
            // Bubble tail
            ctx.beginPath();
            ctx.moveTo(ft.x, ft.y + bh - pad);
            ctx.lineTo(ft.x - 5, ft.y + bh + 10);
            ctx.lineTo(ft.x + 5, ft.y + bh - pad);
            ctx.fill();
            
            ctx.fillStyle = 'black'; // Text color for taunts
        } else {
            // Standard floating text shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            for (let i = 0; i < ft.text.length; i++) {
                let char = ft.text[i].toUpperCase();
                let pattern = pixelFont[char] || pixelFont[' '];
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 3; col++) {
                        if (pattern[row][col] === '#') {
                            ctx.fillRect(startX + col * pSize + i * 4 * pSize - pSize/2, ft.y + row * pSize - pSize/2, pSize * 2, pSize * 2);
                        }
                    }
                }
            }
            ctx.fillStyle = ft.color || '#FFeb3b';
        }

        // Draw text
        for (let i = 0; i < ft.text.length; i++) {
            let char = ft.text[i].toUpperCase();
            let pattern = pixelFont[char] || pixelFont[' '];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 3; col++) {
                    if (pattern[row][col] === '#') {
                        ctx.fillRect(startX + col * pSize + i * 4 * pSize, ft.y + row * pSize, pSize, pSize);
                    }
                }
            }
        }

        ctx.restore();
    });
    gameState.floatingTexts = gameState.floatingTexts.filter(ft => ft.life > 0);

    drawPresenceIndicator(ctx, dt);

    // Poop Stain Screen Effect (Drawn on top of everything before final UI elements or as final overlay)
    if (gameState.poopStainTimer > 0) {
        ctx.save();
        let opacity = 1.0;
        if (gameState.poopStainTimer < 0.5) {
            opacity = gameState.poopStainTimer / 0.5;
        }
        ctx.globalAlpha = opacity;
        
        // Draw centered, roughly 30% of screen area
        let sW = canvas.width * 0.7;
        let sH = canvas.height * 0.6;
        ctx.drawImage(poopStainImg, canvas.width/2 - sW/2 + gameState.poopStainX, canvas.height/2 - sH/2 + gameState.poopStainY, sW, sH);
        
        ctx.restore();
        gameState.poopStainTimer -= dt;
    }

    requestAnimationFrame(gameLoop);
}

// Start Screen Hookup
const startScreen = document.getElementById('start-screen');
const charSelection = document.getElementById('char-selection');
const startBtn = document.getElementById('start-btn');
const startBtn3d = document.getElementById('start-3d-btn');
const startBtnFs = document.getElementById('start-btn-fs');
const toggleFs = document.getElementById('toggle-fs');

function toggleFullscreen(e) {
    if (e) {
        e.stopPropagation();
    }
    let doc = document.documentElement;
    let isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFullscreen) {
        let requestFS = doc.requestFullscreen || doc.webkitRequestFullscreen || doc.mozRequestFullScreen || doc.msRequestFullscreen;
        if (requestFS) {
            let promise = requestFS.call(doc);
            if (promise) {
                promise.catch(err => console.error("Fullscreen error:", err));
            }
        }
    } else {
        let exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFS) {
            exitFS.call(document);
        }
    }
}

function selectCharacter(id) {
    let unlocked = (id === 1 || (id === 2 && gameState.maxRoundReached >= 10) || (id === 3 && gameState.maxRoundReached >= 20));
    if (!unlocked) return;

    gameState.character = id;
    charSelection.style.display = 'none';

    if (id === 1) {
        gameState.ammo = 8;
    } else if (id === 2) {
        gameState.lives = 6;
    }
    updateUI();
    
    gameState.phase = 'SPAWN';
    gameState.lastTime = performance.now();
    startBGM(gameState.round);
    
    // Global presence update
    if (typeof setPlayerPresence === 'function') {
        setPlayerPresence(id);
    }
}
function showVendingScreen() {
    // Save state
    savedGameState = {};
    for (let key in gameState) {
        if (typeof gameState[key] !== 'object' || gameState[key] === null) {
            savedGameState[key] = gameState[key];
        }
    }

    gameState.phase = 'SHADOW'; // Pauses the game loop
    
    // Stop persistent powerup sounds
    if (sirenSource) {
        sirenSource.stop();
        sirenSource.disconnect();
        sirenSource = null;
    }
    if (cyberpunkSource) {
        cyberpunkSource.stop();
        cyberpunkSource.disconnect();
        cyberpunkSource = null;
    }

    vendingScreen.style.display = 'flex';
    
    // Update button states based on score
    buyLifeBtn.disabled = gameState.score < 20000;
    buyBlessingBtn.disabled = gameState.score < 30000 || gameState.blessingRounds > 0;
    buySkipBtn.disabled = gameState.score < 50000;
}

buyLifeBtn.onclick = () => {
    if (gameState.score >= 20000) {
        gameState.score -= 20000;
        gameState.lives++;
        playSound(jingleBuffer);
        updateUI();
        // Update buttons
        buyLifeBtn.disabled = gameState.score < 20000;
        buyBlessingBtn.disabled = gameState.score < 30000 || gameState.blessingRounds > 0;
        buySkipBtn.disabled = gameState.score < 50000;
    }
};

buyBlessingBtn.onclick = () => {
    if (gameState.score >= 30000 && gameState.blessingRounds <= 0) {
        gameState.score -= 30000;
        gameState.blessingRounds = 3;
        playSound(jingleBuffer);
        updateUI();
        // Update buttons
        buyLifeBtn.disabled = gameState.score < 20000;
        buyBlessingBtn.disabled = true;
        buySkipBtn.disabled = gameState.score < 50000;
    }
};

buySkipBtn.onclick = () => {
    if (gameState.score >= 50000) {
        gameState.score -= 50000;
        gameState.round += 10;
        playSound(jingleBuffer);
        updateUI();
        // Update buttons
        buyLifeBtn.disabled = gameState.score < 20000;
        buyBlessingBtn.disabled = gameState.score < 30000 || gameState.blessingRounds > 0;
        buySkipBtn.disabled = gameState.score < 50000;
    }
};

vendingContinueBtn.onclick = () => {
    vendingScreen.style.display = 'none';
    
    // Update round display in case it was skipped
    document.getElementById('round-display').innerText = 'R=' + gameState.round;

    // Apply stats to savedGameState before restoring
    if (savedGameState) {
        // Keep the values we might have modified in the vending machine
        let currentScore = gameState.score;
        let currentLives = gameState.lives;
        let currentRound = gameState.round;
        let currentBlessing = gameState.blessingRounds;
        
        // Restore primitives
        Object.assign(gameState, savedGameState);
        
        // Re-apply modified values
        gameState.score = currentScore;
        gameState.lives = currentLives;
        gameState.round = currentRound;
        gameState.blessingRounds = currentBlessing;
        
        savedGameState = null;
    }
    
    // Ensure transient arrays are empty/reset for the next round
    gameState.ducks = [];
    gameState.projectiles = [];
    gameState.airplanes = [];
    gameState.tigers = [];
    gameState.eagles = [];
    gameState.hotdogs = [];
    gameState.seekingMissiles = [];
    gameState.floatingTexts = [];

    gameState.phase = 'SPAWN';
    gameState.lastTime = performance.now();
    updateUI();
    
    // RESTART the main game loop!
    requestAnimationFrame(gameLoop);
};

window.selectCharacter = selectCharacter;

function startGame(is3D = false) {
    gameState.perspectiveMode = is3D;
    startScreen.style.display = 'none';
    almanachScreen.style.display = 'none';
    charSelection.style.display = 'flex';
    document.getElementById('reset-btn').style.display = 'none';

    if (introCtx) introCtx.clearRect(0, 0, introCanvas.width, introCanvas.height);
    gameState.introDuck.x = -100;
    gameState.introDuck.y = -100;
    gameState.introDuck.landed = false;
    gameState.introDuck.timer = 0;
    
    // Draw portraits on selection cards
    setTimeout(() => {
        [1, 2, 3].forEach(id => {
            const canvas_id = `p-${id}`;
            const box = document.getElementById(canvas_id);
            const card = document.getElementById(`char-${id}`);
            if (!box || !card) return;
            
            let unlocked = (id === 1 || (id === 2 && gameState.maxRoundReached >= 10) || (id === 3 && gameState.maxRoundReached >= 20));
            
            box.innerHTML = '';
            const cvs = document.createElement('canvas');
            cvs.width = 64;
            cvs.height = 60;
            box.appendChild(cvs);
            const cctx = cvs.getContext('2d');
            drawPortrait(cctx, 0, 0, id, performance.now(), 4, false, false, false, false, !unlocked);
            
            if (!unlocked) {
                card.classList.add('locked');
                card.querySelector('.char-desc').innerText = "You have not met this adventurer yet!";
                card.style.cursor = "not-allowed";
                card.style.opacity = "0.7";
            } else {
                card.classList.remove('locked');
                card.style.cursor = "pointer";
                card.style.opacity = "1.0";
                // Restore descriptions
                const descs = [
                    "",
                    "The Urban Stalker: Master of the hunt. Starts with 8 shells.",
                    "The Ascetic: Divine protection. Starts with 6 lives.",
                    "The Arbitrator: Law & Order. 20% bonus points."
                ];
                card.querySelector('.char-desc').innerText = descs[id];
            }
        });
    }, 10);

    gameState.lives = 5;
    gameState.score = 0;
    gameState.killCount = 0;
    gameState.tigersKilled = 0;
    gameState.airplanesKilled = 0;
    gameState.portraitClicks = 0;
    gameState.baldUntil = 0;
    gameState.round = 1;
    gameState.perfectRounds = 0;
    gameState.sunClicksPostRings = 0;
    gameState.isSunWinking = false;
    gameState.cars = [];
    document.getElementById('round-display').innerText = 'R=1';

    gameState.hotdogs = [];
    gameState.seekingMissiles = [];
    gameState.airplanes = [];
    gameState.tigers = [];
    gameState.floatingTexts = [];
    gameState.heavyBombers = [];
    gameState.bomberSpawnTimer = 0;
    gameState.lastAirplaneTime = performance.now();
    gameState.boss = null;
    gameState.bossProjectiles = [];
    gameState.fireworks = [];
    gameState.victoryTimer = 0;

    // ALWAYS RESET BUILDINGS, HILLS AND ATMOSPHERE FOR NEW GAME
    gameState.buildings = [];
    gameState.hills = [];
    gameState.permanentClouds = [];
    spawnBuildings(1, true);
    spawnHills();
    
    // Save these as the current snapshot
    gameState.buildingSnapshot = JSON.parse(JSON.stringify(gameState.buildings));
    gameState.hillSnapshot = JSON.parse(JSON.stringify(gameState.hills));
    localStorage.setItem('mallard_buildings', JSON.stringify(gameState.buildingSnapshot));
    localStorage.setItem('mallard_hills', JSON.stringify(gameState.hillSnapshot));

    if (somberSource) {
        somberSource.stop();
        somberSource.disconnect();
        somberSource = null;
    }
    if (cheerfulSource) {
        cheerfulSource.stop();
        cheerfulSource.disconnect();
        cheerfulSource = null;
    }
    if (sirenSource) {
        sirenSource.stop();
        sirenSource.disconnect();
        sirenSource = null;
    }
    if (cyberpunkSource) {
        cyberpunkSource.stop();
        cyberpunkSource.disconnect();
        cyberpunkSource = null;
    }
}

startBtn.addEventListener('click', () => startGame(false));
startBtn.addEventListener('touchstart', () => startGame(false), { passive: true });

startBtn3d.addEventListener('click', () => startGame(true));
startBtn3d.addEventListener('touchstart', () => startGame(true), { passive: true });

function launchFsAndStart(e) {
    toggleFullscreen(e);
    startGame(false);
}

startBtnFs.addEventListener('click', launchFsAndStart);
startBtnFs.addEventListener('touchstart', launchFsAndStart, { passive: true });

toggleFs.addEventListener('click', toggleFullscreen);
toggleFs.addEventListener('touchstart', toggleFullscreen, { passive: true });

const resetBtn = document.getElementById('reset-btn');
function resetToStart(e) {
    if (e) e.stopPropagation();
    resetBtn.style.display = 'none';
    if (somberSource) {
        somberSource.stop();
        somberSource.disconnect();
        somberSource = null;
    }
    if (cheerfulSource) {
        cheerfulSource.stop();
        cheerfulSource.disconnect();
        cheerfulSource = null;
    }
    if (sirenSource) {
        sirenSource.stop();
        sirenSource.disconnect();
        sirenSource = null;
    }
    if (cyberpunkSource) {
        cyberpunkSource.stop();
        cyberpunkSource.disconnect();
        cyberpunkSource = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameState.phase = 'START';
    startScreen.style.display = 'flex';
}
resetBtn.addEventListener('click', resetToStart);
resetBtn.addEventListener('touchstart', resetToStart, { passive: true });

// Start Game visual loop (only background draws until button click)
gameState.lastTime = performance.now();
// (Redundant call removed - loop starts at bottom of file)
function drawPortrait(ctx, portraitX, portraitY, charId, timestamp, dSize, isBald, isPowerActive, isHotdogActive, clip, isLocked) {
    ctx.save();
    
    if (isPowerActive) {
        let pCenterX = portraitX + 8 * dSize;
        let pCenterY = portraitY + 7.5 * dSize;
        let shakeDir = (Math.floor(timestamp / 100) % 2 === 0) ? 2 : -2;
        ctx.translate(pCenterX + shakeDir, pCenterY);
        ctx.scale(1.2, 1.2);
        ctx.translate(-pCenterX, -pCenterY);
    } else if (isHotdogActive) {
        let pCenterX = portraitX + 8 * dSize;
        let pCenterY = portraitY + 7.5 * dSize;
        ctx.translate(pCenterX, pCenterY);
        ctx.scale(1.5, 1.5);
        ctx.translate(-pCenterX, -pCenterY);
    }

    // Portrait Background Box
    ctx.fillStyle = isLocked ? "#222" : "#424242";
    ctx.fillRect(portraitX, portraitY, 16 * dSize, 15 * dSize);

    if (isLocked) {
        // Locked State: Grayed out and question mark
        ctx.fillStyle = "#444";
        ctx.fillRect(portraitX + 4 * dSize, portraitY + 4 * dSize, 8 * dSize, 9 * dSize);
        // Question Mark
        ctx.fillStyle = "#888";
        ctx.font = `${6 * dSize}px 'Press Start 2P', cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", portraitX + 8 * dSize, portraitY + 7.5 * dSize);
        ctx.restore();
        return;
    }

    // Skin (Face base)
    ctx.fillStyle = "#ffcc80";

    if (charId === 1) { // Default Hoodie
        let transitionProgress = Math.min(Math.max(gameState.round - 1, 0) / 29, 1.0);
        let hr = Math.floor(156 + (76 - 156) * transitionProgress);
        let hg = Math.floor(39 + (175 - 39) * transitionProgress);
        let hb = Math.floor(176 + (80 - 176) * transitionProgress);
        let hoodieColor = `rgb(${hr}, ${hg}, ${hb})`;

        if (isBald) {
            ctx.fillRect(portraitX + 3 * dSize, portraitY + 2 * dSize, 10 * dSize, 11 * dSize);
            ctx.fillStyle = hoodieColor;
            ctx.fillRect(portraitX + 2 * dSize, portraitY + 13 * dSize, 12 * dSize, 2 * dSize);
        } else {
            ctx.fillRect(portraitX + 4 * dSize, portraitY + 4 * dSize, 8 * dSize, 9 * dSize);
            ctx.fillStyle = hoodieColor;
            ctx.fillRect(portraitX + 3 * dSize, portraitY + 2 * dSize, 10 * dSize, 2 * dSize);
            ctx.fillRect(portraitX + 2 * dSize, portraitY + 3 * dSize, 2 * dSize, 10 * dSize);
            ctx.fillRect(portraitX + 12 * dSize, portraitY + 3 * dSize, 2 * dSize, 10 * dSize);
            ctx.fillRect(portraitX + 2 * dSize, portraitY + 13 * dSize, 12 * dSize, 2 * dSize);
            ctx.fillStyle = `rgb(${Math.floor(hr * 0.6)}, ${Math.floor(hg * 0.6)}, ${Math.floor(hb * 0.6)})`;
            ctx.fillRect(portraitX + 3 * dSize, portraitY + 4 * dSize, 1 * dSize, 9 * dSize);
            ctx.fillRect(portraitX + 12 * dSize, portraitY + 4 * dSize, 1 * dSize, 9 * dSize);
        }
    } else if (charId === 2) { // Priest
        let robeColor = "#5d4037";
        // Always balding dome
        ctx.fillRect(portraitX + 3 * dSize, portraitY + 2 * dSize, 10 * dSize, 11 * dSize);
        // Beard
        ctx.fillStyle = "#eee";
        ctx.fillRect(portraitX + 4 * dSize, portraitY + 9 * dSize, 8 * dSize, 4 * dSize);
        // Robe
        ctx.fillStyle = robeColor;
        ctx.fillRect(portraitX + 2 * dSize, portraitY + 12 * dSize, 12 * dSize, 3 * dSize);
    } else if (charId === 3) { // Judge
        let wigColor = "#fff";
        ctx.fillRect(portraitX + 4 * dSize, portraitY + 4 * dSize, 8 * dSize, 9 * dSize);
        // Wig
        ctx.fillStyle = wigColor;
        ctx.fillRect(portraitX + 2 * dSize, portraitY + 2 * dSize, 12 * dSize, 4 * dSize);
        ctx.fillRect(portraitX + 2 * dSize, portraitY + 6 * dSize, 2 * dSize, 7 * dSize);
        ctx.fillRect(portraitX + 12 * dSize, portraitY + 6 * dSize, 2 * dSize, 7 * dSize);
        // Black Robe
        ctx.fillStyle = "#111";
        ctx.fillRect(portraitX + 2 * dSize, portraitY + 13 * dSize, 12 * dSize, 2 * dSize);
    }

    // Eyes
    ctx.fillStyle = "white";
    ctx.fillRect(portraitX + 5 * dSize, portraitY + 6 * dSize, 2 * dSize, 1 * dSize);
    ctx.fillRect(portraitX + 9 * dSize, portraitY + 6 * dSize, 2 * dSize, 1 * dSize);
    ctx.fillStyle = "black";
    ctx.fillRect(portraitX + 6 * dSize, portraitY + 6 * dSize, 1 * dSize, 1 * dSize);
    ctx.fillRect(portraitX + 9 * dSize, portraitY + 6 * dSize, 1 * dSize, 1 * dSize);

    // Mouth
    if (isHotdogActive) {
        let eatFrame = Math.floor(timestamp / 300) % 4;
        ctx.fillStyle = '#4e342e';
        if (eatFrame === 0 || eatFrame === 2) {
            ctx.fillRect(portraitX + 6 * dSize, portraitY + 10 * dSize, 4 * dSize, 1 * dSize);
        } else {
            ctx.fillRect(portraitX + 6 * dSize, portraitY + 9 * dSize, 4 * dSize, 3 * dSize);
            ctx.fillStyle = 'white';
            ctx.fillRect(portraitX + 6 * dSize, portraitY + 9 * dSize, 4 * dSize, 1 * dSize);
        }
        let hdp = 6;
        let hdOffsets = [{ x: portraitX + 13 * dSize, remaining: 5 },{ x: portraitX + 10 * dSize, remaining: 5 },{ x: portraitX + 11 * dSize, remaining: 3 },{ x: portraitX + 12 * dSize, remaining: 1 }];
        let hd = hdOffsets[eatFrame];
        let hy = portraitY + 9 * dSize - hdp/2;
        if (hd.remaining > 0) {
            let hdW = hd.remaining * hdp;
            ctx.fillStyle = '#c8860a'; ctx.fillRect(hd.x, hy, hdW, hdp);
            ctx.fillStyle = '#b94040'; ctx.fillRect(hd.x, hy + hdp, hdW, hdp);
            ctx.fillStyle = '#c8860a'; ctx.fillRect(hd.x, hy + 2 * hdp, hdW, hdp);
            if (hd.remaining >= 3) { ctx.fillStyle = '#ffeb3b'; ctx.fillRect(hd.x + hdp, hy + hdp, hdp, hdp); }
        }
    } else {
        ctx.fillStyle = "#4e342e";
        if (Math.floor(timestamp / 300) % 2 === 0) {
            ctx.fillRect(portraitX + 6 * dSize, portraitY + 9 * dSize, 4 * dSize, 3 * dSize);
            ctx.fillStyle = "white"; ctx.fillRect(portraitX + 6 * dSize, portraitY + 9 * dSize, 4 * dSize, 1 * dSize);
        } else {
            ctx.fillRect(portraitX + 6 * dSize, portraitY + 10 * dSize, 4 * dSize, 1 * dSize);
        }
    }

    if (isPowerActive) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
        ctx.fillRect(portraitX, portraitY, 16 * dSize, 15 * dSize);
    }
    if (isHotdogActive) {
        ctx.fillStyle = '#111';
        ctx.fillRect(portraitX + 7 * dSize, portraitY + 6 * dSize, 2 * dSize, 1 * dSize);
        ctx.fillStyle = '#f44336';
        ctx.fillRect(portraitX + 4 * dSize, portraitY + 5 * dSize, 3 * dSize, 2 * dSize);
        ctx.fillRect(portraitX + 9 * dSize, portraitY + 5 * dSize, 3 * dSize, 2 * dSize);
    }
    ctx.restore();
}

function drawWeapon(ctx, gunX, gunY, aimAngle, charId, isGolden, isPowerActive, dSize, timestamp) {
    ctx.save();
    ctx.translate(gunX, gunY);
    ctx.rotate(aimAngle);

    if (charId === 1) { // Default Shotgun
        let barrelLen = 31 * dSize;
        let bW = 10 * dSize;
        let bH = barrelLen;
        
        ctx.fillStyle = isGolden ? "#d4af37" : "#212121";
        ctx.fillRect(0, -barrelLen - 4 * dSize, bW, bH);
        
        if (gameState.perspectiveMode) {
            let side = 3 * dSize;
            // 3D Side Face
            ctx.fillStyle = isGolden ? "#aa8a20" : "#111111";
            ctx.beginPath();
            ctx.moveTo(bW, -barrelLen - 4 * dSize);
            ctx.lineTo(bW + side, -barrelLen - 4 * dSize - side);
            ctx.lineTo(bW + side, -4 * dSize - side);
            ctx.lineTo(bW, -4 * dSize);
            ctx.fill();
            // 3D Top Face
            ctx.fillStyle = isGolden ? "#fbf5b7" : "#444444";
            ctx.beginPath();
            ctx.moveTo(0, -barrelLen - 4 * dSize);
            ctx.lineTo(side, -barrelLen - 4 * dSize - side);
            ctx.lineTo(bW + side, -barrelLen - 4 * dSize - side);
            ctx.lineTo(bW, -barrelLen - 4 * dSize);
            ctx.fill();
        }

        ctx.fillStyle = isGolden ? "#fbf5b7" : "#757575";
        ctx.fillRect(1 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
        ctx.fillRect(6 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
        ctx.fillStyle = "#000"; ctx.fillRect(4 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
        
        // Stock
        ctx.fillStyle = "#388e3c"; 
        ctx.fillRect(-2 * dSize, -7 * dSize, 14 * dSize, 7 * dSize);
        if (gameState.perspectiveMode) {
             ctx.fillStyle = "#1b5e20";
             ctx.beginPath();
             ctx.moveTo(12 * dSize, -7 * dSize);
             ctx.lineTo(15 * dSize, -10 * dSize);
             ctx.lineTo(15 * dSize, -3 * dSize);
             ctx.lineTo(12 * dSize, 0);
             ctx.fill();
        }
        if (isPowerActive) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
            ctx.fillRect(0, -barrelLen - 4 * dSize, 10 * dSize, barrelLen);
            ctx.fillRect(-2 * dSize, -7 * dSize, 14 * dSize, 7 * dSize);
        }
    } else if (charId === 2) { // Magic Staff
        let staffLen = 40 * dSize;
        let sW = 4 * dSize;
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(3 * dSize, -staffLen, sW, staffLen);
        
        if (gameState.perspectiveMode) {
            let side = 2 * dSize;
            ctx.fillStyle = "#3e2723";
            ctx.beginPath();
            ctx.moveTo(3 * dSize + sW, -staffLen);
            ctx.lineTo(3 * dSize + sW + side, -staffLen - side);
            ctx.lineTo(3 * dSize + sW + side, -side);
            ctx.lineTo(3 * dSize + sW, 0);
            ctx.fill();
        }
        // Diamond atop
        ctx.fillStyle = "#81d4fa";
        ctx.beginPath();
        ctx.moveTo(5 * dSize, -staffLen - 8 * dSize);
        ctx.lineTo(8 * dSize, -staffLen - 4 * dSize);
        ctx.lineTo(5 * dSize, -staffLen);
        ctx.lineTo(2 * dSize, -staffLen - 4 * dSize);
        ctx.closePath();
        ctx.fill();
        // Glow
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(timestamp / 200);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(5 * dSize, -staffLen - 4 * dSize, 6 * dSize, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    } else if (charId === 3) { // Flaming Scroll
        let scrollW = 12 * dSize;
        let scrollH = 20 * dSize;
        let sX = -scrollW / 2 + 5 * dSize;
        let sY = -scrollH - 5 * dSize;
        ctx.fillStyle = "#f5f5dc";
        ctx.fillRect(sX, sY, scrollW, scrollH);
        
        if (gameState.perspectiveMode) {
            let side = 2 * dSize;
            ctx.fillStyle = "#d2b48c";
            ctx.beginPath();
            ctx.moveTo(sX + scrollW, sY);
            ctx.lineTo(sX + scrollW + side, sY - side);
            ctx.lineTo(sX + scrollW + side, sY + scrollH - side);
            ctx.lineTo(sX + scrollW, sY + scrollH);
            ctx.fill();
        }
        
        // Scribbles (Ancient text)
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        for (let i = 0; i < 5; i++) {
            let rowY = sY + 3 * dSize + i * 3 * dSize;
            let lineW = scrollW - 4 * dSize;
            ctx.fillRect(sX + 2 * dSize, rowY, lineW * 0.7 + Math.random() * (lineW * 0.3), 1.5 * dSize);
        }

        // Spindles
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(sX - 1 * dSize, sY - 1 * dSize, scrollW + 2 * dSize, 2 * dSize);
        ctx.fillRect(sX - 1 * dSize, sY + scrollH - 1 * dSize, scrollW + 2 * dSize, 2 * dSize);
        
        // Jagged Flames
        let fBaseY = sY - 1 * dSize;
        let fCenterX = sX + scrollW / 2;
        ctx.fillStyle = "#f44336";
        
        // Multi-point jagged flame
        ctx.beginPath();
        ctx.moveTo(fCenterX - scrollW / 2, fBaseY);
        for(let i = 0; i < 5; i++) {
            let step = (scrollW / 5) * i;
            let jitterX = (Math.random() - 0.5) * 4 * dSize;
            let jitterY = Math.random() * 10 * dSize;
            let phase = timestamp / 100 + i;
            let h = 15 * dSize + Math.sin(phase) * 5 * dSize + jitterY;
            ctx.lineTo(fCenterX - scrollW / 2 + step + jitterX, fBaseY - h);
        }
        ctx.lineTo(fCenterX + scrollW / 2, fBaseY);
        ctx.closePath();
        ctx.fill();

        // Inner orange flame core for more "fire" look
        ctx.fillStyle = "#ff9800";
        ctx.beginPath();
        ctx.moveTo(fCenterX - scrollW / 3, fBaseY);
        for(let i = 0; i < 3; i++) {
            let phase = timestamp / 80 + i;
            let h = 8 * dSize + Math.cos(phase) * 3 * dSize;
            ctx.lineTo(fCenterX - scrollW / 4 + i * (scrollW / 2), fBaseY - h);
        }
        ctx.lineTo(fCenterX + scrollW / 3, fBaseY);
        ctx.closePath();
        ctx.fill();
    }

    // Muzzle Flash
    let timeSinceShot = performance.now() - lastShotTime;
    if (timeSinceShot < 100) {
        let barrelLen = (charId === 1) ? 31 * dSize : (charId === 2 ? 45 * dSize : 25 * dSize);
        if (timeSinceShot < 40) {
            ctx.fillStyle = "#ff9800"; ctx.fillRect(-4 * dSize, -barrelLen - 12 * dSize, 18 * dSize, 10 * dSize);
            ctx.fillStyle = "#ffeb3b"; ctx.fillRect(-2 * dSize, -barrelLen - 10 * dSize, 14 * dSize, 6 * dSize);
        } else {
            ctx.fillStyle = "#ffeb3b"; ctx.fillRect(0, -barrelLen - 8 * dSize, 10 * dSize, 5 * dSize);
        }
    }
    ctx.restore();
}

function drawShadowyMonk(ctx, frame, timestamp, w, h, noClear) {
    const canvasW = w || shadowyMonkCanvas.width;
    const canvasH = h || shadowyMonkCanvas.height;
    if (!noClear) ctx.clearRect(0, 0, canvasW, canvasH);
    
    let dSize = canvasH / 26; // Dynamic size based on height
    let centerX = canvasW / 2;
    // For smaller icons, push him up to fit
    let centerY = canvasH / 2 + (canvasH < 100 ? dSize * 2 : canvasH * 0.12);
    
    // Animation offset
    let yOff = Math.sin(timestamp / 200) * (canvasH * 0.02);
    let mouthStep = (frame % 3);

    ctx.save();
    ctx.translate(centerX, centerY + yOff);
    
    // Body / Robe (Jagged/Pixelated style)
    ctx.fillStyle = "#1b5e20"; // Dark green
    ctx.beginPath();
    ctx.moveTo(-6 * dSize, 5 * dSize);
    ctx.lineTo(6 * dSize, 5 * dSize);
    ctx.lineTo(10 * dSize, 18 * dSize);
    ctx.lineTo(-10 * dSize, 18 * dSize);
    ctx.closePath();
    ctx.fill();
    
    // Hood (Trapezoid with rounded feel)
    ctx.fillStyle = "#144317"; // Slightly darker hood
    ctx.beginPath();
    // Top of trapezoid (narrower)
    ctx.moveTo(-4 * dSize, -10 * dSize);
    ctx.lineTo(4 * dSize, -10 * dSize);
    // Shoulders (wider)
    ctx.lineTo(11 * dSize, 5 * dSize);
    ctx.lineTo(-11 * dSize, 5 * dSize);
    ctx.closePath();
    ctx.fill();
    
    // Add "rounding" to the top of the hood
    ctx.beginPath();
    ctx.arc(0, -9.5 * dSize, 4 * dSize, Math.PI, 0);
    ctx.fill();
    
    // Face (Absolute Black shadow)
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(-3.5 * dSize, -7 * dSize);
    ctx.lineTo(3.5 * dSize, -7 * dSize);
    ctx.lineTo(4.5 * dSize, 3 * dSize);
    ctx.lineTo(-4.5 * dSize, 3 * dSize);
    ctx.closePath();
    ctx.fill();
    
    // Red Dash Eyes (Glowing red dashes)
    ctx.fillStyle = "#ff1744"; // Vibrant red
    let eyeGlow = 0.7 + 0.3 * Math.sin(timestamp / 100);
    ctx.globalAlpha = eyeGlow;
    // Two red horizontal dashes
    ctx.fillRect(-2.5 * dSize, -3.5 * dSize, 1.8 * dSize, 0.4 * dSize); // Left eye
    ctx.fillRect(0.7 * dSize, -3.5 * dSize, 1.8 * dSize, 0.4 * dSize);  // Right eye
    ctx.globalAlpha = 1.0;

    // Talking animation (Moving shadow mouth)
    if (mouthStep > 0) {
        ctx.fillStyle = "#050505";
        ctx.fillRect(-1.5 * dSize, 1 * dSize - (mouthStep * 4), 3 * dSize, 1.5 * dSize);
    }
    
    // Headphones if radio active
    if (gameState.settings.radioStation && gameState.settings.radioStation !== 'Disabled') {
        ctx.fillStyle = "#333";
        // Left cup
        ctx.fillRect(-5 * dSize, -5 * dSize, 1.5 * dSize, 4 * dSize);
        // Right cup
        ctx.fillRect(3.5 * dSize, -5 * dSize, 1.5 * dSize, 4 * dSize);
        // Headband
        ctx.beginPath();
        ctx.lineWidth = 1.5 * dSize;
        ctx.strokeStyle = "#333";
        ctx.arc(0, -5 * dSize, 4.5 * dSize, Math.PI, 0);
        ctx.stroke();
    }
    
    ctx.restore();
}

function showShadowyScreen(round, isNewUnlockRecord, isBossVictory) {
    // Save current game state primitives before entering the shadowy figure screen
    savedGameState = {};
    for (let key in gameState) {
        // Only clone primitive values (strings, numbers, booleans)
        if (typeof gameState[key] !== 'object' || gameState[key] === null) {
            savedGameState[key] = gameState[key];
        }
    }
    
    gameState.phase = 'SHADOW';

    // Stop persistent powerup sounds
    if (sirenSource) {
        sirenSource.stop();
        sirenSource.disconnect();
        sirenSource = null;
    }
    if (cyberpunkSource) {
        cyberpunkSource.stop();
        cyberpunkSource.disconnect();
        cyberpunkSource = null;
    }

    shadowyScreen.style.display = 'flex';
    shadowyContinue.style.display = 'none';
    
    const needsUnlockCheck = [10, 20, 30, 40, 50, 60, 70].includes(round);
    const charToUnlock = (round === 10) ? 2 : (round === 20 ? 3 : 0);
    const isNewUnlock = isNewUnlockRecord && (round === 10 || round === 20);
    
    const portraitContainer = document.getElementById('shadowy-portrait-container');

    if (isBossVictory) {
        portraitContainer.style.display = 'none';
        if (round === 24) {
            shadowyText.innerHTML = `"That's a lot of cleaning up to do! You're like a layers of an onion... wait, that's Shrek. You just did a swamp-sized job on that Unclean One. Get out of my swamp!"<br><br><span style="color: #FFD700;">- CLEANED UP -</span>`;
        } else {
            shadowyText.innerHTML = `"You have done what many thought impossible. The Pilot of the Heavy Bomber has been grounded. But remember... even a giant head can leave a shadow."<br><br><span style="color: #FFD700;">- BOSS DEFEATED -</span>`;
        }
        shadowyContinue.style.display = 'block'; // Show immediately for boss
    } else if (isNewUnlock) {
        portraitContainer.style.display = 'flex';
        if (round === 10) {
            shadowyText.innerText = "You have proven your skill. The Ascetic joins your cause. 'A simple life, a sharp mind... and a very large staff.'";
        } else if (round === 20) {
            shadowyText.innerText = "The laws of this land are brittle. The Arbitrator shall mend them. 'Justice is a flame that consumes the wicked.'";
        }
    } else {
        portraitContainer.style.display = 'none';
        const quote = arnoldQuotes[Math.floor(Math.random() * arnoldQuotes.length)];
        const tip = gameRuleTips[Math.floor(Math.random() * gameRuleTips.length)];
        const hint = aiHints[Math.floor(Math.random() * aiHints.length)];
        shadowyText.innerHTML = `"${quote}"<br><br><span style="color: #FFD700;">- MISSION DATA: ${tip}</span><br><br>[ERR: ${hint}]`;
    }
    
    // Companion Intervention Logic
    shadowyCompanion.style.display = 'none';
    if (!isNewUnlock && Math.random() < 0.4) { // 40% chance if it's not a new unlock screen
        // Pick an unlocked character that the player is NOT using
        let possibleCompanions = [1];
        if (gameState.maxRoundReached >= 10) possibleCompanions.push(2);
        if (gameState.maxRoundReached >= 20) possibleCompanions.push(3);
        
        possibleCompanions = possibleCompanions.filter(c => c !== gameState.character);
        
        if (possibleCompanions.length > 0) {
            let compId = possibleCompanions[Math.floor(Math.random() * possibleCompanions.length)];
            shadowyCompanion.style.display = 'flex';
            companionText.innerText = companionInsults[Math.floor(Math.random() * companionInsults.length)];
            
            // Draw companion portrait
            const cpCtx = shadowyCompanionCanvas.getContext('2d');
            cpCtx.clearRect(0, 0, 64, 64);
            drawPortrait(cpCtx, 0, 0, compId, performance.now(), 4, false, false, false, false, false);
        }
    }
    
    if (isNewUnlock && charToUnlock > 0) {
        const pCtx = shadowyCharCanvas.getContext('2d');
        pCtx.clearRect(0, 0, 120, 120);
        drawPortrait(pCtx, 12, 12, charToUnlock, performance.now(), 6, false, false, false, true, false);
    }
    
    const mCtx = shadowyMonkCanvas.getContext('2d');
    let startTime = performance.now();
    
    function anim(t) {
        if (gameState.phase !== 'SHADOW') return;
        shadowyAnimFrame = Math.floor((t - startTime) / 150);
        drawShadowyMonk(mCtx, shadowyAnimFrame, t, shadowyMonkCanvas.width, shadowyMonkCanvas.height, false);
        shadowyAnimHandle = requestAnimationFrame(anim);
    }
    shadowyAnimHandle = requestAnimationFrame(anim);
    
    if (!isBossVictory) {
        setTimeout(() => {
            shadowyContinue.style.display = 'block';
        }, 2000);
    }
}

shadowyContinue.onclick = (e) => {
    if (e) e.stopPropagation();
    
    shadowyScreen.style.display = 'none';
    cancelAnimationFrame(shadowyAnimHandle);
    
    // Restore the saved game state (primitives)
    if (savedGameState) {
        // We want to keep the current round and max round increment if it just happened
        let currentRound = gameState.round;
        let currentMax = gameState.maxRoundReached;
        
        Object.assign(gameState, savedGameState);
        
        gameState.round = currentRound;
        gameState.maxRoundReached = currentMax;
        savedGameState = null;
    }
    
    // Ensure transient arrays are empty for the new round
    gameState.ducks = [];
    gameState.projectiles = [];
    gameState.airplanes = [];
    gameState.tigers = [];
    gameState.eagles = [];
    gameState.hotdogs = [];
    gameState.seekingMissiles = [];
    gameState.floatingTexts = [];
    
    // Re-initialize state for the next round
    gameState.phase = 'SPAWN';
    gameState.lastTime = performance.now(); 
    
    // Re-build the world
    spawnBuildings(gameState.round);
    if (gameState.round % 5 === 0) {
        spawnHills();
    }
    
    document.getElementById('round-display').innerText = 'R=' + gameState.round;
    updateUI();
    
    // RESTART the main game loop safely
    requestAnimationFrame(gameLoop);
};

// Almanach Logic
let almanachSceneTimer = 0;
let almanachSceneType = '';
let almanachAnimHandle = null;

function drawAlmanachScene(type, t) {
    const sCtx = sceneCanvas.getContext('2d');
    sCtx.clearRect(0,0, sceneCanvas.width, sceneCanvas.height);
    sCtx.imageSmoothingEnabled = false;

    // Background sky
    sCtx.fillStyle = '#64b5f6';
    sCtx.fillRect(0,0, sceneCanvas.width, sceneCanvas.height);

    const centerX = sceneCanvas.width / 2;
    const centerY = sceneCanvas.height / 2;
    const time = t / 1000;

    switch(type) {
        case 1: // Urban Stalker
            drawPortrait(sCtx, centerX - 64, centerY - 60, 1, t, 8, false, false, false, false, false);
            break;
        case 2: // Ascetic
            drawPortrait(sCtx, centerX - 64, centerY - 60, 2, t, 8, false, false, false, false, false);
            break;
        case 3: // Arbitrator
            drawPortrait(sCtx, centerX - 64, centerY - 60, 3, t, 8, false, false, false, false, false);
            break;
        case 'duck':
            let dy = centerY + Math.sin(time * 2) * 20;
            drawDuck(sCtx, centerX - 40, dy - 40, 80, 80, 1, time);
            break;
        case 'dog':
            let dogX = (t / 10) % (sceneCanvas.width + 160) - 80;
            drawDog(sCtx, dogX, centerY - 40, 80, 80, t / 1000);
            break;
        case 'tiger':
            let ty = centerY + Math.sin(time * 5) * 50;
            drawTiger(sCtx, centerX - 40, ty - 25, 80, 50, false);
            break;
        case 'airplane':
            let ax = centerX - 100 + Math.sin(time) * 100;
            drawAirplane(sCtx, ax, centerY - 40, 200, 80, "ALMANACH", time);
            break;
        case 'bomber':
            let progress = (time % 6) / 6;
            let bw = 12 + progress * 200;
            let bh = 5 + progress * 80;
            drawBomber(sCtx, centerX - bw/2, centerY - bh/2, bw, bh, progress);
            break;
        case 'shadow':
            drawShadowyMonk(sCtx, Math.floor(t / 150) % 2, t, sceneCanvas.width, sceneCanvas.height, true);
            break;
        case 'triple':
            // Draw 3 bullet trajectories
            sCtx.fillStyle = '#ffeb3b';
            for(let i=-1; i<=1; i++) {
                let bx = centerX + i * 40;
                let by = centerY + Math.cos(time * 4 + i) * 30;
                sCtx.fillRect(bx - 5, by - 8, 10, 16);
            }
            break;
        case 'missile':
             let mx = centerX + Math.cos(time*3)*50;
             let my = centerY + Math.sin(time*3)*50;
             sCtx.save();
             sCtx.translate(mx, my);
             sCtx.rotate(time*3 + Math.PI/2);
             drawSeekingMissileSprite(sCtx, -10, -15, 20, 30);
             sCtx.restore();
             break;
        case 'vending':
             drawVendingMachineIcon(sCtx, centerX - 40, centerY - 40, 80, 80);
             break;
    }

    almanachAnimHandle = requestAnimationFrame((nt) => drawAlmanachScene(type, nt));
}

function drawBomber(pCtx, x, y, w, h, progress) {
    pCtx.save();
    pCtx.translate(x + w / 2, y + h / 2);
    
    // Front-facing Bomber View (matching class design)
    pCtx.fillStyle = "#2c3e50"; // Military Gray
    pCtx.fillRect(-w/2, -h/10, w, h/5); // Wings
    pCtx.fillStyle = "#34495e";
    pCtx.fillRect(-w/12, -h/2, w/6, h); // Central Fuselage
    pCtx.fillStyle = "#1a252f";
    let eW = w/10;
    let eH = h/1.2;
    pCtx.fillRect(-w/6 - eW/2, -eH/2, eW, eH); // Inner Engines
    pCtx.fillRect(w/6 - eW/2, -eH/2, eW, eH);
    pCtx.fillRect(-w/2.6 - eW/2, -eH/2, eW, eH); // Outer Engines
    pCtx.fillRect(w/2.6 - eW/2, -eH/2, eW, eH);
    pCtx.fillStyle = "rgba(173, 216, 230, 0.6)"; // Cockpit
    pCtx.fillRect(-w/20, -h/2.5, w/10, h/4);
    pCtx.restore();
}

function drawChalice(pCtx, x, y) {
    const pSize = 4;
    pCtx.save();
    pCtx.translate(x, y);

    // Golden colors
    const gold = "#FFD700";
    const darkGold = "#B8860B";
    const highlight = "#FFFACD";

    // Chalice Body (8-bit style)
    pCtx.fillStyle = gold;
    // Rim
    pCtx.fillRect(0, 0, pSize * 8, pSize);
    // Bowl
    pCtx.fillRect(pSize, pSize, pSize * 6, pSize * 3);
    pCtx.fillRect(pSize * 2, pSize * 4, pSize * 4, pSize);
    // Stem
    pCtx.fillRect(pSize * 3, pSize * 5, pSize * 2, pSize * 3);
    // Base
    pCtx.fillRect(pSize * 2, pSize * 8, pSize * 4, pSize);
    pCtx.fillRect(pSize, pSize * 9, pSize * 6, pSize);

    // Shading/Highlight
    pCtx.fillStyle = darkGold;
    pCtx.fillRect(pSize * 7, 0, pSize, pSize);
    pCtx.fillRect(pSize * 6, pSize, pSize, pSize * 3);
    pCtx.fillRect(pSize * 5, pSize * 4, pSize, pSize);
    pCtx.fillRect(pSize * 4, pSize * 5, pSize, pSize * 3);
    pCtx.fillRect(pSize * 5, pSize * 8, pSize, pSize);
    pCtx.fillRect(pSize * 6, pSize * 9, pSize, pSize);

    pCtx.fillStyle = highlight;
    pCtx.fillRect(pSize, 0, pSize, pSize);
    pCtx.fillRect(pSize, pSize, pSize, pSize);

    pCtx.restore();
}

function drawGoldenText(pCtx, text, x, y, size = 12) {
    pCtx.save();
    // Use the existing pixel font logic but with golden style
    // The main code uses pixelFont map in gameLoop, so I'll replicate the logic or use standard font if preferred
    // The user specifically asked for "fancy golden 8-bit text"
    
    // We'll use the Press Start 2P font for simplicity if available, or custom pixel logic
    // Actually, Mallard Madness has a custom pixel font logic in drawUI/gameLoop
    // Let's use standard font for the start screen for better readability but styled gold
    
    pCtx.font = `${size}px 'Press Start 2P', cursive`;
    pCtx.textAlign = 'left';
    
    // Drop shadow
    pCtx.fillStyle = 'rgba(0,0,0,0.5)';
    pCtx.fillText(text, x + 2, y + 2);
    
    // Golden gradient
    const grad = pCtx.createLinearGradient(x, y - size, x, y);
    grad.addColorStop(0, '#FFFACD'); // Highlight
    grad.addColorStop(0.5, '#FFD700'); // Gold
    grad.addColorStop(1, '#B8860B'); // Dark gold
    
    pCtx.fillStyle = grad;
    pCtx.fillText(text, x, y);
    
    pCtx.restore();
}

function drawDuck(pCtx, x, y, w, h, z, t) {
    pCtx.save();
    pCtx.translate(x + w/2, y + h/2);
    let currentImg = (Math.floor(t * 5) % 2 === 0) ? duckImg1 : duckImg2;
    pCtx.drawImage(currentImg, -w/2, -h/2, w, h);
    pCtx.restore();
}

function drawDog(pCtx, x, y, w, h, t) {
    pCtx.save();
    pCtx.translate(x + w/2, y + h/2);
    let currentImg = (Math.floor(t * 8) % 2 === 0) ? dogImg1 : dogImg2;
    pCtx.drawImage(currentImg, -w/2, -h/2, w, h);
    pCtx.restore();
}

function drawTiger(pCtx, x, y, w, h, isDead) {
    pCtx.save();
    pCtx.translate(x + w/2, y + h/2);
    let p = h / 10;
    pCtx.fillStyle = '#ff9800'; // Orange base
    pCtx.fillRect(-4 * p, -3 * p, 8 * p, 6 * p); // head
    pCtx.fillStyle = '#000'; // stripes
    pCtx.fillRect(-4 * p, -3 * p, 2 * p, p);
    pCtx.fillRect(2 * p, -3 * p, 2 * p, p);
    pCtx.fillRect(-2 * p, -p, 4 * p, p);
    pCtx.fillStyle = '#fff'; // eyes
    pCtx.fillRect(-3 * p, 0, p, p);
    pCtx.fillRect(2 * p, 0, p, p);
    pCtx.fillStyle = '#000'; // pupils
    pCtx.fillRect(-2 * p, 0, p * .5, p);
    pCtx.fillRect(2.5 * p, 0, p * .5, p);
    pCtx.fillStyle = '#fff'; // muzzle
    pCtx.fillRect(-2 * p, 2 * p, 4 * p, 2 * p);
    pCtx.fillStyle = '#f44336'; // nose
    pCtx.fillRect(-p, 2 * p, 2 * p, p);
    pCtx.restore();
}

function drawAirplane(pCtx, x, y, w, h, text, t) {
    pCtx.save();
    pCtx.translate(x + w/2, y + h/2);
    
    // Banner
    pCtx.fillStyle = '#fff';
    pCtx.fillRect(-w/2 - 80, -10, 40, 30);
    pCtx.fillStyle = '#000';
    pCtx.font = "6px 'Press Start 2P', cursive";
    pCtx.textAlign = "center";
    pCtx.fillText(text, -w/2 - 60, 10);
    
    // Body
    pCtx.fillStyle = '#ccc';
    pCtx.fillRect(-w/2, -5, w, 14);
    pCtx.fillStyle = '#f44336';
    pCtx.fillRect(-w/2, -15, 10, 10);
    pCtx.fillStyle = '#90caf9';
    pCtx.fillRect(w/2 - 15, -5, 10, 8);
    
    pCtx.restore();
}

function drawSeekingMissileSprite(pCtx, x, y, w, h) {
    pCtx.fillStyle = '#f44336';
    pCtx.fillRect(x, y, w, h);
    pCtx.fillStyle = '#fff';
    pCtx.fillRect(x + w*0.2, y + h*0.2, w*0.6, h*0.2);
}

function drawVendingMachineIcon(pCtx, x, y, w, h) {
    pCtx.fillStyle = '#455a64';
    pCtx.fillRect(x, y, w, h);
    pCtx.fillStyle = '#00bcd4';
    pCtx.fillRect(x + 10, y + 10, w - 20, 30); // Screen
}

function showAlmanachIndex() {
    almanachScreen.style.display = 'flex';
    almanachIndex.style.display = 'block';
    almanachDetail.style.display = 'none';
    if(almanachAnimHandle) cancelAnimationFrame(almanachAnimHandle);

    // Update unlocks
    if (almanachData.chars.length >= 3) {
        almanachData.chars[0].unlocked = true;
        almanachData.chars[1].unlocked = gameState.maxRoundReached >= 10;
        almanachData.chars[2].unlocked = gameState.maxRoundReached >= 20;
    }
    // Enemies and Items are always unlocked once found
    almanachData.enemies.forEach(e => e.unlocked = true);
    almanachData.items.forEach(i => i.unlocked = true);

    // Poplate
    const populate = (container, dataList, typePrefix) => {
        container.innerHTML = '';
        dataList.forEach(item => {
            try {
                const tile = document.createElement('div');
                tile.className = 'almanach-tile' + (item.unlocked === false ? ' locked' : '');
                
                const iconBox = document.createElement('div');
                iconBox.className = 'almanach-tile-icon';
                const iconCvs = document.createElement('canvas');
                iconCvs.width = 64; iconCvs.height = 64;
                iconBox.appendChild(iconCvs);
                
                const ictx = iconCvs.getContext('2d');
                ictx.imageSmoothingEnabled = false;
                // Simplified icon drawing
                if (typePrefix === 'char') {
                     drawPortrait(ictx, 0, 0, item.id, performance.now(), 2, false, false, false, false, item.unlocked === false);
                } else if (item.id === 'duck') {
                     drawDuck(ictx, 8, 8, 48, 48, 1, 0);
                } else if (item.id === 'tiger') {
                     drawTiger(ictx, 8, 14, 48, 30, false);
                } else if (item.id === 'airplane') {
                     drawAirplane(ictx, 0, 16, 64, 32, "", 0);
                } else if (item.id === 'dog') {
                     drawDog(ictx, 8, 8, 48, 48, 0);
                } else if (item.id === 'bomber') {
                     drawBomber(ictx, 0, 20, 64, 24, 1.0);
                } else if (item.id === 'shadow') {
                     drawShadowyMonk(ictx, 0, 0, 64, 64, true);
                } else if (item.id === 'triple') {
                     ictx.fillStyle = 'yellow'; ictx.fillRect(24, 10, 16, 44);
                } else if (item.id === 'missile') {
                     drawSeekingMissileSprite(ictx, 24, 10, 16, 44);
                } else if (item.id === 'vending') {
                     drawVendingMachineIcon(ictx, 16, 8, 32, 48);
                }

                const nameSpan = document.createElement('span');
                nameSpan.innerText = item.name;
                
                tile.appendChild(iconBox);
                tile.appendChild(nameSpan);
                
                if (item.unlocked !== false) {
                    tile.onclick = () => showAlmanachDetail(item);
                }
                container.appendChild(tile);
            } catch (e) {
                console.error("Error populating Almanac tile:", e, item);
            }
        });
    };

    populate(almanachChars, almanachData.chars, 'char');
    populate(almanachEnemies, almanachData.enemies, 'enemy');
    populate(almanachItems, almanachData.items, 'item');
}

function showAlmanachDetail(item) {
    almanachIndex.style.display = 'none';
    almanachDetail.style.display = 'flex';
    articleTitle.innerText = item.name;
    articleContent.innerText = item.text;

    // Shadowy Figure font gimmick
    if (item.id === 'shadow') {
        const fonts = ['Impact', 'Courier New', 'Comic Sans MS', 'Cursive', 'Fantasy', 'Monospace', 'Serif', 'Sans-Serif', 'Georgia', 'Symbol'];
        articleContent.style.fontFamily = fonts[Math.floor(Math.random() * fonts.length)];
    } else {
        articleContent.style.fontFamily = 'inherit';
    }
    
    if(almanachAnimHandle) cancelAnimationFrame(almanachAnimHandle);
    drawAlmanachScene(item.id, performance.now());
}

    almanachBtn.onclick = async () => {
        startScreen.style.display = 'none';
        if (almanachData.chars.length === 0) {
            await loadAlmanachData();
        }
        showAlmanachIndex();
    };

    almanachToMenu.onclick = () => {
        almanachScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    };

    almanachToIndex.onclick = () => {
        showAlmanachIndex();
    };

    // --- Settings Logic ---
    // (settings already initialized in gameState)

    function loadSettings() {
        const saved = localStorage.getItem('mallard_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Migrate old 'sound' setting if it exists
                if (parsed.hasOwnProperty('sound')) {
                    parsed.sfx = parsed.sound;
                    parsed.music = parsed.sound;
                    delete parsed.sound;
                }
                gameState.settings = { ...gameState.settings, ...parsed };
            } catch (e) {
                console.error("Error loading settings:", e);
            }
        }
        updateSettingsUI();
        applyNightMode();
    }

    function saveSettings() {
        localStorage.setItem('mallard_settings', JSON.stringify(gameState.settings));
    }

    function updateSettingsUI() {
        if (toggleSFXBtn) toggleSFXBtn.innerText = gameState.settings.sfx ? 'ON' : 'OFF';
        if (toggleMusicBtn) toggleMusicBtn.innerText = gameState.settings.music ? 'ON' : 'OFF';
        if (toggleFlashingBtn) toggleFlashingBtn.innerText = gameState.settings.flashing ? 'ON' : 'OFF';
        if (toggleNightBtn) toggleNightBtn.innerText = gameState.settings.nightMode ? 'ON' : 'OFF';
    }

    function applyNightMode() {
        const container = document.getElementById('game-container');
        if (gameState.settings.nightMode) {
            container.classList.add('night-mode');
        } else {
            container.classList.remove('night-mode');
        }
    }

    settingsBtn.onclick = () => {
        startScreen.style.display = 'none';
        settingsScreen.style.display = 'flex';
        updateSettingsUI();
    };

    settingsToMenuBtn.onclick = () => {
        settingsScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    };

    toggleSFXBtn.onclick = () => {
        gameState.settings.sfx = !gameState.settings.sfx;
        updateSettingsUI();
        saveSettings();
    };

    toggleMusicBtn.onclick = () => {
        gameState.settings.music = !gameState.settings.music;
        if (gameState.settings.music) {
            gameState.settings.radioStation = null;
            stopRadio();
        }
        updateSettingsUI();
        saveSettings();
        // Feedback: stop or start music immediately
        if (!gameState.settings.music) {
            if (bgmSource) {
                try { bgmSource.stop(); bgmSource.disconnect(); } catch(e){}
                bgmSource = null;
            }
        } else {
            startBGM(gameState.round);
        }
    };

    function populateRadioList() {
        radioList.innerHTML = '';
        
        // Add "Disabled" option
        const disabledItem = document.createElement('div');
        disabledItem.className = 'radio-item';
        disabledItem.innerHTML = `
            <div class="radio-info">
                <span class="radio-name">DISABLED</span>
                <span class="radio-genre">No external stream</span>
            </div>
            <button class="btn radio-select-btn">${!gameState.settings.radioStation ? 'SELECTED' : 'SELECT'}</button>
        `;
        disabledItem.onclick = () => selectRadio(null);
        radioList.appendChild(disabledItem);

        RADIO_STATIONS.forEach(station => {
            const item = document.createElement('div');
            item.className = 'radio-item';
            const isSelected = gameState.settings.radioStation === station.name;
            item.innerHTML = `
                <div class="radio-info">
                    <span class="radio-name">${station.name}</span>
                    <span class="radio-genre">${station.genre}</span>
                </div>
                <button class="btn radio-select-btn">${isSelected ? 'SELECTED' : 'SELECT'}</button>
            `;
            item.onclick = () => selectRadio(station);
            radioList.appendChild(item);
        });
    }

    function selectRadio(station) {
        if (station) {
            gameState.settings.radioStation = station.name;
            gameState.settings.music = false;
            if (bgmSource) {
                try { bgmSource.stop(); bgmSource.disconnect(); } catch(e){}
                bgmSource = null;
            }
            playRadio(station.url);
            showNowPlaying(station.name);
        } else {
            gameState.settings.radioStation = null;
            stopRadio();
        }
        updateSettingsUI();
        populateRadioList();
        saveSettings();
    }

    function showNowPlaying(stationName) {
        const notification = document.getElementById('radio-notification');
        if (!notification) return;
        
        notification.innerHTML = `Now playing 🎵:<br>${stationName}`;
        notification.style.display = 'block';
        notification.className = 'fade-in';
        
        // Remove previous timeout if any
        if (window.radioNotificationTimeout) {
            clearTimeout(window.radioNotificationTimeout);
        }
        
        window.radioNotificationTimeout = setTimeout(() => {
            notification.className = 'fade-out';
            setTimeout(() => {
                if (notification.className === 'fade-out') {
                    notification.style.display = 'none';
                }
            }, 500);
        }, 3000);
    }

    function playRadio(url) {
        if (radioStream) {
            radioStream.pause();
            radioStream = null;
        }
        radioStream = new Audio(url);
        radioStream.volume = 0.7; // Lowered by 30%
        radioStream.play().catch(e => console.warn("Radio autoplay blocked:", e));
    }

    function stopRadio() {
        if (radioStream) {
            radioStream.pause();
            radioStream = null;
        }
    }

    openRadioBtn.onclick = () => {
        settingsScreen.style.display = 'none';
        radioScreen.style.display = 'flex';
        populateRadioList();
    };

    radioToSettingsBtn.onclick = () => {
        radioScreen.style.display = 'none';
        settingsScreen.style.display = 'flex';
        updateSettingsUI();
    };

    toggleFlashingBtn.onclick = () => {
        gameState.settings.flashing = !gameState.settings.flashing;
        updateSettingsUI();
        saveSettings();
    };

    toggleNightBtn.onclick = () => {
        gameState.settings.nightMode = !gameState.settings.nightMode;
        updateSettingsUI();
        applyNightMode();
        saveSettings();
    };

    let scrollCount = 0;
    let scrollTimeout = null;

    window.addEventListener('wheel', (e) => {
        if (!gameState.settings.radioStation || gameState.settings.radioStation === 'Disabled') return;
        
        // Only allow radio quick-switch during active gameplay phases
        // and when no full-screen menu overlays (settings, radio, almanach, etc.) are visible
        const menuVisible = (
            startScreen.style.display === 'flex' || 
            settingsScreen.style.display === 'flex' || 
            radioScreen.style.display === 'flex' || 
            almanachScreen.style.display === 'flex' ||
            charSelection.style.display === 'flex' ||
            vendingScreen.style.display === 'flex' ||
            shadowyScreen.style.display === 'flex'
        );

        if (gameState.phase === 'START' || menuVisible) return;
        
        scrollCount++;
        clearTimeout(scrollTimeout);
        
        if (scrollCount >= 2) {
            scrollCount = 0;
            // Pick a random station that is not the current one
            const otherStations = RADIO_STATIONS.filter(s => s.name !== gameState.settings.radioStation);
            if (otherStations.length > 0) {
                const randomStation = otherStations[Math.floor(Math.random() * otherStations.length)];
                selectRadio(randomStation);
                // Also update settings in local state and UI
                gameState.settings.radioStation = randomStation.name;
                saveSettings();
                if (radioScreen.style.display === 'flex') {
                    populateRadioList();
                }
            }
        } else {
            scrollTimeout = setTimeout(() => {
                scrollCount = 0;
            }, 500); // 500ms window for "double scroll"
        }
    });


    loadSettings();

    // Start the atmosphere immediately for the menu
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);

})();
