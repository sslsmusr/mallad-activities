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
dogImg1.src = 'dog1.png';
const dogImg2 = new Image();
dogImg2.src = 'dog2.png';

// Audio Context setup for sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let quackBuffer = null;
let wompBuffer = null;
let snickerBuffer = null;
let jingleBuffer = null;
let bgmBuffer = null;
let bgmSource = null; // To track and update the playing BGM

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

function playSound(buffer, volume = 1.0) {
    if (!buffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
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
        for (let i = 0 ; i < n_samples; ++i ) {
            let x = i * 2 / n_samples - 1;
            curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
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

// Game State
let gameState = {
    score: 0,
    killCount: 0,
    sessionKills: 0, // Kills in current round to track extra bullets
    ammo: 5,
    round: 1,
    ducks: [],
    projectiles: [], // Store flying projectiles
    lastTime: 0,
    phase: 'START',
    timer: 0,
    dogQuote: '',
    dogPlayedSound: false,
    escapedThisRound: 0, // Tracks ducks that flew away
    perfectRounds: 0, // Count of flawless rounds
    sunClicks: 0,
    infiniteAmmo: false
};

const motivationalQuotes = [
    "Shoot for the moon, land in the dirt.",
    "Practice makes perfect... eventually.",
    "At least you're consistent.",
    "The ducks are judging you.",
    "Believe in yourself. I don't.",
    "Keep calm and miss again.",
    "Participation trophy earned!",
    "Success is a journey to nowhere.",
    "Dream big, aim terribly.",
    "Your best is almost adequate."
];

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

class Projectile {
    constructor(startX, startY, targetX, targetY, targetDuck, hitSun) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.targetDuck = targetDuck;
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
        if (this.timeElapsed >= this.timeTotal) {
            this.impact();
            this.isDead = true;
        }
    }

    impact() {
        if (this.hitSun || (this.targetDuck && !this.targetDuck.isDead)) {
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
            gameState.score += 500;
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
            
            updateUI();
        } else if (!this.hitSun && !this.targetDuck) {
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
        
        // Dynamically track flying duck if targeted
        if (this.targetDuck && !this.targetDuck.isDead) {
            targetX = this.targetDuck.x + this.targetDuck.width / 2;
            targetY = this.targetDuck.y + this.targetDuck.height / 2;
        }

        let currentX = this.startX + (targetX - this.startX) * t;
        let currentY = this.startY + (targetY - this.startY) * t;
        
        let trailLength = 60;
        let dist = Math.hypot(targetX - this.startX, targetY - this.startY);
        let ratio = trailLength / dist;
        if (ratio > t) ratio = t; // don't draw trail longer than travelled distance

        let tailX = currentX - (targetX - this.startX) * ratio;
        let tailY = currentY - (targetY - this.startY) * ratio;

        ctx.strokeStyle = "rgba(156, 39, 176, 1.0)"; // opaque purple trail
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        ctx.fillStyle = "#ffffff"; // hot white bullet tip
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
    if (gameState.phase === 'START') return; // Don't allow shooting during start screen

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

    // Check for hit targets (Evaluate immediately, impact logic is deferred)
    let hitDuck = null;
    let hitSun = false;
    
    // Check for Easter Egg: Clicking the Sun
    let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
    // Expand sun hitbox slightly to account for travel prediction
    if (currentLevel >= 4 && Math.abs(x - 80) <= 60 && Math.abs(y - 80) <= 60) {
        hitSun = true;
    }

    if (!hitSun) {
        for (let i = gameState.ducks.length - 1; i >= 0; i--) {
            const duck = gameState.ducks[i];
            if (!duck.isDead && !duck.isTargeted &&
                x >= duck.x && x <= duck.x + duck.width &&
                y >= duck.y && y <= duck.y + duck.height) {
                
                hitDuck = duck;
                duck.isTargeted = true; // Mark targeted so it isn't hit by multiple projectiles
                break; 
            }
        }
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

    gameState.projectiles.push(new Projectile(startX, startY, x, y, hitDuck, hitSun));

    if (!gameState.infiniteAmmo) {
        gameState.ammo--;
    }
    updateUI();
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
}

let flashFrames = 0;
function flashScreen() {
    flashFrames = 3; // Flash for 3 frames
}

// Game Loop
function gameLoop(timestamp) {
    // Calculate delta time in seconds
    let dt = (timestamp - gameState.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // Cap dt to avoid huge jumps
    gameState.lastTime = timestamp;

    let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);

    // Always Sky blue, revert the redness
    ctx.fillStyle = '#64b5f6'; 
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
                if (x*x + y*y <= sunRadius*sunRadius) {
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
            ctx.fillRect(tX, tY, pSize*5, pSize*4); // fist box
            ctx.fillRect(tX - pSize, tY - pSize*4, pSize*2, pSize*4); // thumb pointing up
            
            // Hand outline shading for pixel 3D volume
            ctx.fillStyle = "black";
            ctx.fillRect(tX, tY - pSize, pSize*3, pSize); // top fist crease
            ctx.fillRect(tX + pSize, tY, pSize, pSize*2); // root thumb fold
            ctx.fillRect(tX + pSize*5, tY + pSize, pSize, pSize); // finger 1 crease
            ctx.fillRect(tX + pSize*5, tY + pSize*3, pSize, pSize); // finger 2 crease
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
        let speed = 20 + (c % 3) * 10;
        let cx = ((startX + timestamp / 1000 * speed) % (canvas.width + 120)) - 60;
        let cy = 20 + (c * 47) % (canvas.height * 0.6); 
        
        // Simple 8-bit cloud shape
        ctx.fillRect(cx, cy, 40, 20);
        ctx.fillRect(cx - 10, cy + 10, 60, 10);
        ctx.fillRect(cx + 10, cy - 10, 20, 10);
    }

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
            return false;
        }
        return duck.y < canvas.height + 100 && duck.y > -200;
    });

    // Auto-start BGM mid-game if it finishes loading late
    if (!bgmSource && bgmBuffer && gameState.phase !== 'START') {
        let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        startBGM(currentLevel);
    }

    // Phase Logic
    if (gameState.phase === 'SPAWN') {
        gameState.ducks.push(new Duck());
        gameState.ducks.push(new Duck());
        gameState.ammo = 5;
        gameState.sessionKills = 0; // Reset consecutive kills per round
        gameState.escapedThisRound = 0; // Reset escaping penalization
        updateUI();
        
        let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
        startBGM(currentLevel); // Make sure the music speed updates each round!
        
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
        
        // Dog animation: 0.5s up, 1.5s hold, 0.5s down
        let dW = 200, dH = 260; // Taller for waist-up
        let startY = canvas.height;
        let targetY = canvas.height - dH + 20; // Slight overlap to not show bottom edge
        let dogY = startY;
        let currentDogImg = dogImg1;

        if (gameState.timer > 2) {
            // Popping up
            let progress = (2.5 - gameState.timer) / 0.5;
            dogY = startY - progress * (startY - targetY);
        } else if (gameState.timer > 0.5) {
            // Hold - laughing animation
            dogY = targetY;
            if (!gameState.dogPlayedSound) {
                playSound(snickerBuffer, 0.6);
                gameState.dogPlayedSound = true;
            }
            // Switch frame every ~0.15s
            if (Math.floor(gameState.timer * 6) % 2 === 0) {
                currentDogImg = dogImg2;
            } else {
                currentDogImg = dogImg1;
            }
            
        } else if (gameState.timer > 0) {
            // Going down
            let progress = (0.5 - gameState.timer) / 0.5;
            dogY = targetY + progress * (startY - targetY);
        }

        // Draw Dog First
        ctx.drawImage(currentDogImg, canvas.width / 2 - dW / 2, dogY, dW, dH);
        
        // Draw Pixel-Art Speech bubble OVER the dog
        if (gameState.timer > 0 && dogY < canvas.height - 50) {
            ctx.font = "bold 13px 'Courier New', Courier, monospace";
            let textMetrics = ctx.measureText(gameState.dogQuote);
            let bubbleW = Math.max(160, textMetrics.width + 30);
            let bubbleH = 40;
            
            // Place 5 pixels to the right of the dog
            let isOnRight = true;
            let bubbleX = (canvas.width / 2 + dW / 2) + 5;
            let bubbleY = dogY - 40; // Moved up an additional 20px
            
            // If it goes off-screen right, move to left side
            if (bubbleX + bubbleW > canvas.width - 5) {
                bubbleX = (canvas.width / 2 - dW / 2) - bubbleW - 5;
                isOnRight = false;
            }
            
            // Just in case it doesn't fit on the left either, center it
            if (bubbleX < 5) {
                bubbleX = Math.max(5, canvas.width / 2 - bubbleW / 2);
            }
            
            let pSize = 4; // Pixel scale for chunky retro look

            // 1. Black Outline (using rects for blockiness)
            ctx.fillStyle = "black";
            ctx.fillRect(bubbleX - pSize, bubbleY, bubbleW + pSize*2, bubbleH);
            ctx.fillRect(bubbleX, bubbleY - pSize, bubbleW, bubbleH + pSize*2);
            
            // 2. White Inside
            ctx.fillStyle = "white";
            ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);

            // 3. Text
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(gameState.dogQuote, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
        }
        
        if (gameState.timer <= 0) {
            gameState.phase = 'SPAWN';
            gameState.round++;
            document.getElementById('round-display').innerText = 'R=' + gameState.round;
        }
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

    // Update & Draw Projectiles ON TOP of grass and foreground
    gameState.projectiles.forEach(p => {
        p.update(dt);
        p.draw(ctx);
    });
    gameState.projectiles = gameState.projectiles.filter(p => !p.fullyDead);

    // Draw Screen Flash
    if (flashFrames > 0) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashFrames--;
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

    // Portrait Background Box
    ctx.fillStyle = "#424242";
    ctx.fillRect(portraitX, portraitY, 16 * dSize, 15 * dSize);

    // Skin
    ctx.fillStyle = "#ffcc80";
    ctx.fillRect(portraitX + 3 * dSize, portraitY + 3 * dSize, 10 * dSize, 10 * dSize);

    // Straw Hat (Yellow/Tan)
    ctx.fillStyle = "#e6c229"; // Straw yellow
    ctx.fillRect(portraitX + 3 * dSize, portraitY + 1 * dSize, 10 * dSize, 4 * dSize); // Hat dome
    ctx.fillRect(portraitX + 1 * dSize, portraitY + 4 * dSize, 14 * dSize, 2 * dSize); // Hat brim
    
    // Hat Band
    ctx.fillStyle = "#d63031"; // Red band
    ctx.fillRect(portraitX + 3 * dSize, portraitY + 3 * dSize, 10 * dSize, 1 * dSize);

    // Cool Sunglasses
    ctx.fillStyle = "#111111"; // Dark grey/black lenses
    ctx.fillRect(portraitX + 3 * dSize, portraitY + 6 * dSize, 10 * dSize, 3 * dSize);
    
    // Bridge cutout (putting skin back)
    ctx.fillStyle = "#ffcc80"; 
    ctx.fillRect(portraitX + 7 * dSize, portraitY + 8 * dSize, 2 * dSize, 1 * dSize);
    
    // Sunglass glare
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(portraitX + 4 * dSize, portraitY + 6 * dSize, 2 * dSize, 1 * dSize);
    ctx.fillRect(portraitX + 10 * dSize, portraitY + 6 * dSize, 2 * dSize, 1 * dSize);

    // Red Bandana Scarf
    ctx.fillStyle = "#d63031"; 
    ctx.fillRect(portraitX + 2 * dSize, portraitY + 13 * dSize, 12 * dSize, 2 * dSize);

    // Player Mouth Animation (2 Frames)
    ctx.fillStyle = "#4e342e"; // Dark inner mouth
    let mouthOpen = Math.floor(timestamp / 300) % 2 === 0;
    if (mouthOpen) {
        ctx.fillRect(portraitX + 6 * dSize, portraitY + 9 * dSize, 4 * dSize, 3 * dSize);
        // Teeth
        ctx.fillStyle = "white";
        ctx.fillRect(portraitX + 6 * dSize, portraitY + 9 * dSize, 4 * dSize, 1 * dSize);
    } else {
        ctx.fillRect(portraitX + 6 * dSize, portraitY + 10 * dSize, 4 * dSize, 1 * dSize);
    }

    // Static Gun Rotated (Now dynamic based on aiming)
    let gunX = bgBoxX + bgBoxW + 20;
    let gunY = canvas.height - uiYOffset + 10; // set pivot at bottom of screen
    
    // Smoothly track current aim regardless of firing (Active HUD tracking)
    currentAimAngle = Math.atan2(currentAimY - gunY, currentAimX - gunX) + Math.PI / 2;
    
    ctx.save();
    ctx.translate(gunX, gunY);
    ctx.rotate(currentAimAngle);

    let barrelLen = 31 * dSize; // 50% longer than 21 (roughly ~31)
    
    let isGolden = gameState.round >= 30;

    // Barrels (Double barrel shotgun)
    ctx.fillStyle = isGolden ? "#d4af37" : "#212121";
    ctx.fillRect(0, -barrelLen - 4 * dSize, 10 * dSize, barrelLen);
    ctx.fillStyle = isGolden ? "#fbf5b7" : "#757575"; // Highlights
    ctx.fillRect(1 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
    ctx.fillRect(6 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);
    
    // Gap between barrels
    ctx.fillStyle = "#000000";
    ctx.fillRect(4 * dSize, -barrelLen - 4 * dSize, 2 * dSize, barrelLen);

    // Grip/Hand holding it
    ctx.fillStyle = "#388e3c"; // Doomguy green glove
    ctx.fillRect(-2 * dSize, -7 * dSize, 14 * dSize, 7 * dSize);
    ctx.fillStyle = "#1b5e20";
    ctx.fillRect(-2 * dSize, -2 * dSize, 14 * dSize, 2 * dSize); // knuckles frame
    
    // Draw Laser Sight (Level 30+)
    if (isGolden) {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; // Transparent red laser beam
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(5 * dSize, -barrelLen - 4 * dSize);
        ctx.lineTo(5 * dSize, -2000); // Shoot out perfectly parallel to barrels into sky
        ctx.stroke();
    }

    // Muzzle Flash Animation (2 Frames based on tap timing)
    let timeSinceShot = performance.now() - lastShotTime;
    if (timeSinceShot < 100) { // Keep under the 100ms flight-time threshold
        if (timeSinceShot < 40) {
            // Frame 1: Massive explosive burst
            ctx.fillStyle = "#ff9800"; // Orange backing
            ctx.fillRect(-4 * dSize, -barrelLen - 12 * dSize, 18 * dSize, 10 * dSize);
            ctx.fillStyle = "#ffeb3b"; // Yellow core
            ctx.fillRect(-2 * dSize, -barrelLen - 10 * dSize, 14 * dSize, 6 * dSize);
            ctx.fillStyle = "#ffffff"; // White hot center
            ctx.fillRect(2 * dSize, -barrelLen - 9 * dSize, 6 * dSize, 4 * dSize);
        } else {
            // Frame 2: Dissipating puff
            ctx.fillStyle = "#ffeb3b";
            ctx.fillRect(0, -barrelLen - 8 * dSize, 10 * dSize, 5 * dSize);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(3 * dSize, -barrelLen - 7 * dSize, 4 * dSize, 3 * dSize);
        }
    }
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Start Screen Hookup
const startScreen = document.getElementById('start-screen');
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

function startGame() {
    // Hide UI overlay
    startScreen.style.display = 'none';
    
    // Satisfy browser audio requirement to allow sounds
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Kickoff Game Logic
    let currentLevel = Math.min(5, Math.floor(gameState.killCount / 10) + 1);
    startBGM(currentLevel);
    
    gameState.phase = 'SPAWN';
    gameState.lastTime = performance.now();
}

startBtn.addEventListener('click', startGame);
startBtn.addEventListener('touchstart', startGame, {passive: true});

function launchFsAndStart(e) {
    toggleFullscreen(e);
    startGame();
}

startBtnFs.addEventListener('click', launchFsAndStart);
startBtnFs.addEventListener('touchstart', launchFsAndStart, {passive: true});

toggleFs.addEventListener('click', toggleFullscreen);
toggleFs.addEventListener('touchstart', toggleFullscreen, {passive: true});

// Start Game visual loop (only background draws until button click)
gameState.lastTime = performance.now();
requestAnimationFrame(gameLoop);
