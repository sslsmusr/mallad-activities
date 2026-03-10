const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const ammoDisplay = document.getElementById('ammo-display');

// Load Assets
const duckImg1 = new Image();
duckImg1.src = 'duck1.png';
const duckImg2 = new Image();
duckImg2.src = 'duck2.png';
const dogImg1 = new Image();
dogImg1.src = 'dog1.png?v=43';
const dogImg2 = new Image();
dogImg2.src = 'dog2.png?v=43';

// Audio Context setup for sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let quackBuffer = null;
let wompBuffer = null;
let snickerBuffer = null;
let jingleBuffer = null;
let bgmBuffer = null;
let bgmSource = null; // To track and update the playing BGM
let somberBuffer = null;
let cheerfulBuffer = null;
let cheerfulSource = null;
let sirenBuffer = null;
let sirenSource = null;
let boomBuffer = null;
let cyberpunkBuffer = null;
let cyberpunkSource = null;
let deathTextLines = [];
let winTextLines = [];
let winTimer = 0;

// Fetch game over text
fetch('death_text.txt')
    .then(r => r.text())
    .then(text => { deathTextLines = text.split('\n'); })
    .catch(e => console.error('Error loading death text', e));

fetch('win_text.txt')
    .then(r => r.text())
    .then(text => { winTextLines = text.split('\n'); })
    .catch(e => console.error('Error loading win text', e));

// Fetch and load the generated retro quack
fetch('quack.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { quackBuffer = buffer; })
    .catch(e => console.error('Error loading quack sound:', e));

fetch('womp.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { wompBuffer = buffer; })
    .catch(e => console.error('Error loading womp sound:', e));

fetch('snicker.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { snickerBuffer = buffer; })
    .catch(e => console.error('Error loading snicker sound:', e));

fetch('jingle.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { jingleBuffer = buffer; })
    .catch(e => console.error('Error loading jingle sound:', e));

fetch('balkan_loop.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { bgmBuffer = buffer; })
    .catch(e => console.error('Error loading balkan loop:', e));

fetch('somber.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { somberBuffer = buffer; })
    .catch(e => console.error('Error loading somber melody:', e));

fetch('cheerful.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { cheerfulBuffer = buffer; })
    .catch(e => console.error('Error loading cheerful melody:', e));

fetch('siren.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { sirenBuffer = buffer; })
    .catch(e => console.error('Error loading siren:', e));

fetch('boom.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { boomBuffer = buffer; })
    .catch(e => console.error('Error loading boom:', e));

fetch('cyberpunk.wav')
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(buffer => { cyberpunkBuffer = buffer; })
    .catch(e => console.error('Error loading cyberpunk melody:', e));

function playSound(buffer, volume = 1.0, loop = false) {
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
    if (!bgmBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // If it's already playing, gently adjust the speed without restarting the song!
    if (bgmSource) {
        bgmSource.playbackRate.value = 1.0 + (level - 1) * 0.1;
        return;
    }

    bgmSource = audioCtx.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    bgmSource.loop = true;

    // Scale playback speed dynamically. 
    // Ducks get 10% faster per level. The music will match this exactly!
    bgmSource.playbackRate.value = 1.0 + (level - 1) * 0.1;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.4; // Slightly lower volume so it's a background track

    bgmSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    bgmSource.start(0);
}

function playQuack(level) {
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
        distortion.connect(audioCtx.destination);
    } else {
        source.connect(audioCtx.destination);
    }

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

// Game State
let gameState = {
    score: 0,
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
    sunClicks: 0,
    infiniteAmmo: false
};
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

const shadowyScreen = document.getElementById('shadowy-screen');
const shadowyMonkCanvas = document.getElementById('shadowy-monk-canvas');
const shadowyCharCanvas = document.getElementById('shadowy-char-canvas');
const shadowyText = document.getElementById('shadowy-text');
const shadowyContinue = document.getElementById('shadowy-continue');
let shadowyAnimFrame = 0;
let shadowyAnimHandle = null;
let savedGameState = null;


// Handle resizing to keep logical resolution crisp while filling screen
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    // Keep pixel art crisp
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
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
    }

    update(dt) {
        if (!this.isDead) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Bounce off walls
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.vx *= -1;
            }
        } else {
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
                    this.y = 9999; // Move offscreen so it gets filtered out and advances the round
                }
            } else {
                this.y = 9999; // Fallback
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
        // Translate to the center of the duck
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // If flying left, flip the image horizontally
        if (this.vx < 0) {
            ctx.scale(-1, 1);
        }

        // Animate wings (flap every ~0.15s)
        let currentDuckImg = duckImg1;
        // Stop flapping if dead
        if (!this.isDead && Math.floor(performance.now() / 150) % 2 === 0) {
            currentDuckImg = duckImg2;
        }

        // Apply tint for higher levels to make them look angry/mean
        if (this.level === 2) {
            ctx.filter = 'sepia(1) hue-rotate(-50deg) saturate(2)'; // Reddish
        } else if (this.level === 3) {
            ctx.filter = 'sepia(1) hue-rotate(-50deg) saturate(4) brightness(0.7)'; // Dark red/furious
        }

        ctx.drawImage(currentDuckImg, -this.width / 2, -this.height / 2, this.width, this.height);

        // Optional aging tint based on level
        if (this.level >= 2) {
            ctx.filter = `grayscale(${this.level * 20}%) sepia(${this.level * 10}%)`;
            // redraw just the duck with filter to simulate aging
            ctx.drawImage(currentDuckImg, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.filter = 'none';
        }

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
        ctx.font = "bold 24px 'Courier New', Courier, monospace";
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

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        let p = 8;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#795548'; // Brown
        ctx.fillRect(-3 * p, -2 * p, 6 * p, 5 * p);
        ctx.fillStyle = '#fff'; // White head
        ctx.fillRect(-3 * p, -5 * p, 6 * p, 3 * p);
        ctx.fillStyle = '#ffeb3b'; // Beak
        ctx.fillRect(1 * p, -4 * p, 3 * p, 2 * p);
        ctx.fillStyle = '#000'; // Eye
        ctx.fillRect(-1 * p, -4 * p, p, p);

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
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.globalAlpha = 0.9;

        let p = 4;
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
            this.targetDuck.isDead = true;
            this.targetDuck.particles = [];
            for (let i = 0; i < 20; i++) {
                this.targetDuck.particles.push({
                    x: this.targetDuck.x + Math.random() * this.targetDuck.width,
                    y: this.targetDuck.y + Math.random() * this.targetDuck.height,
                    vx: (Math.random() - 0.5) * 400,
                    vy: (Math.random() - 0.5) * 400,
                    size: 4 + Math.random() * 8,
                    life: 0.5 + Math.random() * 0.5,
                    color: Math.random() > 0.5 ? '#ff4444' : '#ffffff'
                });
            }
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
    constructor(startX, startY, targetX, targetY, targetDuck, hitSun, targetAirplane = null, targetTiger = null, targetEagle = null, isGreen = false) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.targetDuck = targetDuck;
        this.targetAirplane = targetAirplane;
        this.targetTiger = targetTiger;
        this.targetEagle = targetEagle;
        this.isGreen = isGreen;
        this.hitSun = hitSun;
        this.timeElapsed = 0;
        this.timeTotal = 0.1; // 100ms flight time
        this.isDead = false;
        this.fullyDead = false;
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
        if (this.isGreen && !this.targetDuck && !this.targetAirplane && !this.targetTiger && !this.targetEagle && !this.hitSun) {
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
        if (this.hitSun || (this.targetDuck && !this.targetDuck.isDead) || (this.targetAirplane && !this.targetAirplane.isDead) || (this.targetTiger && !this.targetTiger.isDead) || (this.targetEagle && !this.targetEagle.isDead)) {
            flashScreen(); // Impact flash ONLY on hits!
        }

        if (this.hitSun) {
            if (!gameState.infiniteAmmo) {
                gameState.sunClicks++;
                if (gameState.sunClicks === 4) {
                    gameState.infiniteAmmo = true;
                    playSound(jingleBuffer, 0.8);
                }
            }
            updateUI();
        }

        if (this.targetDuck && !this.targetDuck.isDead) { // Ensure it wasn't destroyed
            let duck = this.targetDuck;
            duck.isDead = true;
            duck.particles = [];
            for (let p = 0; p < 30; p++) {
                duck.particles.push({
                    x: duck.x + Math.random() * duck.width,
                    y: duck.y + Math.random() * duck.height,
                    vx: (Math.random() - 0.5) * 400,
                    vy: (Math.random() - 0.5) * 400,
                    size: 4 + Math.random() * 8, // chunky pixels
                    life: 0.5 + Math.random() * 0.5, // 0.5s to 1s expiration
                    color: Math.random() > 0.5 ? '#ffeb3b' : (Math.random() > 0.5 ? '#4caf50' : '#ff9800')
                });
            }
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
        } else if (!this.hitSun && !this.targetDuck && !this.targetAirplane && !this.targetTiger && !this.targetEagle) {
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

            if (gameState.ammo >= 0 && !gameState.infiniteAmmo) {
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

    if (!gameState.infiniteAmmo && gameState.ammo <= 0) return;

    // Get click/touch coordinates
    let rect = canvas.getBoundingClientRect();
    let x, y;

    if (event.type === 'touchstart') {
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
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
        let hitSun = false;

        let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        if (currentLevel >= 4 && Math.abs(currentX - 80) <= 60 && Math.abs(currentY - 80) <= 60) {
            hitSun = true;
        }

        if (!hitSun) {
            for (let i = gameState.hotdogs.length - 1; i >= 0; i--) {
                const hdog = gameState.hotdogs[i];
                if (!hdog.isDead && Math.abs(currentX - (hdog.x + hdog.width / 2)) <= hdog.width / 2 &&
                    Math.abs(currentY - (hdog.y + hdog.height / 2)) <= hdog.height / 2) {
                    // Hotdog hit! Activate missile power-up
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

            // Check tigers
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

            // Check ducks
            if (!hitTiger && !hitEagle) {
                for (let i = gameState.ducks.length - 1; i >= 0; i--) {
                    const duck = gameState.ducks[i];
                    if (!duck.isDead && !duck.isTargeted &&
                        currentX >= duck.x && currentX <= duck.x + duck.width &&
                        currentY >= duck.y && currentY <= duck.y + duck.height) {

                        hitDuck = duck;
                        duck.isTargeted = true; // Mark targeted
                        break;
                    }
                }
            }

            // Check airplanes
            if (!hitDuck && !hitTiger && !hitEagle) {
                for (let i = gameState.airplanes.length - 1; i >= 0; i--) {
                    const plane = gameState.airplanes[i];
                    if (!plane.isDead &&
                        currentX >= plane.x - 80 && currentX <= plane.x + plane.width &&
                        currentY >= plane.y - 15 && currentY <= plane.y + plane.height + 15) {

                        hitAirplane = plane;
                        break;
                    }
                }
            }

            // Check buildings
            if (!hitDuck && !hitTiger && !hitAirplane && !hitEagle) {
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

        gameState.projectiles.push(new Projectile(startX, startY, currentX, currentY, hitDuck, hitSun, hitAirplane, hitTiger, hitEagle, gameState.powerUpActive));
    });

    if (!gameState.infiniteAmmo) {
        gameState.ammo--;
    }
    updateUI();
}

let gameOverTimer = 0;
let somberSource = null;

function triggerGameOver() {
    gameState.phase = 'GAME_OVER';
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

    // Delay displaying reset button by 2 seconds to absorb the impact
    setTimeout(() => {
        if (gameState.phase === 'GAME_OVER') {
            document.getElementById('reset-btn').style.display = 'block';
        }
    }, 2000);
}

function triggerWin() {
    gameState.phase = 'WIN';
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

function updateUI() {
    scoreDisplay.innerText = gameState.score.toString().padStart(6, '0');

    // Update bullets
    ammoDisplay.innerHTML = '';
    if (gameState.infiniteAmmo) {
        const inf = document.createElement('span');
        inf.innerHTML = '&infin;';
        inf.style.color = '#fff';
        inf.style.fontSize = '24px';
        inf.style.lineHeight = '24px';
        inf.style.marginLeft = '10px';
        ammoDisplay.appendChild(inf);
    } else {
        for (let i = 0; i < gameState.ammo; i++) {
            const bullet = document.createElement('div');
            bullet.className = 'bullet';
            ammoDisplay.appendChild(bullet);
        }
    }

    // Update lives
    const livesDisplay = document.getElementById('lives-display');
    livesDisplay.innerHTML = '';
    for (let i = 0; i < gameState.lives; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        if (i === gameState.lives - 1 && gameState.lives < 5) {
            heart.classList.add('pulse');
        }
        livesDisplay.appendChild(heart);
    }
}

let flashFrames = 0;
function flashScreen() {
    flashFrames = 3; // Flash for 3 frames
}

function spawnBuildings(roundNum) {
    if (!gameState.buildings) gameState.buildings = [];

    // 1 hut every round in random color
    let hutObj = {
        type: 'hut',
        width: 30 + Math.random() * 20,
        height: 20 + Math.random() * 20,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        roofColor: '#2b1b17',
        windows: 1 + Math.floor(Math.random() * 2)
    };
    hutObj.x = Math.random() * (canvas.width - hutObj.width);
    gameState.buildings.push(hutObj);

    // 1 tower every 10 levels
    if (roundNum % 10 === 0) {
        let tW = 30 + Math.random() * 20;
        let tH = 120 + Math.random() * 80;
        let tX = Math.random() * (canvas.width - tW);
        let litLights = [];
        for (let wy = 10; wy < tH - 10; wy += 20) {
            if (Math.random() > 0.3) litLights.push(wy);
        }
        let towerObj = {
            type: 'tower', width: tW, height: tH, x: tX,
            color: `#${Math.floor(Math.random() * 3 + 3)}${Math.floor(Math.random() * 3 + 3)}${Math.floor(Math.random() * 3 + 3)}`,
            litLights: litLights
        };
        gameState.buildings.push(towerObj);
    }

    // 1 apartment every 20 levels
    if (roundNum % 20 === 0) {
        let aW = 80 + Math.random() * 40;
        let aH = 100 + Math.random() * 60;
        let aX = Math.random() * (canvas.width - aW);
        let cols = Math.floor(aW / 15);
        let litGrid = [];
        for (let wy = 10; wy < aH - 10; wy += 20) {
            let row = [];
            for (let wx = 0; wx < cols; wx++) {
                if (Math.random() > 0.4) row.push(wx);
            }
            litGrid.push({ y: wy, xList: row });
        }
        let aptObj = {
            type: 'apt', width: aW, height: aH, x: aX,
            color: '#4e342e',
            litGrid: litGrid
        };
        gameState.buildings.push(aptObj);
    }
}

function spawnHills() {
    if (!gameState.hills) gameState.hills = [];

    // Spawn 2-4 hills of random width and height
    let numHills = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numHills; i++) {
        let hillW = 50 + Math.random() * 150;  // minimum 50px wide, up to 200px
        let hillH = 30 + Math.random() * 80;   // 30-110px tall
        let hillX = Math.random() * (canvas.width - hillW + hillW * 0.5) - hillW * 0.25;
        // Slightly different greens for variety
        let green = Math.floor(60 + Math.random() * 60);
        gameState.hills.push({
            x: hillX,
            width: hillW,
            height: hillH,
            color: `hsl(${110 + Math.floor(Math.random() * 30)}, ${50 + Math.floor(Math.random() * 30)}%, ${green * 0.4}%)`
        });
    }
}

// Game Loop
function gameLoop(timestamp) {
    // Calculate delta time in seconds
    let dt = (timestamp - gameState.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // Cap dt to avoid huge jumps
    gameState.lastTime = timestamp;

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

    // Sky blue, darkens based on level
    let skyL = 68; // 68% lightness
    if (gameState.round >= 60) skyL -= 20; // Darken by total 20%
    else if (gameState.round >= 30) skyL -= 10; // Darken by 10%
    ctx.fillStyle = `hsl(207, 90%, ${skyL}%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Sun at Level >= 4
    if (currentLevel >= 4) {
        let sunX = 80;
        let sunY = 80;
        let sunRadius = 40;

        // Redness: starts at 0, increases 5% per round
        let redPercent = Math.min(100, (gameState.round - 1) * 5);
        let g = Math.floor(235 * (1 - redPercent / 100));
        let b = Math.floor(59 * (1 - redPercent / 100));
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;

        let pSize = 4;
        for (let y = -sunRadius; y <= sunRadius; y += pSize) {
            for (let x = -sunRadius; x <= sunRadius; x += pSize) {
                if (x * x + y * y <= sunRadius * sunRadius) {
                    ctx.fillRect(sunX + x, sunY + y, pSize, pSize);
                }
            }
        }

        // Aviator sunglasses
        ctx.fillStyle = "black";
        ctx.fillRect(sunX - 28, sunY - 16, 24, 16); // Left lens
        ctx.fillRect(sunX + 4, sunY - 16, 24, 16);  // Right lens
        ctx.fillRect(sunX - 4, sunY - 12, 8, 4);    // Bridge
        ctx.fillRect(sunX - 40, sunY - 12, 12, 4);   // Left arm
        ctx.fillRect(sunX + 28, sunY - 12, 12, 4);   // Right arm

        // Lens cutouts to round bottoms
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;
        ctx.fillRect(sunX - 28, sunY, 4, 4);
        ctx.fillRect(sunX - 8, sunY, 4, 4);
        ctx.fillRect(sunX + 4, sunY, 4, 4);
        ctx.fillRect(sunX + 24, sunY, 4, 4);

        // Lens reflection
        ctx.fillStyle = "white";
        ctx.fillRect(sunX - 20, sunY - 12, 4, 4);
        ctx.fillRect(sunX + 12, sunY - 12, 4, 4);

        // Mouth
        if (gameState.perfectRounds >= 4) {
            // Huge happy smile! (Audi Acquired)
            ctx.fillStyle = "black";
            ctx.fillRect(sunX - 20, sunY + 12, 40, 24); // Big mouth backing
            ctx.fillStyle = "white"; // Big shiny teeth
            ctx.fillRect(sunX - 16, sunY + 16, 32, 8);
            ctx.fillStyle = "#e57373"; // Big tongue
            ctx.fillRect(sunX - 12, sunY + 28, 24, 8);

            // Flushed Cheeks
            ctx.fillStyle = `rgba(200, 40, 40, 0.6)`;
            ctx.fillRect(sunX - 32, sunY + 12, 12, 12);
            ctx.fillRect(sunX + 20, sunY + 12, 12, 12);
        } else {
            // Mouth (open expression from image)
            ctx.fillStyle = "black";
            ctx.fillRect(sunX - 12, sunY + 16, 24, 8);
            ctx.fillStyle = "#e57373"; // Inner mouth
            ctx.fillRect(sunX - 8, sunY + 20, 16, 4);
        }

        // Draw Audi Rings (4 Perfect Rounds) directly below the sun
        let numRings = Math.min(4, gameState.perfectRounds);
        if (numRings > 0) {
            ctx.strokeStyle = "#e0e0e0"; // Silver / Platinum color
            ctx.lineWidth = 4;
            let startRingsX = sunX - 30; // Center the 4 rings under sun
            for (let i = 0; i < numRings; i++) {
                ctx.beginPath();
                // 20px spacing between ring centers, 12px radius, overlapping like Audi
                ctx.arc(startRingsX + i * 20, sunY + 65, 12, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Extra feature: Perfect Round Thumbs Up!
        if (gameState.phase === 'DOG' && gameState.escapedThisRound === 0) {
            let tX = sunX + 45;
            let tY = sunY + 5;

            // Base Hand/Fist color matches the sun's redness
            ctx.fillStyle = `rgb(255, ${g}, ${b})`;
            ctx.fillRect(tX, tY, pSize * 5, pSize * 4); // fist box
            ctx.fillRect(tX - pSize, tY - pSize * 4, pSize * 2, pSize * 4); // thumb pointing up

            // Hand outline shading for pixel 3D volume
            ctx.fillStyle = "black";
            ctx.fillRect(tX, tY - pSize, pSize * 3, pSize); // top fist crease
            ctx.fillRect(tX + pSize, tY, pSize, pSize * 2); // root thumb fold
            ctx.fillRect(tX + pSize * 5, tY + pSize, pSize, pSize); // finger 1 crease
            ctx.fillRect(tX + pSize * 5, tY + pSize * 3, pSize, pSize); // finger 2 crease
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

        // Simple 8-bit cloud shape
        ctx.fillRect(-20, -10, 40, 20);
        ctx.fillRect(-30, 0, 60, 10);
        ctx.fillRect(-10, -20, 20, 10);

        ctx.restore();
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

    // Update & Draw Airplanes
    gameState.airplanes.forEach(plane => {
        plane.update(dt);
        plane.draw(ctx);
    });
    // Filter out dead/offscreen planes
    gameState.airplanes = gameState.airplanes.filter(p => p.y < 1000 && p.x > -200 && p.x < canvas.width + 200);

    // Update & Draw Ducks
    gameState.ducks.forEach(duck => {
        duck.update(dt);
        duck.draw(ctx);
    });

    // Remove ducks that are off-screen (fallen down or flew away)
    gameState.ducks = gameState.ducks.filter(duck => {
        // If duck flies off the top of the canvas, it escaped!
        if (!duck.isDead && duck.y < -150) {
            gameState.escapedThisRound++;
            gameState.lives--;
            updateUI();

            if (gameState.lives <= 0 && gameState.phase !== 'GAME_OVER') {
                triggerGameOver();
            }
            return false;
        }
        return duck.y < canvas.height + 100 && duck.y > -200;
    });

    // Update & Draw Tigers
    gameState.tigers.forEach(tiger => {
        tiger.update(dt);
        tiger.draw(ctx);
    });
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
    if (!bgmSource && bgmBuffer && gameState.phase !== 'START' && gameState.phase !== 'GAME_OVER' && gameState.phase !== 'WIN') {
        let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        startBGM(currentLevel);
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

        gameState.ammo = 5 + (bonusDucks * 4); // Ensure we don't immediately run out of bullets with swarms
        gameState.sessionKills = 0; // Reset consecutive kills per round
        gameState.escapedThisRound = 0; // Reset escaping penalization
        updateUI();

        let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        startBGM(currentLevel); // Make sure the music speed updates each round!

        spawnBuildings(gameState.round);
        if (gameState.round % 5 === 0) {
            spawnHills();
        }

        gameState.phase = 'PLAY';
    } else if (gameState.phase === 'PLAY') {
        if (gameState.ducks.length === 0) {
            gameState.phase = 'DOG';
            gameState.timer = 2.5; // Dog animation takes 2.5 seconds
            gameState.dogQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
            gameState.dogPlayedSound = false;

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
                gameState.round++;
                if (gameState.round > gameState.maxRoundReached) {
                    gameState.maxRoundReached = gameState.round;
                    localStorage.setItem('mallard_max_round', gameState.maxRoundReached.toString());
                }
                
                if (finishedRound % 10 === 0) {
                    showShadowyScreen(finishedRound);
                    return;
                }

                gameState.phase = 'SPAWN';
                spawnBuildings(gameState.round);
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
        ctx.font = "bold 18px 'Courier New', Courier, monospace";

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
        ctx.font = "bold 20px 'Courier New', Courier, monospace"; // Reduced from 22px

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
            ctx.shadowBlur = 5;
            ctx.font = "bold 26px 'Courier New', Courier, monospace";
            ctx.fillText("VICTORY!", canvas.width / 2, pY + 40);

            ctx.shadowBlur = 0;
            ctx.font = "bold 18px 'Courier New', Courier, monospace";
            ctx.fillText(`SCORE: ${gameState.score}`, canvas.width / 2, pY + 90);
            ctx.fillText(`DUCKS DOWNED: ${gameState.killCount}`, canvas.width / 2, pY + 130);
            ctx.fillText(`TIGERS HUNTED: ${gameState.tigersKilled}`, canvas.width / 2, pY + 170);
            ctx.fillText(`AIRPLANES SHOT: ${gameState.airplanesKilled}`, canvas.width / 2, pY + 210);
        }

        requestAnimationFrame(gameLoop);
        return; // Don't draw UI or grass
    }

    // Draw background hills (behind buildings)
    let grassLevel = canvas.height - (canvas.height * 0.12);
    if (gameState.hills) {
        gameState.hills.forEach(h => {
            let hBaseY = grassLevel; // Base exactly at grass level
            ctx.fillStyle = h.color;
            ctx.beginPath();
            ctx.moveTo(h.x, hBaseY);
            // Smooth elliptical hill arc
            ctx.bezierCurveTo(
                h.x, hBaseY - h.height,
                h.x + h.width, hBaseY - h.height,
                h.x + h.width, hBaseY
            );
            ctx.closePath();
            ctx.fill();
        });
    }

    // Draw background buildings (skyline) before grass
    if (!grassLevel) grassLevel = canvas.height - (canvas.height * 0.12);
    if (gameState.buildings) {
        gameState.buildings.forEach(b => {
            let bY = Math.floor(grassLevel - b.height + 5); // Sink slightly into grass
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, bY, b.width, b.height);

            // Draw details based on building type
            if (b.type === 'hut') {
                // roof
                ctx.fillStyle = b.roofColor;
                ctx.beginPath();
                ctx.moveTo(b.x - 5, bY);
                ctx.lineTo(b.x + b.width / 2, bY - 15);
                ctx.lineTo(b.x + b.width + 5, bY);
                ctx.fill();
                // door
                ctx.fillStyle = '#111';
                ctx.fillRect(b.x + b.width / 2 - 5, bY + b.height - 15, 10, 15);
                // windows
                ctx.fillStyle = '#ffeb3b';
                if (b.windows >= 1) ctx.fillRect(b.x + 5, bY + 10, 8, 8);
                if (b.windows >= 2) ctx.fillRect(b.x + b.width - 13, bY + 10, 8, 8);
            } else if (b.type === 'tower') {
                // antenna
                ctx.fillStyle = '#222';
                ctx.fillRect(b.x + b.width / 2 - 1, bY - 20, 2, 20);
                // blinking light
                ctx.fillStyle = '#f44336';
                if (Math.floor(timestamp / 500) % 2 === 0) {
                    ctx.fillRect(b.x + b.width / 2 - 2, bY - 20, 4, 4);
                }
                // windows
                ctx.fillStyle = '#ffeb3b';
                b.litLights.forEach(wy => {
                    ctx.fillRect(b.x + b.width / 2 - 4, bY + wy, 8, 10);
                });
            } else if (b.type === 'apt') {
                ctx.fillStyle = '#ffeb3b';
                b.litGrid.forEach(row => {
                    row.xList.forEach(wx => {
                        ctx.fillRect(b.x + 5 + wx * 15, bY + row.y, 8, 10);
                    });
                });
            }
        });
    }

    // Draw Grass Foreground
    ctx.fillStyle = '#1b5e20'; // Dark green
    let grassH = canvas.height * 0.12; // Bottom 12%
    let grassY = canvas.height - grassH;

    ctx.beginPath();
    ctx.moveTo(0, grassY);
    for (let i = 0; i <= canvas.width + 20; i += 20) {
        // Jagged grass blades
        ctx.lineTo(i - 10, grassY - 15 - (i % 25));
        ctx.lineTo(i, grassY);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // Draw top border line for grass to define it
    ctx.strokeStyle = '#33691E';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Update & Draw Eagles (drawn over background buildings and grass)
    gameState.eagles.forEach(eagle => {
        eagle.update(dt);
        eagle.draw(ctx);
    });
    gameState.eagles = gameState.eagles.filter(eagle => eagle.y < canvas.height + 100 && eagle.y > -200);

    // Update & Draw Hotdogs
    gameState.hotdogs.forEach(h => {
        h.update(dt);
        h.draw(ctx);
    });
    gameState.hotdogs = gameState.hotdogs.filter(h => h.y < canvas.height + 100 && h.y > -200);

    // Update & Draw Seeking Missiles
    gameState.seekingMissiles.forEach(m => {
        m.update(dt);
        m.draw(ctx);
    });
    gameState.seekingMissiles = gameState.seekingMissiles.filter(m => !m.fullyDead);

    // Update & Draw Projectiles ON TOP of grass and foreground
    gameState.projectiles.forEach(p => {
        p.update(dt);
        p.draw(ctx);
    });
    gameState.projectiles = gameState.projectiles.filter(p => !p.fullyDead);

    // Update and Draw Floating Text (Points)
    gameState.floatingTexts.forEach(ft => {
        ft.y += 40 * dt; // fall down slightly
        ft.life -= dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);

        const pixelFont = {
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
            '9': ["###", "# #", "###", "  #", "###"]
        };

        let pSize = 4;
        let startX = ft.x - (ft.text.length * 4 * pSize) / 2;

        // Draw entire black outline first
        ctx.fillStyle = '#000';
        for (let i = 0; i < ft.text.length; i++) {
            let pattern = pixelFont[ft.text[i]];
            if (pattern) {
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 3; col++) {
                        if (pattern[row][col] === '#') {
                            ctx.fillRect(startX + col * pSize + i * 4 * pSize - pSize, ft.y + row * pSize - pSize, pSize * 3, pSize * 3);
                        }
                    }
                }
            }
        }

        // Draw entire yellow inner
        ctx.fillStyle = '#FFeb3b';
        for (let i = 0; i < ft.text.length; i++) {
            let pattern = pixelFont[ft.text[i]];
            if (pattern) {
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 3; col++) {
                        if (pattern[row][col] === '#') {
                            ctx.fillRect(startX + col * pSize + i * 4 * pSize, ft.y + row * pSize, pSize, pSize);
                        }
                    }
                }
            }
        }

        ctx.restore();
    });
    gameState.floatingTexts = gameState.floatingTexts.filter(ft => ft.life > 0);

    // Draw Screen Flash
    if (flashFrames > 0) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashFrames--;
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
        if (gameState.timer > 0 && dogY < canvas.height - 50) {
            ctx.font = "bold 13px 'Courier New', Courier, monospace";
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

    ctx.fillStyle = "#111111"; // Very dark backing
    ctx.fillRect(bgBoxX, bgBoxY, bgBoxW, bgBoxH);
    ctx.strokeStyle = "#8bc34a"; // Green outer border
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

    drawWeapon(ctx, gunX, gunY, currentAimAngle, gameState.character, gameState.round >= 30, gameState.powerUpActive, dSize, timestamp);

    requestAnimationFrame(gameLoop);
}

// Start Screen Hookup
const startScreen = document.getElementById('start-screen');
const charSelection = document.getElementById('char-selection');
const startBtn = document.getElementById('start-btn');
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
    startBGM(Math.min(5, Math.floor(gameState.killCount / 10) + 1));
}
window.selectCharacter = selectCharacter;

function startGame() {
    startScreen.style.display = 'none';
    charSelection.style.display = 'flex';
    
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
    gameState.sunClicks = 0;
    gameState.infiniteAmmo = false;
    document.getElementById('round-display').innerText = 'R=1';

    gameState.buildings = [];
    gameState.hills = [];
    gameState.hotdogs = [];
    gameState.seekingMissiles = [];
    gameState.airplanes = [];
    gameState.tigers = [];
    gameState.floatingTexts = [];
    gameState.lastAirplaneTime = performance.now();
    spawnBuildings(1);
    spawnHills();

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

startBtn.addEventListener('click', startGame);
startBtn.addEventListener('touchstart', startGame, { passive: true });

function launchFsAndStart(e) {
    toggleFullscreen(e);
    startGame();
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
requestAnimationFrame(gameLoop);
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
        ctx.font = `bold ${8 * dSize}px 'Courier New'`;
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
        ctx.fillStyle = isGolden ? "#d4af37" : "#212121";
        ctx.fillRect(0, -barrelLen - 4 * dSize, 10 * dSize, barrelLen);
        ctx.fillStyle = isGolden ? "#fbf5b7" : "#757575";
        ctx.fillRect(1 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
        ctx.fillRect(6 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
        ctx.fillStyle = "#000"; ctx.fillRect(4 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
        ctx.fillStyle = "#388e3c"; ctx.fillRect(-2 * dSize, -7 * dSize, 14 * dSize, 7 * dSize);
        if (isPowerActive) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
            ctx.fillRect(0, -barrelLen - 4 * dSize, 10 * dSize, barrelLen);
            ctx.fillRect(-2 * dSize, -7 * dSize, 14 * dSize, 7 * dSize);
        }
    } else if (charId === 2) { // Magic Staff
        let staffLen = 40 * dSize;
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(3 * dSize, -staffLen, 4 * dSize, staffLen);
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

function drawShadowyMonk(ctx, frame, timestamp) {
    const w = shadowyMonkCanvas.width;
    const h = shadowyMonkCanvas.height;
    ctx.clearRect(0, 0, w, h);
    
    let dSize = 15; // Increased size
    let centerX = w / 2;
    let centerY = h / 2 + 50;
    
    // Animation offset
    let yOff = Math.sin(timestamp / 200) * 8;
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
    
    ctx.restore();
}

function showShadowyScreen(round) {
    // Save current game state before entering the shadowy figure screen
    savedGameState = JSON.parse(JSON.stringify(gameState));
    
    gameState.phase = 'SHADOW';
    shadowyScreen.style.display = 'flex';
    shadowyContinue.style.display = 'none';
    
    const charToUnlock = (round / 10) + 1; // 10 -> 2 (Ascetic), 20 -> 3 (Arbitrator)
    
    // Detect if this is a first-time unlock
    // gameState.maxRoundReached was already updated to round+1.
    // So if the previous max was <= round, it's a new unlock.
    let prevMax = parseInt(localStorage.getItem('mallard_max_round_prev') || '0');
    const isNewUnlock = (prevMax < round);
    
    // Cache the current max for next time comparison (logic helper)
    localStorage.setItem('mallard_max_round_prev', round.toString());
    
    const portraitContainer = document.getElementById('shadowy-portrait-container');

    // Set text and portrait visibility
    if (isNewUnlock) {
        portraitContainer.style.display = 'flex';
        if (round === 10) {
            shadowyText.innerText = "You have proven your skill. The Ascetic joins your cause. 'A simple life, a sharp mind... and a very large staff.'";
        } else if (round === 20) {
            shadowyText.innerText = "The laws of this land are brittle. The Arbitrator shall mend them. 'Justice is a flame that consumes the wicked.'";
        } else {
             shadowyText.innerText = "You continue to defy the odds, traveler. Your journey is far from over.";
        }
    } else {
        portraitContainer.style.display = 'none';
        shadowyText.innerText = arnoldQuotes[Math.floor(Math.random() * arnoldQuotes.length)];
    }
    
    // Draw portrait
    if (isNewUnlock) {
        const pCtx = shadowyCharCanvas.getContext('2d');
        pCtx.clearRect(0, 0, 120, 120);
        // Draw centered and large
        drawPortrait(pCtx, 12, 12, charToUnlock, performance.now(), 6, false, false, false, true, false);
    }
    
    // Animation loop for monk
    const mCtx = shadowyMonkCanvas.getContext('2d');
    let startTime = performance.now();
    
    function anim(t) {
        if (gameState.phase !== 'SHADOW') return;
        shadowyAnimFrame = Math.floor((t - startTime) / 150);
        drawShadowyMonk(mCtx, shadowyAnimFrame, t);
        shadowyAnimHandle = requestAnimationFrame(anim);
    }
    shadowyAnimHandle = requestAnimationFrame(anim);
    
    // Show continue button after 2 seconds
    setTimeout(() => {
        shadowyContinue.style.display = 'block';
    }, 2000);
}

shadowyContinue.onclick = (e) => {
    if (e) e.stopPropagation();
    
    shadowyScreen.style.display = 'none';
    cancelAnimationFrame(shadowyAnimHandle);
    
    // Restore the saved game state
    if (savedGameState) {
        // Carry over the current maxRoundReached if it was updated during the round end
        let currentMax = gameState.maxRoundReached;
        let currentRound = gameState.round;
        
        Object.assign(gameState, savedGameState);
        
        gameState.maxRoundReached = currentMax;
        gameState.round = currentRound;
        savedGameState = null;
    }
    
    // Re-initialize state for the next round
    gameState.phase = 'SPAWN';
    gameState.lastTime = performance.now(); // Reset lastTime to avoid huge delta
    
    // Re-build the world
    spawnBuildings(gameState.round);
    if (gameState.round % 5 === 0) {
        spawnHills();
    }
    
    document.getElementById('round-display').innerText = 'R=' + gameState.round;
    updateUI();
    
    // RESTART the main game loop
    requestAnimationFrame(gameLoop);
};
