
        // --- INICIALIZACIÓN Y REFERENCIAS DOM ---
        const body = document.body;
        const shipElement = document.getElementById('ship');
        const uiPanels = document.querySelectorAll('.ui-panel');
        const ammoValueSpan = document.getElementById('ammo-value');
        const shieldValueSpan = document.getElementById('shield-value');
        const empButton = document.getElementById('emp-button');
        const empPartsValueSpan = document.getElementById('emp-parts-value');
        const collisionsValueSpan = document.getElementById('collisions-value');
        const levelDisplay = document.getElementById('level-value');
        const timerDisplay = document.getElementById('time-value');
        const gameOverScreen = document.getElementById('game-over-screen');
        const startMenu = document.getElementById('start-menu');
        const startGameButton = document.getElementById('start-game-button');
        const playerNameInput = document.getElementById('player-name-input');
        const levelUpScreen = document.getElementById('level-up-screen');
        const levelUpCountdownValue = document.getElementById('countdown-value');
        const starsBackground = document.getElementById('stars-background');

        // --- ESTADO DEL JUEGO ---
        let targetX, targetY;
        let gameRunning = false;
        let animationFrameId;
        let playerName = "Piloto Anónimo";
        let collisions = 0;
        let currentLevel = 1;
        let startTime = 0;
        let ammo = 5;
        let isShieldActive = false;
        let shieldEndTime = 0;
        let empParts = 0;
        const activeGameObjects = [];
        let gameIntervals = [];
        
        // --- CONSTANTES DE CONFIGURACIÓN ---
        const touchOffsetY = -75;
        const proximityThreshold = 30;
        const maxCollisions = 10;
        const levelUpTimeThreshold = 60000;
        
        // --- GENERACIÓN LOCAL DE CONTENIDO ---
        function generateSectorName(level) {
            const theme = getLevelTheme(level);
            const namesByTheme = {
                Estándar: ['Sector Nexo', 'Ruta de Bruma', 'Zona Horizonte', 'Corredor Vela'],
                'Campos magnéticos': ['Cinturón de Tormenta', 'Presa Magnética', 'Corriente Zeta', 'Mina Polar'],
                'Nebulosa espectral': ['Velo Espectral', 'Niebla de Helio', 'Nebulosa Vesper', 'Punto Sombrío'],
                'Lluvia de cometas': ['Cortina de Hielo', 'Cola de Fuego', 'Lágrima Cósmica', 'Ráfaga de Cometas'],
                'Singularidad inestable': ['Bucle Negro', 'Punto de Ruptura', 'Vórtice Único', 'Marea de Singularidad']
            };
            const options = namesByTheme[theme] || namesByTheme.Estándar;
            return options[Math.floor(Math.random() * options.length)];
        }

        function generateMissionReport(playerName, formattedTime, levelReached, collisionCount) {
            const toneOptions = collisionCount <= 1
                ? ['heroico', 'victoria total']
                : collisionCount <= 5
                    ? ['tenso', 'supervivencia brillante']
                    : ['dramático', 'huida desesperada'];
            const [tone, outcome] = toneOptions;
            return [
                `Capitán ${playerName}, la misión ha concluido con un resultado de ${outcome}.`,
                `La nave resistió ${formattedTime} de travesía y alcanzó el sector ${levelReached}.`,
                `Se registraron ${collisionCount} impactos en el casco, suficientes para marcar esta campaña como ${tone}.`,
                'La tripulación llegó a salvo al punto de extracción y el destino del convoy quedó abierto a una nueva aventura.'
            ].join('\n');
        }

        // --- FUNCIONES Y CLASES AUXILIARES ---
        function createFireworkEffect(x, y, numSparks = 10, colorOverride = null) {
            const sparkColors = ['bg-yellow-400', 'bg-orange-400', 'bg-red-400', 'bg-purple-400', 'bg-sky-400'];
            for (let i = 0; i < numSparks; i++) {
                const spark = document.createElement('div');
                spark.classList.add('spark');
                if (colorOverride) {
                    spark.style.backgroundColor = colorOverride;
                } else {
                    spark.classList.add(sparkColors[Math.floor(Math.random() * sparkColors.length)]);
                }
                
                spark.style.left = `${x}px`;
                spark.style.top = `${y}px`;
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 80 + 30;
                spark.style.setProperty('--spark-end-dx', `${Math.cos(angle) * distance}px`);
                spark.style.setProperty('--spark-end-dy', `${Math.sin(angle) * distance}px`);
                spark.style.animationDelay = `${Math.random() * 0.2}s`;
                body.appendChild(spark);
                setTimeout(() => spark.remove(), 1000);
            }
        }
        
        // --- CLASES DE OBJETOS DEL JUEGO ---
        class GameObject {
            constructor(className, size) {
                this.element = document.createElement('div');
                this.element.classList.add(className);
                this.width = size;
                this.height = size;
                this.radius = size / 2;
                this.element.style.width = `${this.width}px`;
                this.element.style.height = `${this.height}px`;
                this.creationTime = Date.now();
                this.isMarkedForRemoval = false;
                
                const edge = Math.floor(Math.random() * 4);
                if (edge === 0) { this.x = Math.random() * window.innerWidth; this.y = -this.height; }
                else if (edge === 1) { this.x = window.innerWidth + this.width; this.y = Math.random() * window.innerHeight; }
                else if (edge === 2) { this.x = Math.random() * window.innerWidth; this.y = window.innerHeight + this.height; }
                else { this.x = -this.width; this.y = Math.random() * window.innerHeight; }

                body.appendChild(this.element);
            }

            update() {
                this.element.style.left = `${this.x}px`;
                this.element.style.top = `${this.y}px`;
            }

            remove() {
                if (this.isMarkedForRemoval) return;
                this.isMarkedForRemoval = true;
                this.element.remove();
            }
            
            isOffScreen() {
                 const buffer = 100;
                 return this.x < -buffer || this.x > window.innerWidth + buffer || this.y < -buffer || this.y > window.innerHeight + buffer;
            }
        }
        
        class Asteroid extends GameObject {
             constructor(className = 'asteroid', size = Math.floor(Math.random() * 21) + 30) {
                super(className, size);
                this.baseSpeed = Math.random() * (currentLevel * 0.5) + 1;
                this.speed = this.baseSpeed;
                this.rotation = 0;
                this.rotationSpeed = Math.random() * 4 - 2;
                const color = ['bg-gray-600', 'bg-stone-700', 'bg-zinc-700'][Math.floor(Math.random() * 3)];
                this.element.classList.add(color);
                
                // Lifecycle properties
                this.state = 'moving';
                this.slowdownStartTime = this.creationTime + 5000;
                this.fullyStoppedTime = this.slowdownStartTime + 2000;
                this.disappearTime = this.fullyStoppedTime + 10000;
            }
            
            update() {
                const now = Date.now();
                
                // Lifecycle state machine
                if (this.state === 'moving' && now >= this.slowdownStartTime) {
                    this.state = 'slowing';
                } else if (this.state === 'slowing' && now >= this.fullyStoppedTime) {
                    this.state = 'stopped';
                    this.speed = 0;
                } else if (now >= this.disappearTime) {
                    this.remove();
                    createFireworkEffect(this.x, this.y, 25);
                    return;
                }

                if(this.state !== 'stopped') {
                    if(this.state === 'slowing') {
                        const slowdownProgress = (now - this.slowdownStartTime) / 2000; // 2000ms duration
                        this.speed = this.baseSpeed * (1 - slowdownProgress);
                        if(this.speed < 0) this.speed = 0;
                    }

                    const dx = targetX - this.x;
                    const dy = targetY - this.y;
                    const angle = Math.atan2(dy, dx);
                    this.x += Math.cos(angle) * this.speed;
                    this.y += Math.sin(angle) * this.speed;
                }

                this.rotation += this.rotationSpeed;
                this.element.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
                super.update();
                
                if (this.isOffScreen()) this.remove();
            }
        }
        
        class MagneticAsteroid extends Asteroid {
            constructor() {
                super('magnetic-asteroid', Math.floor(Math.random() * 21) + 40);
                this.element.classList.remove('bg-gray-600', 'bg-stone-700', 'bg-zinc-700');
                this.element.classList.add('bg-blue-800');
                this.magneticForce = 0.5;
            }
        }
        
        class NestAsteroid extends Asteroid {
             constructor() {
                super('nest-asteroid', Math.floor(Math.random() * 31) + 60);
                this.health = 3;
            }
            
            takeDamage() {
                this.health--;
                this.element.style.transform += ' scale(1.1)';
                setTimeout(() => this.element.style.transform = this.element.style.transform.replace(' scale(1.1)', ''), 100);
                if (this.health <= 0) {
                    this.remove();
                    for(let i=0; i < 4; i++) {
                        const smallAsteroid = new Asteroid('asteroid', 20);
                        smallAsteroid.x = this.x;
                        smallAsteroid.y = this.y;
                        smallAsteroid.speed *= 1.5;
                        activeGameObjects.push(smallAsteroid);
                    }
                }
            }
        }
        
        class PirateLaser extends GameObject {
             constructor(startX, startY) {
                super('laser-beam', 0);
                this.element.style.backgroundColor = '#f472b6';
                this.element.style.boxShadow = '0 0 10px #f472b6';
                this.element.style.width = '6px';
                this.element.style.height = '6px';
                this.element.style.borderRadius = '50%';
                this.x = startX;
                this.y = startY;
                this.speed = 4;
            }
            update() {
                this.y += this.speed;
                super.update();
                if (this.y > window.innerHeight) this.remove();
            }
        }

        class PirateShip extends GameObject {
            constructor() {
                super('pirate-ship', 40);
                this.element.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><path d="M12 2L2 22h20L12 2zm0 4.55L16.24 14H7.76L12 6.55z"/></svg>')`;
                this.speed = 2;
                this.lastShotTime = Date.now();
                this.shootInterval = 300; // Fire rate increased 10x
                this.y = Math.random() * (window.innerHeight / 4);
                this.x = (Math.random() < 0.5) ? -this.width : window.innerWidth + this.width;
                if (this.x > window.innerWidth) this.speed = -2;
            }

            update() {
                this.x += this.speed;
                if (Date.now() - this.lastShotTime > this.shootInterval) {
                    activeGameObjects.push(new PirateLaser(this.x, this.y + 20));
                    this.lastShotTime = Date.now();
                }
                super.update();
                if (this.isOffScreen()) this.remove();
            }
        }

        class Comet extends GameObject {
            constructor() {
                super('comet', 25);
                this.element.style.backgroundColor = '#a7f3d0';
                this.element.style.borderRadius = '50% 0';
                this.element.style.boxShadow = '0 0 15px #a7f3d0';
                this.speedX = (Math.random() - 0.5) * 12;
                this.speedY = (Math.random() - 0.5) * 12;
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                super.update();
                 if (this.isOffScreen()) this.remove();
            }
        }
        
        class PowerUp extends GameObject {
             constructor(className, size) {
                super(className, size);
                this.element.style.animation = 'pulse-powerup 1.5s infinite';
            }
            update(){
                this.y += 1; // Drift down slowly
                super.update();
                if(this.y > window.innerHeight + this.height) this.remove();
            }
        }

        class AmmoSphere extends PowerUp {
            constructor() { super('ammo-sphere', 25); }
        }

        class CollisionReducerSphere extends PowerUp {
            constructor() { super('collision-reducer', 25); }
        }

        class ShieldKit extends PowerUp { constructor() { super('power-up', 25); this.element.style.backgroundColor = '#4ade80'; this.element.style.borderRadius = '50%'; }}
        class EmpPart extends PowerUp { constructor() { super('emp-part', 20); this.element.style.backgroundColor = '#f59e0b'; this.element.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';}}
        
        class LaserBeam extends GameObject {
             constructor(startX, startY) {
                super('laser-beam', 0);
                this.element.style.width = '4px';
                this.element.style.height = '20px';
                this.x = startX;
                this.y = startY;
                this.speed = 15;
            }

            update() {
                this.y -= this.speed;
                super.update();
                if (this.y < 0) this.remove();
            }
        }

        // --- Controladores de Eventos ---
        function handleInput(x, y, isTouch = false) {
            targetX = x;
            targetY = isTouch ? y + touchOffsetY : y;
        }
        document.addEventListener('mousemove', e => handleInput(e.clientX, e.clientY));
        document.addEventListener('touchstart', e => handleInput(e.touches[0].clientX, e.touches[0].clientY, true), { passive: true });
        document.addEventListener('touchmove', e => handleInput(e.touches[0].clientX, e.touches[0].clientY, true), { passive: true });
        
        document.addEventListener('click', fireLaser);
        let lastTap = 0;
        document.addEventListener('touchend', () => {
            const now = Date.now();
            if (now - lastTap < 300) fireLaser();
            lastTap = now;
        });
        
        function fireLaser() {
            if (gameRunning && ammo > 0) {
                ammo--;
                updateUIAmmo();
                activeGameObjects.push(new LaserBeam(targetX, targetY - 20));
            }
        }
        
        empButton.addEventListener('click', () => {
            if (gameRunning && empParts >= 3) {
                empParts = 0;
                updateUIEmp();
                activeGameObjects.filter(o => o instanceof Asteroid).forEach(a => a.remove());
                createFireworkEffect(window.innerWidth/2, window.innerHeight/2, 100, '#f59e0b');
            }
        });

        // --- BUCLE PRINCIPAL Y LÓGICA DEL JUEGO ---
        function gameLoop() {
            if (!gameRunning) return;

            shipElement.style.left = `${targetX}px`;
            shipElement.style.top = `${targetY}px`;

            activeGameObjects.forEach(obj => obj.update());
            
            checkCollisions();
            runLevelLogic();

            for (let i = activeGameObjects.length - 1; i >= 0; i--) {
                if (activeGameObjects[i].isMarkedForRemoval) {
                    activeGameObjects.splice(i, 1);
                }
            }
            
            updateTimer();
            animationFrameId = requestAnimationFrame(gameLoop);
        }
        
        function checkCollisions() {
            // Asteroid vs Asteroid
            const asteroids = activeGameObjects.filter(o => o instanceof Asteroid);
            for(let i=0; i<asteroids.length; i++) {
                for(let j=i+1; j<asteroids.length; j++) {
                    const a1 = asteroids[i];
                    const a2 = asteroids[j];
                    const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);
                    const min_dist = a1.radius + a2.radius;
                    if (dist < min_dist) {
                        // Resolve overlap
                        const overlap = (min_dist - dist) / 2;
                        const angle = Math.atan2(a1.y - a2.y, a1.x - a2.x);
                        const pushX = Math.cos(angle) * overlap;
                        const pushY = Math.sin(angle) * overlap;
                        
                        a1.x += pushX;
                        a1.y += pushY;
                        a2.x -= pushX;
                        a2.y -= pushY;
                    }
                }
            }

            // Player Lasers vs Targets
            const lasers = activeGameObjects.filter(o => o instanceof LaserBeam);
            const targets = activeGameObjects.filter(o => o instanceof Asteroid || o instanceof PirateShip);
            lasers.forEach(laser => {
                targets.forEach(target => {
                    if (laser.isMarkedForRemoval || target.isMarkedForRemoval) return;
                    if (Math.hypot(laser.x - target.x, laser.y - target.y) < target.radius) {
                        laser.remove();
                        if(target instanceof NestAsteroid) target.takeDamage();
                        else target.remove();
                        createFireworkEffect(target.x, target.y, 15);
                         if (Math.random() < 0.2) spawnRandomPowerUp(target.x, target.y);
                    }
                });
            });
            
            // Player Ship vs Hazards
            if (!isShieldActive) {
                const hazards = activeGameObjects.filter(o => o instanceof Asteroid || o instanceof Comet || o instanceof PirateShip || o instanceof PirateLaser);
                hazards.forEach(hazard => {
                    if (hazard.isMarkedForRemoval) return;
                    if (Math.hypot(targetX - hazard.x, targetY - hazard.y) < proximityThreshold + hazard.radius) {
                        hazard.remove();
                        handlePlayerCollision();
                    }
                });
            }

            // Player Ship vs PowerUps
            const allPowerUps = activeGameObjects.filter(o => o instanceof PowerUp);
            allPowerUps.forEach(p => {
                 if(p.isMarkedForRemoval) return;
                 if(Math.hypot(targetX - p.x, targetY - p.y) < 50) {
                     p.remove();
                     if (p instanceof AmmoSphere) { ammo += 5; updateUIAmmo(); }
                     if (p instanceof CollisionReducerSphere) { collisions = Math.max(0, collisions - 1); collisionsValueSpan.textContent = collisions; }
                     if (p instanceof ShieldKit) activateShield();
                     if (p instanceof EmpPart) { empParts = Math.min(3, empParts + 1); updateUIEmp(); }
                 }
            });
        }
        
        function handlePlayerCollision() {
            collisions++;
            updateUI();
            createFireworkEffect(targetX, targetY, 30, '#ff4d4d');
            if(collisions >= maxCollisions) endGame();
        }
        
        function runLevelLogic() {
            if (currentLevel >= 2) {
                const magneticAsteroids = activeGameObjects.filter(o => o instanceof MagneticAsteroid);
                magneticAsteroids.forEach(mag => {
                    if(Math.hypot(targetX - mag.x, targetY - mag.y) < 200) {
                        const angle = Math.atan2(mag.y - targetY, mag.x - targetX);
                        targetX += Math.cos(angle) * mag.magneticForce;
                        targetY += Math.sin(angle) * mag.magneticForce;
                    }
                });
            }
            if (currentLevel >= 5) {
                const singularity = activeGameObjects.find(o => o.constructor.name === 'Singularity');
                if(singularity) {
                    activeGameObjects.forEach(obj => {
                         if(obj !== singularity && obj.x) {
                            const angle = Math.atan2(singularity.y - obj.y, singularity.x - obj.x);
                            obj.x += Math.cos(angle) * 0.5;
                            obj.y += Math.sin(angle) * 0.5;
                         }
                    });
                }
            }
        }
        
        // --- FUNCIONES DE CONTROL DEL JUEGO (start, end, level up) ---
        function clearAllIntervals() {
            gameIntervals.forEach(intervalId => clearInterval(intervalId));
            gameIntervals = [];
        }

        function startGame() {
            playerName = playerNameInput.value.trim() || "Piloto Anónimo";
            startMenu.classList.remove('show');
            body.classList.remove('menu-active');

            uiPanels.forEach(p => { p.style.opacity = '1' });
            shipElement.style.opacity = '1';
            
            collisions = 0; currentLevel = 1; startTime = Date.now();
            ammo = 5; empParts = 0; isShieldActive = false;
            activeGameObjects.length = 0;
            
            targetX = window.innerWidth / 2;
            targetY = window.innerHeight / 2;

            updateUI();
            
            gameRunning = true;
            clearAllIntervals();
            spawnInitialObjects();
            gameIntervals.push(setInterval(spawnObjects, 1200));
            gameIntervals.push(setInterval(() => activeGameObjects.push(new AmmoSphere()), 10000));
            gameIntervals.push(setInterval(() => activeGameObjects.push(new CollisionReducerSphere()), 20000));
            
            animationFrameId = requestAnimationFrame(gameLoop);
        }
        
        function triggerNextLevel() {
            gameRunning = false;
            cancelAnimationFrame(animationFrameId);
            clearAllIntervals();
            
            activeGameObjects.forEach(o => o.element.remove());
            activeGameObjects.length = 0;

            levelUpScreen.classList.add('show');
            const nextLevelNameEl = document.getElementById('next-level-name');
            nextLevelNameEl.textContent = `Sector ${currentLevel + 1}: ${generateSectorName(currentLevel + 1)}`;

            let countdown = 3;
            levelUpCountdownValue.textContent = countdown;
            const levelUpCountdownInterval = setInterval(() => {
                countdown--;
                levelUpCountdownValue.textContent = countdown;
                if (countdown <= 0) {
                    clearInterval(levelUpCountdownInterval);
                    levelUpScreen.classList.remove('show');
                    currentLevel++;
                    resetForNextLevel();
                }
            }, 1000);
        }

        function resetForNextLevel() {
            collisions = 0;
            updateUI();
            
            gameRunning = true;
            spawnInitialObjects();
            const spawnRate = Math.max(400, 1200 - (currentLevel * 100));
            gameIntervals.push(setInterval(spawnObjects, spawnRate));
            gameIntervals.push(setInterval(() => activeGameObjects.push(new AmmoSphere()), 10000));
            gameIntervals.push(setInterval(() => activeGameObjects.push(new CollisionReducerSphere()), 20000));

            animationFrameId = requestAnimationFrame(gameLoop);
        }
        
        function endGame() {
            gameRunning = false;
            cancelAnimationFrame(animationFrameId);
            clearAllIntervals();
            
            shipElement.style.opacity = '0';
            gameOverScreen.classList.add('show');
            body.classList.add('menu-active');
            
            const finalSeconds = Math.floor((Date.now() - startTime) / 1000);
            const formattedTime = `${String(Math.floor(finalSeconds / 60)).padStart(2, '0')}:${String(finalSeconds % 60).padStart(2, '0')}`;

            gameOverScreen.innerHTML = `
                <p class="text-4xl">FIN DE LA TRANSMISIÓN</p>
                <p class="text-xl mt-4">Piloto: ${playerName}</p>
                <p class="text-2xl mt-2">Supervivencia: ${formattedTime}</p>
                <p class="text-2xl">Colisiones: ${collisions}</p>
                <p class="text-2xl mb-4">Sector Alcanzado: ${currentLevel}</p>
                <button id="mission-report-button" class="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 text-xl">✨ Generar Informe de Misión</button>
                <div id="mission-report-container" class="mt-4 text-lg text-gray-300 p-4 bg-black/20 rounded-lg max-w-xl hidden" style="max-height: 25vh; overflow-y: auto;"></div>
                <button id="restart-button" class="mt-4 px-8 py-4 bg-purple-600 rounded-lg">Volver a Empezar</button>
            `;
            
            document.getElementById('restart-button').addEventListener('click', () => { gameOverScreen.classList.remove('show'); startGame(); });
            const missionReportButton = document.getElementById('mission-report-button');
            const missionReportContainer = document.getElementById('mission-report-container');
            const renderMissionReport = () => {
                missionReportContainer.classList.remove('hidden');
                missionReportContainer.innerHTML = `<h3 class="text-xl font-bold mb-2 text-cyan-300">Bitácora del Capitán</h3><p class="text-left whitespace-pre-wrap">${generateMissionReport(playerName, formattedTime, currentLevel, collisions)}</p>`;
            };
            missionReportButton.addEventListener('click', renderMissionReport);
            renderMissionReport();

            activeGameObjects.forEach(o => o.element.remove());
            activeGameObjects.length = 0;
        }

        // --- FUNCIONES DE SPAWN Y UI ---

        function spawnObjects() {
            if (!gameRunning) return;
            if (Math.random() < 0.8) activeGameObjects.push(new Asteroid());
            if (Math.random() < 0.1) activeGameObjects.push(new NestAsteroid());
            if (currentLevel >= 2 && Math.random() < 0.2) activeGameObjects.push(new MagneticAsteroid());
            if (currentLevel >= 3 && Math.random() < 0.05) activeGameObjects.push(new PirateShip());
            if (currentLevel >= 4 && Math.random() < 0.1) activeGameObjects.push(new Comet());
        }
        
        function spawnInitialObjects() {
             for(let i=0; i < 5; i++) activeGameObjects.push(new Asteroid());
             if (currentLevel === 3) {
                const nebula = new GameObject('nebula', Math.min(window.innerWidth, window.innerHeight) * 0.8);
                nebula.x = window.innerWidth / 2;
                nebula.y = window.innerHeight / 2;
                activeGameObjects.push(nebula);
             }
             if (currentLevel === 5) {
                const sing = new GameObject('singularity', 50);
                sing.x = window.innerWidth/2;
                sing.y = window.innerHeight/2;
                activeGameObjects.push(sing);
             }
        }
        
        function spawnRandomPowerUp(x, y) {
            const rand = Math.random();
            let p;
            if (rand < 0.4) {
                p = new ShieldKit();
            } else if (rand < 0.7) {
                p = new AmmoSphere();
            } else {
                p = new EmpPart();
            }
            p.x = x;
            p.y = y;
            activeGameObjects.push(p);
        }
        
        function updateUI() {
            updateUIAmmo();
            updateUIShield();
            updateUIEmp();
            collisionsValueSpan.textContent = collisions;
            levelDisplay.textContent = currentLevel;
        }
        function updateUIAmmo() { ammoValueSpan.textContent = ammo; }
        function updateUIEmp() {
            empPartsValueSpan.textContent = `${empParts}/3`;
            if (empParts >= 3) empButton.classList.add('ready');
            else empButton.classList.remove('ready');
        }
        function updateUIShield() {
            if (isShieldActive) {
                const timeLeft = Math.ceil((shieldEndTime - Date.now())/1000);
                shieldValueSpan.textContent = `ACTIVO (${timeLeft}s)`;
                shipElement.classList.add('shielded');
            } else {
                shieldValueSpan.textContent = 'INACTIVO';
                shipElement.classList.remove('shielded');
            }
        }
        
        function activateShield() {
            if(isShieldActive) {
                shieldEndTime += 5000;
            } else {
                isShieldActive = true;
                shieldEndTime = Date.now() + 5000;
                const shieldInterval = setInterval(() => {
                    if (Date.now() > shieldEndTime) {
                        isShieldActive = false;
                        clearInterval(shieldInterval);
                    }
                    updateUIShield();
                }, 1000);
                 gameIntervals.push(shieldInterval);
            }
             updateUIShield();
        }

        function getLevelTheme(level) {
            if (level === 2) return "Campos magnéticos";
            if (level === 3) return "Nebulosa espectral";
            if (level === 4) return "Lluvia de cometas";
            if (level === 5) return "Singularidad inestable";
            return "Estándar";
        }
        
        function updateTimer() {
             if (!startTime) return;
             const elapsed = Date.now() - startTime;
             const seconds = Math.floor(elapsed / 1000);
             timerDisplay.textContent = `${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`;
             if(gameRunning && seconds > currentLevel * (levelUpTimeThreshold/1000)) {
                gameRunning = false; // Prevent multiple triggers
                triggerNextLevel();
             }
        }
        
        // --- INICIO ---
        startGameButton.addEventListener('click', startGame);

    