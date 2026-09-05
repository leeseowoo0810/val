/**
 * Valorant Aim Trainer - Main Game Engine
 * Features: Realistic Mag Reload Animation, Weapon Skins (Prime, Reaver, Tactical),
 * In-Game Spray Control, and Low-End PC Optimization.
 */
class AimGame {
    constructor() {
        this.container = document.getElementById('gameContainer');
        this.clock = new THREE.Clock();

        // Persistent Settings
        this.sens = parseFloat(localStorage.getItem('valorant_sens')) || 0.35;
        this.fov = parseInt(localStorage.getItem('valorant_fov')) || 103;
        this.currentMode = 'speed';
        this.speedDifficulty = 'medium';
        this.perfMode = localStorage.getItem('valorant_perf_mode') === 'true';
        this.currentSkin = localStorage.getItem('valorant_weapon_skin') || 'prime';

        // Skin Definitions
        this.skins = {
            prime: {
                id: 'prime',
                name: 'PRIME (프라임 골드)',
                bodyColor: 0xf5f6fa,   // Pearl White
                metalColor: 0xd4af37,  // 24K Gold
                accentColor: 0x00f5d4, // Cyan energy core
                magColor: 0x1f242c,
                roughness: 0.2,
                metalness: 0.85
            },
            reaver: {
                id: 'reaver',
                name: 'REAVER (리버 다크)',
                bodyColor: 0x17121e,   // Obsidian Violet
                metalColor: 0x8a9ba8,  // Gothic Silver
                accentColor: 0x9b51e0, // Void Magenta
                magColor: 0x0d0914,
                roughness: 0.35,
                metalness: 0.75
            },
            tactical: {
                id: 'tactical',
                name: 'TACTICAL (카본 블랙)',
                bodyColor: 0x161a1f,   // Carbon Black
                metalColor: 0x2e3842,  // Gunmetal Steel
                accentColor: 0xff4655, // Valorant Red
                magColor: 0x1a222a,
                roughness: 0.45,
                metalness: 0.6
            }
        };

        // Weapon Arsenal with Valorant Spray Specs
        this.weapons = {
            vandal: {
                id: 'vandal',
                name: 'VANDAL',
                caliber: '7.62MM // FULL-AUTO',
                fireRate: 0.1025,
                magSize: 25,
                ammo: 25,
                reserve: 75,
                recoilRise: 0.0065,
                maxRecoil: 0.065,
                recoilRecovery: 12.0,
                headDamage: (dist) => 160,
                bodyDamage: (dist) => 40,
                legDamage: (dist) => 34,
                sound: 'playVandalShot'
            },
            phantom: {
                id: 'phantom',
                name: 'PHANTOM',
                caliber: '5.56MM // SILENCED AUTO',
                fireRate: 0.0909,
                magSize: 30,
                ammo: 30,
                reserve: 90,
                recoilRise: 0.0048,
                maxRecoil: 0.048,
                recoilRecovery: 16.0,
                headDamage: (dist) => dist < 15 ? 156 : (dist < 30 ? 140 : 124),
                bodyDamage: (dist) => dist < 15 ? 39 : (dist < 30 ? 35 : 31),
                legDamage: (dist) => dist < 15 ? 33 : (dist < 30 ? 29 : 26),
                sound: 'playPhantomShot'
            }
        };
        this.activeWeaponKey = 'vandal';

        // Recoil & Spray State
        this.continuousShots = 0;
        this.currentRecoilPitch = 0;
        this.currentRecoilYaw = 0;
        this.lastShotTime = 0;
        this.isMouseDown = false;
        this.canShoot = true;
        this.recoilAnim = 0;
        this.drawAnim = 0;
        this.sway = { x: 0, y: 0 };

        // Realistic Reload Animation State
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 1.45; // Realistic 1.45s reload
        this.reloadAudioPlayed = { magOut: false, magIn: false, bolt: false };

        // Game State
        this.isPlaying = false;
        this.isPaused = false;
        this.gameStartTime = 0;
        this.gameTimer = 0;
        this.sessionKills = 0;
        this.sessionHeadshots = 0;
        this.sessionBodyshots = 0;
        this.sessionShots = 0;
        this.sessionHits = 0;
        this.currentStreak = 0;
        this.killTimes = [];

        // Speed Challenge State
        this.speedTotalBots = 30;
        this.speedSpawnedCount = 0;
        this.speedHitCount = 0;
        this.speedBotTimeoutId = null;

        // Player Controls
        this.keys = { forward: false, backward: false, left: false, right: false, shift: false, ctrl: false };
        this.pitch = 0;
        this.yaw = 0;
        this.playerHeight = 1.68;

        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouseVector = new THREE.Vector2(0, 0);

        this.initThree();
        this.initEnvironment();
        this.initWeapons();
        this.applySkin(this.currentSkin);
        this.initControls();
        this.initUI();

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    get currentWeapon() {
        return this.weapons[this.activeWeaponKey];
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f14);
        this.scene.fog = new THREE.FogExp2(0x0a0f14, 0.012);

        const aspect = window.innerWidth / window.innerHeight;
        const vFov = 2 * Math.atan(Math.tan((this.fov * Math.PI / 180) / 2) / aspect) * (180 / Math.PI);

        this.camera = new THREE.PerspectiveCamera(vFov, aspect, 0.1, 200);
        this.camera.position.set(0, this.playerHeight, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: !this.perfMode,
            powerPreference: 'high-performance',
            precision: 'mediump'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1.0);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.container.appendChild(this.renderer.domElement);

        this.targetManager = new window.TargetManager(this.scene);
    }

    initEnvironment() {
        const ambient = new THREE.AmbientLight(0xf0f5ff, 0.95);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xfffdfa, 1.4);
        dirLight.position.set(15, 35, 10);
        this.scene.add(dirLight);

        const cyanSpot = new THREE.PointLight(0x00f5d4, 1.5, 35);
        cyanSpot.position.set(-12, 5, -15);
        this.scene.add(cyanSpot);

        const redSpot = new THREE.PointLight(0xff4655, 1.5, 35);
        redSpot.position.set(12, 5, -15);
        this.scene.add(redSpot);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(60, 90);
        floorGeo.rotateX(-Math.PI / 2);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#161f28';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#2b3a4a';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 256, 256);

        const floorTex = new THREE.CanvasTexture(canvas);
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(15, 22);

        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.2 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(0, 0, -25);
        this.scene.add(floorMesh);

        // Booth Counter
        const counterMat = new THREE.MeshStandardMaterial({ color: 0x1f2933, roughness: 0.4, metalness: 0.7 });
        const desk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.8), counterMat);
        desk.position.set(0, 0.45, -1.1);
        this.scene.add(desk);

        const deskTrim = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.05, 0.85), new THREE.MeshBasicMaterial({ color: 0xff4655 }));
        deskTrim.position.set(0, 0.9, -1.1);
        this.scene.add(deskTrim);

        // Guard Rails
        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 4), counterMat);
        railL.position.set(-2.1, 0.55, 0);
        this.scene.add(railL);
        const railR = railL.clone();
        railR.position.x = 2.1;
        this.scene.add(railR);

        // Back Wall
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x141c24, roughness: 0.6, metalness: 0.3 });
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 26, 2), wallMat);
        backWall.position.set(0, 13, -46);
        this.scene.add(backWall);

        const strip1 = new THREE.Mesh(new THREE.BoxGeometry(52, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: 0x00f5d4 }));
        strip1.position.set(0, 10, -44.9);
        this.scene.add(strip1);

        const strip2 = new THREE.Mesh(new THREE.BoxGeometry(52, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: 0xff4655 }));
        strip2.position.set(0, 4, -44.9);
        this.scene.add(strip2);

        // Distance Lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x364859 });
        [10, 20, 30, 40].forEach(d => {
            const marker = new THREE.Mesh(new THREE.BoxGeometry(36, 0.02, 0.2), lineMat);
            marker.position.set(0, 0.02, -d);
            this.scene.add(marker);
        });

        // Side Walls
        const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 90), wallMat);
        sideWallL.position.set(-25, 13, -25);
        this.scene.add(sideWallL);
        const sideWallR = sideWallL.clone();
        sideWallR.position.x = 25;
        this.scene.add(sideWallR);
    }

    initWeapons() {
        this.weaponContainer = new THREE.Group();

        // Shared Dynamic Materials for Skinning
        this.matSkinBody = new THREE.MeshStandardMaterial();
        this.matSkinMetal = new THREE.MeshStandardMaterial();
        this.matSkinAccent = new THREE.MeshStandardMaterial();
        this.matSkinMag = new THREE.MeshStandardMaterial();

        // 1. Build Vandal
        this.vandalGroup = new THREE.Group();
        this.buildVandalParts();
        this.weaponContainer.add(this.vandalGroup);

        // 2. Build Phantom
        this.phantomGroup = new THREE.Group();
        this.phantomGroup.visible = false;
        this.buildPhantomParts();
        this.weaponContainer.add(this.phantomGroup);

        // Muzzle Flash
        this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 8);
        this.muzzleLight.position.set(0, 0.03, -0.85);
        this.weaponContainer.add(this.muzzleLight);

        const flashGeo = new THREE.ConeGeometry(0.08, 0.3, 5);
        flashGeo.rotateX(-Math.PI / 2);
        this.muzzleFlash = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: 0xffea77, transparent: true, opacity: 0 }));
        this.muzzleFlash.position.set(0, 0.03, -0.9);
        this.weaponContainer.add(this.muzzleFlash);

        this.weaponDefaultPos = new THREE.Vector3(0.24, -0.22, -0.48);
        this.weaponContainer.position.copy(this.weaponDefaultPos);
        this.camera.add(this.weaponContainer);
        this.scene.add(this.camera);
    }

    buildVandalParts() {
        const g = this.vandalGroup;

        // Receiver Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.65), this.matSkinBody);
        g.add(body);

        // Top Rail / Spine
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.6), this.matSkinMetal);
        rail.position.set(0, 0.08, -0.02);
        g.add(rail);

        // Glowing Core Line
        const coreLine = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.015, 0.5), this.matSkinAccent);
        coreLine.position.set(0, 0.02, -0.02);
        g.add(coreLine);

        // Long Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.matSkinMetal);
        barrel.position.set(0, 0.03, -0.5);
        g.add(barrel);

        // Muzzle Brake
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), this.matSkinMetal);
        muzzle.position.set(0, 0.03, -0.74);
        g.add(muzzle);

        // Grip & Stock
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.09), this.matSkinBody);
        grip.position.set(0, -0.14, 0.18);
        grip.rotation.x = 0.35;
        g.add(grip);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.35), this.matSkinBody);
        stock.position.set(0, -0.02, 0.45);
        g.add(stock);

        // Vandal Detachable Magazine (Key for Realistic Reload)
        this.vandalMag = new THREE.Group();
        const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.12), this.matSkinMag);
        this.vandalMag.add(magMesh);

        // Default local placement
        const defaultMagPos = new THREE.Vector3(0, -0.16, -0.1);
        this.vandalMag.position.copy(defaultMagPos);
        this.vandalMag.rotation.x = -0.3;
        this.vandalMag.userData = {
            defaultPos: defaultMagPos.clone(),
            defaultY: defaultMagPos.y,
            defaultZ: defaultMagPos.z,
            defaultRotX: -0.3
        };
        g.add(this.vandalMag);
    }

    buildPhantomParts() {
        const g = this.phantomGroup;

        // Sleek Receiver
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.6), this.matSkinBody);
        g.add(body);

        // Glowing LED line
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.015, 0.45), this.matSkinAccent);
        led.position.set(0, 0.04, -0.05);
        g.add(led);

        // Optical Housing
        const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.35), this.matSkinMetal);
        optic.position.set(0, 0.08, -0.05);
        g.add(optic);

        // Iconic Suppressor (Silencer)
        const silencerGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.52, 10);
        silencerGeo.rotateX(Math.PI / 2);
        const silencer = new THREE.Mesh(silencerGeo, this.matSkinMetal);
        silencer.position.set(0, 0.02, -0.55);
        g.add(silencer);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10), this.matSkinMetal);
        tip.geometry.rotateX(Math.PI / 2);
        tip.position.set(0, 0.02, -0.82);
        g.add(tip);

        // Grip & Stock
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.19, 0.08), this.matSkinBody);
        grip.position.set(0, -0.13, 0.16);
        grip.rotation.x = 0.3;
        g.add(grip);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.32), this.matSkinBody);
        stock.position.set(0, -0.01, 0.42);
        g.add(stock);

        // Phantom Detachable Magazine
        this.phantomMag = new THREE.Group();
        const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.22, 0.09), this.matSkinMag);
        this.phantomMag.add(magMesh);

        const defaultMagPos = new THREE.Vector3(0, -0.14, -0.06);
        this.phantomMag.position.copy(defaultMagPos);
        this.phantomMag.rotation.x = -0.15;
        this.phantomMag.userData = {
            defaultPos: defaultMagPos.clone(),
            defaultY: defaultMagPos.y,
            defaultZ: defaultMagPos.z,
            defaultRotX: -0.15
        };
        g.add(this.phantomMag);
    }

    applySkin(skinKey) {
        if (!this.skins[skinKey]) skinKey = 'prime';
        this.currentSkin = skinKey;
        localStorage.setItem('valorant_weapon_skin', skinKey);

        const s = this.skins[skinKey];

        // Update Materials dynamically
        this.matSkinBody.color.setHex(s.bodyColor);
        this.matSkinBody.roughness = s.roughness;
        this.matSkinBody.metalness = s.metalness;

        this.matSkinMetal.color.setHex(s.metalColor);
        this.matSkinMetal.roughness = 0.2;
        this.matSkinMetal.metalness = 0.9;

        this.matSkinAccent.color.setHex(s.accentColor);
        this.matSkinAccent.emissive.setHex(s.accentColor);
        this.matSkinAccent.emissiveIntensity = 1.2;

        this.matSkinMag.color.setHex(s.magColor);
        this.matSkinMag.roughness = 0.4;
        this.matSkinMag.metalness = 0.5;

        // Sync Lobby Skin UI
        document.querySelectorAll('.skin-choice-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.skin === skinKey);
        });
    }

    switchWeapon(weaponKey) {
        if (!this.weapons[weaponKey] || this.activeWeaponKey === weaponKey) return;
        if (this.isReloading) this.cancelReload();

        this.activeWeaponKey = weaponKey;
        this.vandalGroup.visible = (weaponKey === 'vandal');
        this.phantomGroup.visible = (weaponKey === 'phantom');
        this.drawAnim = 1.0;

        if (window.soundEngine) window.soundEngine.playWeaponEquip();
        this.updateWeaponHUD();

        document.querySelectorAll('.weapon-choice-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.weapon === weaponKey);
        });

        document.querySelectorAll('.weapon-slot-card').forEach(slot => {
            slot.classList.toggle('active', slot.dataset.weapon === weaponKey);
        });
    }

    initControls() {
        this.container.addEventListener('click', () => {
            if (!this.isPointerLocked() && !this.isMenuOpen()) {
                this.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            if (!this.isPointerLocked() && this.isPlaying && !this.isPaused) {
                this.isMouseDown = false;
                this.pauseGame();
            }
        });

        // Mouse Aiming
        document.addEventListener('mousemove', (e) => {
            if (!this.isPointerLocked()) return;

            const valorantDegrees = this.sens * 0.07;
            const valorantRadians = valorantDegrees * (Math.PI / 180);

            this.yaw -= e.movementX * valorantRadians;
            this.pitch -= e.movementY * valorantRadians;

            const maxPitch = 89 * (Math.PI / 180);
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

            this.sway.x += e.movementX * 0.0004;
            this.sway.y += e.movementY * 0.0004;
            this.sway.x = Math.max(-0.06, Math.min(0.06, this.sway.x));
            this.sway.y = Math.max(-0.06, Math.min(0.06, this.sway.y));
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.isPointerLocked()) {
                this.isMouseDown = true;
                this.tryShoot();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isMouseDown = false;
        });

        window.addEventListener('blur', () => {
            this.isMouseDown = false;
        });

        window.addEventListener('wheel', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            const nextKey = this.activeWeaponKey === 'vandal' ? 'phantom' : 'vandal';
            this.switchWeapon(nextKey);
        }, { passive: true });

        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'ShiftLeft': this.keys.shift = true; break;
                case 'ControlLeft': this.keys.ctrl = true; break;
                case 'KeyR': this.reload(); break;
                case 'Digit1': this.switchWeapon('vandal'); break;
                case 'Digit2': this.switchWeapon('phantom'); break;
                case 'KeyP':
                case 'Escape':
                    if (this.isPlaying) this.togglePause();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'ShiftLeft': this.keys.shift = false; break;
                case 'ControlLeft': this.keys.ctrl = false; break;
            }
        });
    }

    initUI() {
        // Mode Selector Tiles
        document.querySelectorAll('.mode-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                document.querySelectorAll('.mode-tile').forEach(t => t.classList.remove('active'));
                tile.classList.add('active');
                this.currentMode = tile.dataset.mode;
                
                const diffBox = document.getElementById('speedDifficultyRow');
                if (diffBox) {
                    diffBox.style.display = this.currentMode === 'speed' ? 'flex' : 'none';
                }
                if (window.soundEngine) window.soundEngine.playUIClick();
            });
        });

        // Speed Difficulty Buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.speedDifficulty = btn.dataset.diff;
                if (window.soundEngine) window.soundEngine.playUIClick();
            });
        });

        // Lobby Weapon Choice Buttons
        document.querySelectorAll('.weapon-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchWeapon(btn.dataset.weapon);
            });
        });

        // Lobby Skin Choice Buttons
        document.querySelectorAll('.skin-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applySkin(btn.dataset.skin);
                if (window.soundEngine) window.soundEngine.playUIClick();
            });
        });

        // HUD Weapon Slot Cards
        document.querySelectorAll('.weapon-slot-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchWeapon(card.dataset.weapon);
            });
        });

        // Start Button
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.soundEngine) window.soundEngine.playUIClick();
                this.startGame();
            });
        }

        // Resume / Restart / Lobby Buttons
        const resumeBtn = document.getElementById('resumeGameBtn');
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resumeGame());

        const restartBtn = document.getElementById('restartGameBtn');
        if (restartBtn) restartBtn.addEventListener('click', () => this.startGame());

        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.startGame());

        document.querySelectorAll('.return-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => this.returnToMenu());
        });

        // Sensitivity Sync
        const sensInput = document.getElementById('sensInput');
        const sensSlider = document.getElementById('sensSlider');
        if (sensInput && sensSlider) {
            sensInput.value = this.sens.toFixed(3);
            sensSlider.value = this.sens;

            const updateSens = (val) => {
                this.sens = Math.max(0.01, Math.min(2.0, parseFloat(val) || 0.35));
                sensInput.value = this.sens.toFixed(3);
                sensSlider.value = this.sens;
                localStorage.setItem('valorant_sens', this.sens);
                this.updateDpi();
            };

            sensInput.addEventListener('input', (e) => updateSens(e.target.value));
            sensSlider.addEventListener('input', (e) => updateSens(e.target.value));
        }

        // DPI & eDPI
        const dpiInput = document.getElementById('dpiInput');
        if (dpiInput) {
            dpiInput.addEventListener('input', () => this.updateDpi());
            this.updateDpi();
        }

        // FOV Slider
        const fovSlider = document.getElementById('fovSlider');
        const fovVal = document.getElementById('fovValue');
        if (fovSlider && fovVal) {
            fovSlider.value = this.fov;
            fovVal.textContent = this.fov;
            fovSlider.addEventListener('input', (e) => {
                this.fov = parseInt(e.target.value);
                fovVal.textContent = this.fov;
                localStorage.setItem('valorant_fov', this.fov);
                this.updateCameraFov();
            });
        }

        // Low-End Performance Mode Toggle
        const perfCheck = document.getElementById('perfModeCheck');
        if (perfCheck) {
            perfCheck.checked = this.perfMode;
            perfCheck.addEventListener('change', (e) => {
                this.perfMode = e.target.checked;
                localStorage.setItem('valorant_perf_mode', this.perfMode);
            });
        }

        // Volume Slider
        const volSlider = document.getElementById('volumeSlider');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value) / 100;
                if (window.soundEngine) window.soundEngine.setVolume(vol);
            });
        }

        // Crosshair Init & Code Handling
        if (window.crosshairManager) {
            window.crosshairManager.init('crosshairCanvas', 'previewCrosshairCanvas');
            this.initCrosshairUI();
        }
    }

    initCrosshairUI() {
        const cm = window.crosshairManager;
        if (!cm) return;

        document.querySelectorAll('.color-dot').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.color-dot').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                cm.updateSetting('color', el.dataset.color);
            });
        });

        // Crosshair Code Import
        const codeInput = document.getElementById('chCodeInput');
        const importBtn = document.getElementById('chImportBtn');
        const exportBtn = document.getElementById('chExportBtn');

        if (importBtn && codeInput) {
            importBtn.addEventListener('click', () => {
                const code = codeInput.value.trim();
                const success = cm.importValorantCode(code);
                if (success) {
                    alert('발로란트 조준선 코드가 성공적으로 적용되었습니다!');
                } else {
                    alert('유효하지 않은 발로란트 조준선 코드입니다. (예: 0;P;c;5;o;1;...)');
                }
            });
        }

        if (exportBtn && codeInput) {
            exportBtn.addEventListener('click', () => {
                const code = cm.exportValorantCode();
                codeInput.value = code;
                navigator.clipboard.writeText(code).then(() => {
                    alert(`조준선 코드가 클립보드에 복사되었습니다!\n\n${code}`);
                }).catch(() => {
                    alert(`생성된 조준선 코드:\n${code}`);
                });
            });
        }

        // Pro Preset Buttons
        document.querySelectorAll('.pro-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                cm.applyProPreset(preset);
                if (codeInput) codeInput.value = cm.exportValorantCode();
                if (window.soundEngine) window.soundEngine.playUIClick();
            });
        });

        const bindToggle = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
                el.checked = !!cm.config[key];
                el.addEventListener('change', (e) => cm.updateSetting(key, e.target.checked));
            }
        };

        const bindSlider = (id, valId, key) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(valId);
            if (el) {
                el.value = cm.config[key];
                if (valEl) valEl.textContent = cm.config[key];
                el.addEventListener('input', (e) => {
                    const num = parseFloat(e.target.value);
                    if (valEl) valEl.textContent = num;
                    cm.updateSetting(key, num);
                });
            }
        };

        bindToggle('chCenterDot', 'centerDot');
        bindToggle('chOutline', 'outline');
        bindToggle('chFiringError', 'firingError');
        bindSlider('chInnerLength', 'chInnerLengthVal', 'innerLength');
        bindSlider('chInnerThick', 'chInnerThickVal', 'innerThickness');
        bindSlider('chInnerOffset', 'chInnerOffsetVal', 'innerOffset');
    }

    updateDpi() {
        const dpiInput = document.getElementById('dpiInput');
        const edpiVal = document.getElementById('edpiValue');
        if (dpiInput && edpiVal) {
            const dpi = parseInt(dpiInput.value) || 800;
            edpiVal.textContent = Math.round(dpi * this.sens);
        }
    }

    updateCameraFov() {
        const aspect = window.innerWidth / window.innerHeight;
        const vFov = 2 * Math.atan(Math.tan((this.fov * Math.PI / 180) / 2) / aspect) * (180 / Math.PI);
        this.camera.fov = vFov;
        this.camera.updateProjectionMatrix();
    }

    isPointerLocked() {
        return document.pointerLockElement === this.container || document.pointerLockElement === document.body;
    }

    requestPointerLock() {
        try {
            this.container.requestPointerLock();
        } catch (e) {
            console.warn('Pointer lock request error', e);
        }
    }

    isMenuOpen() {
        const menu = document.getElementById('mainMenu');
        const pause = document.getElementById('pauseMenu');
        const result = document.getElementById('resultModal');
        return (menu && menu.style.display !== 'none') ||
               (pause && pause.style.display !== 'none') ||
               (result && result.style.display !== 'none');
    }

    startGame() {
        this.isPlaying = true;
        this.isPaused = false;
        this.isMouseDown = false;
        this.continuousShots = 0;
        this.currentRecoilPitch = 0;
        this.currentRecoilYaw = 0;
        this.gameStartTime = performance.now();
        this.sessionKills = 0;
        this.sessionHeadshots = 0;
        this.sessionBodyshots = 0;
        this.sessionShots = 0;
        this.sessionHits = 0;
        this.currentStreak = 0;
        this.killTimes = [];

        this.weapons.vandal.ammo = this.weapons.vandal.magSize;
        this.weapons.phantom.ammo = this.weapons.phantom.magSize;

        this.speedSpawnedCount = 0;
        this.speedHitCount = 0;

        if (this.speedBotTimeoutId) {
            clearTimeout(this.speedBotTimeoutId);
            this.speedBotTimeoutId = null;
        }

        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('resultModal').style.display = 'none';
        document.getElementById('hudOverlay').style.display = 'block';

        this.targetManager.clearAllBots();

        const titleEl = document.getElementById('modeTitleDisplay');
        if (this.currentMode === 'speed') {
            titleEl.textContent = `RANGE SPEED // ${this.speedDifficulty.toUpperCase()}`;
            this.startSpeedMode();
        } else if (this.currentMode === 'eliminate50') {
            titleEl.textContent = 'ELIMINATE 50 BOTS';
            this.startEliminateMode();
        } else if (this.currentMode === 'strafe') {
            titleEl.textContent = 'STRAFE BOTS';
            this.startStrafeMode();
        } else {
            titleEl.textContent = 'FREE PRACTICE';
            this.startFreeMode();
        }

        this.updateHUD();
        this.updateWeaponHUD();
        this.requestPointerLock();
        if (window.soundEngine) window.soundEngine.playCountdown(true);
    }

    startSpeedMode() {
        let lifetime = 0.5;
        if (this.speedDifficulty === 'easy') lifetime = 1.0;
        if (this.speedDifficulty === 'hard') lifetime = 0.2;

        const spawnNextSpeedBot = () => {
            if (!this.isPlaying || this.currentMode !== 'speed') return;

            if (this.speedSpawnedCount >= this.speedTotalBots) {
                this.endGame();
                return;
            }

            this.speedSpawnedCount++;
            this.updateHUD();

            const x = (Math.random() - 0.5) * 20;
            const z = -(14 + Math.random() * 14);

            this.targetManager.spawnBot({
                x: x,
                y: 0,
                z: z,
                lifetime: lifetime
            });
        };

        this.onSpeedBotEnded = () => {
            if (!this.isPlaying) return;
            this.speedBotTimeoutId = setTimeout(() => {
                spawnNextSpeedBot();
            }, 300);
        };

        setTimeout(() => spawnNextSpeedBot(), 600);
    }

    startEliminateMode() {
        const spawnBatch = () => {
            while (this.targetManager.targets.length < 2 && (this.sessionKills + this.targetManager.targets.length) < 50) {
                const x = (Math.random() - 0.5) * 18;
                const z = -(12 + Math.random() * 16);
                this.targetManager.spawnBot({ x, y: 0, z });
            }
        };
        spawnBatch();
        this.onBotKilledCheck = () => {
            if (this.sessionKills >= 50) {
                this.endGame();
            } else {
                spawnBatch();
            }
        };
    }

    startStrafeMode() {
        for (let i = 0; i < 3; i++) {
            const x = (i - 1) * 6;
            const z = -(15 + i * 4);
            this.targetManager.spawnBot({
                x, y: 0, z,
                isMoving: true,
                moveSpeed: 3.5 + Math.random() * 2,
                moveBounds: { minX: x - 5, maxX: x + 5 }
            });
        }

        this.onBotKilledCheck = () => {
            const x = (Math.random() - 0.5) * 16;
            const z = -(14 + Math.random() * 14);
            this.targetManager.spawnBot({
                x, y: 0, z,
                isMoving: true,
                moveSpeed: 3.5 + Math.random() * 2,
                moveBounds: { minX: x - 5, maxX: x + 5 }
            });
        };
    }

    startFreeMode() {
        for (let i = 0; i < 4; i++) {
            const x = (Math.random() - 0.5) * 20;
            const z = -(12 + Math.random() * 16);
            this.targetManager.spawnBot({ x, y: 0, z });
        }

        this.onBotKilledCheck = () => {
            const x = (Math.random() - 0.5) * 20;
            const z = -(12 + Math.random() * 16);
            this.targetManager.spawnBot({ x, y: 0, z });
        };
    }

    pauseGame() {
        this.isPaused = true;
        this.isMouseDown = false;
        document.getElementById('pauseMenu').style.display = 'flex';
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pauseMenu').style.display = 'none';
        this.requestPointerLock();
    }

    togglePause() {
        if (this.isPaused) this.resumeGame();
        else this.pauseGame();
    }

    returnToMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        this.isMouseDown = false;
        if (this.isReloading) this.cancelReload();

        if (this.speedBotTimeoutId) {
            clearTimeout(this.speedBotTimeoutId);
            this.speedBotTimeoutId = null;
        }
        this.targetManager.clearAllBots();

        document.getElementById('hudOverlay').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('resultModal').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';

        if (document.exitPointerLock) document.exitPointerLock();
    }

    // Full-Auto & In-Game Spray Control
    tryShoot() {
        if (!this.isPlaying || this.isPaused || !this.canShoot || this.isReloading) return;
        const now = performance.now();
        const weapon = this.currentWeapon;

        if (now - this.lastShotTime < weapon.fireRate * 1000) return;

        if (weapon.ammo <= 0) {
            this.reload();
            return;
        }

        this.lastShotTime = now;
        weapon.ammo--;
        this.sessionShots++;
        this.continuousShots++;

        // Spray Climb & Bloom
        let sprayClimb = weapon.recoilRise;
        let horizontalWiggle = 0;

        if (this.continuousShots > 2) {
            this.currentRecoilPitch = Math.min(weapon.maxRecoil, this.currentRecoilPitch + sprayClimb);
            this.pitch += sprayClimb * 0.45;
        }

        if (this.continuousShots > 7) {
            horizontalWiggle = (Math.sin(this.continuousShots * 1.5) * 0.008) + (Math.random() - 0.5) * 0.005;
            this.currentRecoilYaw = horizontalWiggle;
            this.yaw += horizontalWiggle * 0.3;
        }

        const crosshairSpread = Math.min(18, 4 + this.continuousShots * 1.3);
        if (window.crosshairManager) window.crosshairManager.triggerFiringError(crosshairSpread);

        if (window.soundEngine && window.soundEngine[weapon.sound]) {
            window.soundEngine[weapon.sound]();
        }

        this.triggerFireAnim();
        this.performRaycastWithRecoil();
        this.updateWeaponHUD();
    }

    performRaycastWithRecoil() {
        const sprayOffsetY = (this.continuousShots > 2) ? (this.currentRecoilPitch * 1.5) : 0;
        const sprayOffsetX = this.currentRecoilYaw * 1.5;

        const rayScreenPos = new THREE.Vector2(
            this.mouseVector.x + sprayOffsetX,
            this.mouseVector.y + sprayOffsetY
        );

        this.raycaster.setFromCamera(rayScreenPos, this.camera);

        const hitboxes = [];
        this.targetManager.targets.forEach(t => {
            hitboxes.push(t.hitboxes.head, t.hitboxes.body, t.hitboxes.leg);
        });

        const hits = this.raycaster.intersectObjects(hitboxes, true);

        if (hits.length > 0) {
            const hit = hits[0];
            const data = hit.object.userData;

            if (data && data.target) {
                this.sessionHits++;
                const distance = this.camera.position.distanceTo(hit.point);
                const weapon = this.currentWeapon;

                let calculatedDamage = 40;
                if (data.type === 'head') calculatedDamage = weapon.headDamage(distance);
                else if (data.type === 'leg') calculatedDamage = weapon.legDamage(distance);
                else calculatedDamage = weapon.bodyDamage(distance);

                const res = this.targetManager.damageBot(data.target, data.type, hit.point, calculatedDamage);

                if (res) {
                    if (res.isHeadshot) this.sessionHeadshots++;
                    else this.sessionBodyshots++;

                    if (res.isKill) {
                        this.handleKill(res.isHeadshot, res.timeToKill);
                    } else if (window.soundEngine) {
                        window.soundEngine.playBodyShotHit();
                    }
                }
            }
        } else {
            const worldMeshes = this.scene.children.filter(obj => obj !== this.camera && !obj.isLight);
            const wallHits = this.raycaster.intersectObjects(worldMeshes, true);
            if (wallHits.length > 0) {
                this.targetManager.emitSparksFromPool(wallHits[0].point, 3, false);
            }
            this.currentStreak = 0;
        }
    }

    handleKill(isHeadshot, ttk) {
        this.sessionKills++;
        this.currentStreak++;
        this.killTimes.push(ttk);

        if (this.currentMode === 'speed') {
            this.speedHitCount++;
        }

        if (window.soundEngine) {
            if (isHeadshot) {
                window.soundEngine.playHeadshotKill(this.currentStreak);
            } else {
                window.soundEngine.playKillThump(window.soundEngine.ctx.currentTime, 1.2);
            }
        }

        this.triggerKillBanner(isHeadshot);

        if (this.currentMode === 'speed') {
            if (this.onSpeedBotEnded) this.onSpeedBotEnded();
        } else if (this.onBotKilledCheck) {
            this.onBotKilledCheck();
        }

        this.updateHUD();
    }

    triggerKillBanner(isHeadshot) {
        const banner = document.getElementById('killBanner');
        const text = document.getElementById('killBannerText');
        const streak = document.getElementById('killStreakBadge');
        if (!banner) return;

        banner.classList.remove('active');
        void banner.offsetWidth;
        banner.classList.add('active');

        if (isHeadshot) {
            text.textContent = 'HEADSHOT';
            text.style.color = '#ffe600';
            streak.textContent = this.currentStreak > 1 ? `${this.currentStreak}x STREAK` : '1-TAP';
        } else {
            text.textContent = `KILL ${this.sessionKills}`;
            text.style.color = '#ff4655';
            streak.textContent = `${this.currentStreak} STREAK`;
        }

        setTimeout(() => banner.classList.remove('active'), 1100);
    }

    triggerFireAnim() {
        this.recoilAnim = 1.0;
        this.muzzleLight.intensity = (this.activeWeaponKey === 'phantom') ? 1.5 : 4.0;
        this.muzzleFlash.material.opacity = (this.activeWeaponKey === 'phantom') ? 0.4 : 1.0;

        setTimeout(() => {
            this.muzzleLight.intensity = 0;
            this.muzzleFlash.material.opacity = 0;
        }, 40);
    }

    // Realistic Mag Reload Trigger
    reload() {
        const weapon = this.currentWeapon;
        if (weapon.ammo === weapon.magSize || this.isReloading) return;

        this.isReloading = true;
        this.canShoot = false;
        this.isMouseDown = false;
        this.reloadTimer = 0;
        this.reloadAudioPlayed = { magOut: false, magIn: false, bolt: false };
    }

    cancelReload() {
        this.isReloading = false;
        this.canShoot = true;
        this.reloadTimer = 0;

        // Reset mag transforms
        if (this.vandalMag) {
            this.vandalMag.position.copy(this.vandalMag.userData.defaultPos);
            this.vandalMag.rotation.x = this.vandalMag.userData.defaultRotX;
        }
        if (this.phantomMag) {
            this.phantomMag.position.copy(this.phantomMag.userData.defaultPos);
            this.phantomMag.rotation.x = this.phantomMag.userData.defaultRotX;
        }
        this.weaponContainer.position.copy(this.weaponDefaultPos);
        this.weaponContainer.rotation.set(0, 0, 0);
    }

    endGame() {
        this.isPlaying = false;
        this.isMouseDown = false;
        if (this.isReloading) this.cancelReload();

        document.getElementById('hudOverlay').style.display = 'none';
        if (document.exitPointerLock) document.exitPointerLock();

        const shots = Math.max(1, this.sessionShots);
        const hits = this.sessionHits;
        const headshots = this.sessionHeadshots;
        const accuracy = Math.round((hits / shots) * 100);
        const headshotPct = hits > 0 ? Math.round((headshots / hits) * 100) : 0;
        const avgTtk = this.killTimes.length > 0 
            ? Math.round(this.killTimes.reduce((a, b) => a + b, 0) / this.killTimes.length)
            : 0;

        let score = '';
        let rankTier = 'IRON';
        let rankColor = '#708090';

        if (this.currentMode === 'speed') {
            score = `${this.speedHitCount} / ${this.speedTotalBots}`;
            let scoreVal = this.speedHitCount;
            if (this.speedDifficulty === 'medium') scoreVal *= 1.4;
            if (this.speedDifficulty === 'hard') scoreVal *= 2.0;

            if (scoreVal >= 42) { rankTier = 'RADIANT'; rankColor = '#ffffaa'; }
            else if (scoreVal >= 33) { rankTier = 'IMMORTAL'; rankColor = '#b32243'; }
            else if (scoreVal >= 26) { rankTier = 'ASCENDANT'; rankColor = '#1fb377'; }
            else if (scoreVal >= 20) { rankTier = 'DIAMOND'; rankColor = '#b588ff'; }
            else if (scoreVal >= 15) { rankTier = 'PLATINUM'; rankColor = '#42cbf5'; }
            else if (scoreVal >= 10) { rankTier = 'GOLD'; rankColor = '#e0a92d'; }
            else if (scoreVal >= 6) { rankTier = 'SILVER'; rankColor = '#a8b5c4'; }
            else { rankTier = 'BRONZE'; rankColor = '#a36c4b'; }
        } else {
            score = `${this.sessionKills} KILLS`;
            if (headshotPct >= 80 && accuracy >= 70) { rankTier = 'RADIANT'; rankColor = '#ffffaa'; }
            else if (headshotPct >= 65) { rankTier = 'IMMORTAL'; rankColor = '#b32243'; }
            else if (headshotPct >= 50) { rankTier = 'DIAMOND'; rankColor = '#b588ff'; }
            else if (headshotPct >= 35) { rankTier = 'PLATINUM'; rankColor = '#42cbf5'; }
            else if (headshotPct >= 20) { rankTier = 'GOLD'; rankColor = '#e0a92d'; }
            else { rankTier = 'SILVER'; rankColor = '#a8b5c4'; }
        }

        document.getElementById('resScore').textContent = score;
        document.getElementById('resAccuracy').textContent = `${accuracy}%`;
        document.getElementById('resHeadshotPct').textContent = `${headshotPct}%`;
        document.getElementById('resAvgTtk').textContent = `${avgTtk} ms`;
        
        const rankEl = document.getElementById('resRankBadge');
        rankEl.textContent = rankTier;
        rankEl.style.color = rankColor;
        rankEl.style.borderColor = rankColor;
        rankEl.style.boxShadow = `0 0 25px ${rankColor}55`;

        document.getElementById('resultModal').style.display = 'flex';
    }

    updateHUD() {
        const scoreVal = this.currentMode === 'speed' 
            ? `${this.speedHitCount} <span class="sub">/ ${this.speedTotalBots}</span>`
            : `${this.sessionKills}`;
        document.getElementById('hudScoreValue').innerHTML = scoreVal;

        if (this.currentMode === 'speed') {
            const pct = Math.round((this.speedSpawnedCount / this.speedTotalBots) * 100);
            document.getElementById('hudProgressBar').style.width = `${pct}%`;
        } else {
            document.getElementById('hudProgressBar').style.width = '100%';
        }

        const shots = Math.max(1, this.sessionShots);
        const accuracy = Math.round((this.sessionHits / shots) * 100);
        const hsPct = this.sessionHits > 0 ? Math.round((this.sessionHeadshots / this.sessionHits) * 100) : 0;

        document.getElementById('hudAccuracy').textContent = `${accuracy}%`;
        document.getElementById('hudHeadshotPct').textContent = `${hsPct}%`;
        document.getElementById('hudKillCount').textContent = this.sessionKills;
    }

    updateWeaponHUD() {
        const weapon = this.currentWeapon;
        const nameEl = document.getElementById('hudWeaponName');
        const calEl = document.getElementById('hudWeaponCaliber');
        const ammoEl = document.getElementById('hudAmmoVal');
        const resEl = document.getElementById('hudReserveAmmoVal');

        if (nameEl) nameEl.textContent = weapon.name;
        if (calEl) calEl.textContent = weapon.caliber;
        if (ammoEl) ammoEl.textContent = weapon.ammo;
        if (resEl) resEl.textContent = weapon.reserve;
    }

    update(deltaTime) {
        if (this.isPlaying && !this.isPaused) {
            this.gameTimer = (performance.now() - this.gameStartTime) / 1000;
            const mins = Math.floor(this.gameTimer / 60).toString().padStart(2, '0');
            const secs = Math.floor(this.gameTimer % 60).toString().padStart(2, '0');
            const tenths = Math.floor((this.gameTimer % 1) * 10);
            document.getElementById('hudTimer').textContent = `${mins}:${secs}.${tenths}`;

            // Full-Auto Firing
            if (this.isMouseDown && !this.isReloading) {
                this.tryShoot();
            } else {
                const recoveryRate = this.currentWeapon.recoilRecovery;
                if (this.continuousShots > 0) {
                    this.continuousShots = Math.max(0, this.continuousShots - deltaTime * recoveryRate);
                }
                if (this.currentRecoilPitch > 0) {
                    this.currentRecoilPitch = Math.max(0, this.currentRecoilPitch - deltaTime * 0.25);
                }
                if (this.currentRecoilYaw !== 0) {
                    this.currentRecoilYaw *= 0.8;
                }
            }

            // Realistic Reload Animation Loop
            if (this.isReloading) {
                this.updateReloadAnimation(deltaTime);
            }
        }

        this.targetManager.update(deltaTime, (timedOutBot) => {
            if (this.currentMode === 'speed') {
                if (this.onSpeedBotEnded) this.onSpeedBotEnded();
            }
        });

        if (window.crosshairManager) {
            window.crosshairManager.update(deltaTime);
        }

        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        this.updateMovement(deltaTime);
        if (!this.isReloading) {
            this.updateWeaponAnimation(deltaTime);
        }
    }

    updateReloadAnimation(deltaTime) {
        this.reloadTimer += deltaTime;
        const p = Math.min(1.0, this.reloadTimer / this.reloadDuration);
        const mag = (this.activeWeaponKey === 'vandal') ? this.vandalMag : this.phantomMag;

        // Phase 1: [0.0 ~ 0.22] Tilt & Bring to Center
        if (p < 0.22) {
            const t = p / 0.22;
            this.weaponContainer.rotation.z = t * 0.42; // roll tilt
            this.weaponContainer.rotation.x = (this.recoilAnim * 0.15) - (t * 0.22);
            this.weaponContainer.position.y = this.weaponDefaultPos.y - (t * 0.08);
            this.weaponContainer.position.x = this.weaponDefaultPos.x - (t * 0.06);

            if (p > 0.14 && !this.reloadAudioPlayed.magOut) {
                this.reloadAudioPlayed.magOut = true;
                if (window.soundEngine) window.soundEngine.playReloadMagOut();
            }
        }
        // Phase 2: [0.22 ~ 0.50] Old Mag Drops Out
        else if (p < 0.50) {
            const t = (p - 0.22) / 0.28;
            if (mag) {
                mag.position.y = mag.userData.defaultY - (t * 0.32); // drop down!
                mag.position.z = mag.userData.defaultZ - (t * 0.06);
                mag.rotation.x = mag.userData.defaultRotX - (t * 0.25);
            }
            this.weaponContainer.position.y = this.weaponDefaultPos.y - 0.08 - (Math.sin(t * Math.PI) * 0.02);
        }
        // Phase 3: [0.50 ~ 0.72] New Mag Slams in
        else if (p < 0.72) {
            const t = (p - 0.50) / 0.22;
            if (mag) {
                mag.position.y = mag.userData.defaultY - ((1.0 - t) * 0.32);
                mag.position.z = mag.userData.defaultZ - ((1.0 - t) * 0.06);
                mag.rotation.x = mag.userData.defaultRotX - ((1.0 - t) * 0.25);
            }
            if (p > 0.65 && !this.reloadAudioPlayed.magIn) {
                this.reloadAudioPlayed.magIn = true;
                if (window.soundEngine) window.soundEngine.playReloadMagIn();
                // Slam bump
                this.weaponContainer.position.y += 0.035;
            }
        }
        // Phase 4: [0.72 ~ 0.90] Charging Handle Bolt Rack & Jerk
        else if (p < 0.90) {
            if (mag) mag.position.y = mag.userData.defaultY;
            const t = (p - 0.72) / 0.18;
            if (p > 0.76 && !this.reloadAudioPlayed.bolt) {
                this.reloadAudioPlayed.bolt = true;
                if (window.soundEngine) window.soundEngine.playReloadBoltRack();
            }
            this.weaponContainer.position.z = this.weaponDefaultPos.z - (Math.sin(t * Math.PI) * 0.04);
            this.weaponContainer.rotation.z = 0.42 * (1.0 - t * 0.6);
        }
        // Phase 5: [0.90 ~ 1.0] Smooth Return to Aim
        else {
            if (mag) {
                mag.position.copy(mag.userData.defaultPos);
                mag.rotation.set(mag.userData.defaultRotX, 0, 0);
            }
            const t = (p - 0.90) / 0.10;
            this.weaponContainer.rotation.z = 0.16 * (1.0 - t);
            this.weaponContainer.rotation.x = -0.08 * (1.0 - t);
            this.weaponContainer.position.x = THREE.MathUtils.lerp(this.weaponDefaultPos.x - 0.02, this.weaponDefaultPos.x, t);
            this.weaponContainer.position.y = THREE.MathUtils.lerp(this.weaponDefaultPos.y - 0.03, this.weaponDefaultPos.y, t);

            if (p >= 1.0) {
                this.currentWeapon.ammo = this.currentWeapon.magSize;
                this.isReloading = false;
                this.canShoot = true;
                this.updateWeaponHUD();
            }
        }
    }

    updateMovement(deltaTime) {
        const moveSpeed = this.keys.shift ? 2.2 : (this.keys.ctrl ? 1.6 : 4.8);
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.add(forward);
        if (this.keys.backward) moveDir.sub(forward);
        if (this.keys.right) moveDir.add(right);
        if (this.keys.left) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            this.camera.position.addScaledVector(moveDir, moveSpeed * deltaTime);
            this.camera.position.x = Math.max(-1.8, Math.min(1.8, this.camera.position.x));
            this.camera.position.z = Math.max(-0.5, Math.min(3.5, this.camera.position.z));
        }

        const targetHeight = this.keys.ctrl ? 1.0 : this.playerHeight;
        this.camera.position.y += (targetHeight - this.camera.position.y) * 12 * deltaTime;
    }

    updateWeaponAnimation(deltaTime) {
        if (this.recoilAnim > 0) {
            this.recoilAnim = Math.max(0, this.recoilAnim - deltaTime * 14);
        }

        if (this.drawAnim > 0) {
            this.drawAnim = Math.max(0, this.drawAnim - deltaTime * 6);
        }

        this.sway.x += (0 - this.sway.x) * 10 * deltaTime;
        this.sway.y += (0 - this.sway.y) * 10 * deltaTime;

        const speed = (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right) ? 10 : 2;
        const bobAmount = speed === 10 ? 0.008 : 0.002;
        const bobX = Math.cos(performance.now() * 0.006 * (speed / 5)) * bobAmount;
        const bobY = Math.sin(performance.now() * 0.012 * (speed / 5)) * bobAmount;

        const drawOffsetY = this.drawAnim * -0.15;
        const drawTiltX = this.drawAnim * 0.3;

        this.weaponContainer.position.x = this.weaponDefaultPos.x + this.sway.x + bobX;
        this.weaponContainer.position.y = this.weaponDefaultPos.y - this.sway.y + bobY + (this.recoilAnim * 0.04) + drawOffsetY;
        this.weaponContainer.position.z = this.weaponDefaultPos.z + (this.recoilAnim * 0.08);

        this.weaponContainer.rotation.x = (this.recoilAnim * 0.15) + drawTiltX;
        this.weaponContainer.rotation.y = -this.sway.x * 2;
        this.weaponContainer.rotation.z = 0;
    }

    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const vFov = 2 * Math.atan(Math.tan((this.fov * Math.PI / 180) / 2) / aspect) * (180 / Math.PI);
        this.camera.fov = vFov;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(0.1, this.clock.getDelta());
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
}

function initGameInstance() {
    if (!window.game) {
        window.game = new AimGame();
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initGameInstance();
} else {
    window.addEventListener('DOMContentLoaded', initGameInstance);
}
