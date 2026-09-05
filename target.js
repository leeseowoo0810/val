/**
 * Valorant Practice Bot & Target Manager
 * High Performance Edition: Zero-GC Object Pooling for smooth 60-144 FPS on low-end PCs.
 */
class TargetManager {
    constructor(scene) {
        this.scene = scene;
        this.targets = [];
        this.materials = this.createMaterials();
        
        // High-Performance Particle Object Pool (Zero Garbage Collection)
        this.initParticlePool();
    }

    createMaterials() {
        return {
            armorDark: new THREE.MeshStandardMaterial({
                color: 0x242d38,
                roughness: 0.4,
                metalness: 0.7
            }),
            armorLight: new THREE.MeshStandardMaterial({
                color: 0x5a6d82,
                roughness: 0.3,
                metalness: 0.5
            }),
            coreCyan: new THREE.MeshStandardMaterial({
                color: 0x00f5d4,
                emissive: 0x00f5d4,
                emissiveIntensity: 1.5,
                roughness: 0.1
            }),
            headArmor: new THREE.MeshStandardMaterial({
                color: 0x364352,
                roughness: 0.25,
                metalness: 0.8
            }),
            headSensor: new THREE.MeshStandardMaterial({
                color: 0xff3344,
                emissive: 0xff3344,
                emissiveIntensity: 2.2,
                roughness: 0.1
            }),
            hitFlash: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            hitHeadFlash: new THREE.MeshBasicMaterial({ color: 0xffea00 })
        };
    }

    initParticlePool() {
        this.poolSize = 40;
        this.sparksPool = [];
        this.sparkIndex = 0;

        const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const sparkMatGold = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const sparkMatRed = new THREE.MeshBasicMaterial({ color: 0xff4655 });

        for (let i = 0; i < this.poolSize; i++) {
            const mesh = new THREE.Mesh(sparkGeo, i % 2 === 0 ? sparkMatGold : sparkMatRed);
            mesh.visible = false;
            this.scene.add(mesh);
            this.sparksPool.push({
                mesh: mesh,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 0.3,
                active: false
            });
        }
    }

    createBotModel() {
        const group = new THREE.Group();

        // 1. Base (y: 0 to 0.4)
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.35, 8);
        const baseMesh = new THREE.Mesh(baseGeo, this.materials.armorDark);
        baseMesh.position.y = 0.2;
        group.add(baseMesh);

        // Thruster glow
        const thrustGeo = new THREE.CylinderGeometry(0.2, 0.1, 0.15, 6);
        const thrustMesh = new THREE.Mesh(thrustGeo, this.materials.coreCyan);
        thrustMesh.position.y = 0.05;
        group.add(thrustMesh);

        // 2. Hip joint (y: 0.4 to 0.9)
        const hipGeo = new THREE.BoxGeometry(0.65, 0.35, 0.4);
        const hipMesh = new THREE.Mesh(hipGeo, this.materials.armorLight);
        hipMesh.position.y = 0.6;
        group.add(hipMesh);

        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 6), this.materials.armorDark);
        legL.position.set(-0.25, 0.35, 0);
        const legR = legL.clone();
        legR.position.x = 0.25;
        group.add(legL);
        group.add(legR);

        // Leg Hitbox
        const legHitboxGeo = new THREE.BoxGeometry(0.7, 0.6, 0.5);
        const legHitbox = new THREE.Mesh(legHitboxGeo, new THREE.MeshBasicMaterial({ visible: false }));
        legHitbox.position.y = 0.45;
        group.add(legHitbox);

        // 3. Torso / Chest (y: 0.9 to 1.7)
        const torsoGeo = new THREE.BoxGeometry(0.75, 0.7, 0.45);
        const torsoMesh = new THREE.Mesh(torsoGeo, this.materials.armorDark);
        torsoMesh.position.y = 1.2;
        group.add(torsoMesh);

        const chestPlateGeo = new THREE.BoxGeometry(0.65, 0.45, 0.15);
        const chestPlate = new THREE.Mesh(chestPlateGeo, this.materials.armorLight);
        chestPlate.position.set(0, 1.25, 0.2);
        group.add(chestPlate);

        const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
        coreGeo.rotateX(Math.PI / 2);
        const coreMesh = new THREE.Mesh(coreGeo, this.materials.coreCyan);
        coreMesh.position.set(0, 1.25, 0.28);
        group.add(coreMesh);

        // Shoulders & Arms
        const shoulderGeo = new THREE.BoxGeometry(0.25, 0.25, 0.3);
        const shoulderL = new THREE.Mesh(shoulderGeo, this.materials.armorLight);
        shoulderL.position.set(-0.48, 1.45, 0);
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 0.48;
        group.add(shoulderL);
        group.add(shoulderR);

        const armGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.6, 6);
        const armL = new THREE.Mesh(armGeo, this.materials.armorDark);
        armL.position.set(-0.48, 1.05, 0.05);
        armL.rotation.x = 0.2;
        const armR = armL.clone();
        armR.position.x = 0.48;
        group.add(armL);
        group.add(armR);

        // Body Hitbox
        const bodyHitboxGeo = new THREE.BoxGeometry(0.85, 0.85, 0.6);
        const bodyHitbox = new THREE.Mesh(bodyHitboxGeo, new THREE.MeshBasicMaterial({ visible: false }));
        bodyHitbox.position.y = 1.25;
        group.add(bodyHitbox);

        // 4. Head (y: 1.7 to 2.1)
        const neckGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.15, 6);
        const neckMesh = new THREE.Mesh(neckGeo, this.materials.armorDark);
        neckMesh.position.y = 1.65;
        group.add(neckMesh);

        const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.38);
        const headMesh = new THREE.Mesh(headGeo, this.materials.headArmor);
        headMesh.position.y = 1.9;
        group.add(headMesh);

        // Valorant Red Sensor Eye
        const visorGeo = new THREE.BoxGeometry(0.28, 0.13, 0.09);
        const visorMesh = new THREE.Mesh(visorGeo, this.materials.headSensor);
        visorMesh.position.set(0, 1.95, 0.19);
        group.add(visorMesh);

        // Head Hitbox
        const headHitboxGeo = new THREE.SphereGeometry(0.3, 10, 10);
        const headHitbox = new THREE.Mesh(headHitboxGeo, new THREE.MeshBasicMaterial({ visible: false }));
        headHitbox.position.y = 1.9;
        group.add(headHitbox);

        return {
            root: group,
            headMesh: headMesh,
            torsoMesh: torsoMesh,
            hitboxes: {
                head: headHitbox,
                body: bodyHitbox,
                leg: legHitbox
            }
        };
    }

    spawnBot(options = {}) {
        const botModel = this.createBotModel();
        const root = botModel.root;

        const x = options.x !== undefined ? options.x : (Math.random() * 16 - 8);
        const y = options.y !== undefined ? options.y : 0;
        const z = options.z !== undefined ? options.z : -(15 + Math.random() * 12);

        root.position.set(x, y, z);
        root.lookAt(0, 1.68, 0);

        const target = {
            id: Math.random().toString(36).substr(2, 9),
            root: root,
            headMesh: botModel.headMesh,
            torsoMesh: botModel.torsoMesh,
            hitboxes: botModel.hitboxes,
            hp: 100,
            maxHp: 100,
            isDead: false,
            spawnTime: performance.now(),
            lifetime: options.lifetime || null,
            isMoving: options.isMoving || false,
            moveSpeed: options.moveSpeed || 3.2,
            moveDir: Math.random() > 0.5 ? 1 : -1,
            moveBounds: options.moveBounds || { minX: -10, maxX: 10 },
            baseY: y,
            hoverPhase: Math.random() * Math.PI * 2,
            flashTimer: 0
        };

        botModel.hitboxes.head.userData = { type: 'head', target: target };
        botModel.hitboxes.body.userData = { type: 'body', target: target };
        botModel.hitboxes.leg.userData = { type: 'leg', target: target };

        this.scene.add(root);
        this.targets.push(target);

        if (window.soundEngine) window.soundEngine.playSpawnSound();
        return target;
    }

    damageBot(target, hitboxType, hitPoint, customDamage = null) {
        if (!target || target.isDead) return null;

        const isHeadshot = (hitboxType === 'head');
        let damage = 40;
        if (customDamage !== null) {
            damage = customDamage;
        } else if (isHeadshot) {
            damage = 160;
        } else if (hitboxType === 'leg') {
            damage = 34;
        }

        target.hp -= damage;
        target.flashTimer = 0.12;

        if (isHeadshot) {
            target.headMesh.material = this.materials.hitHeadFlash;
            this.emitSparksFromPool(hitPoint, 10, true);
        } else {
            target.torsoMesh.material = this.materials.hitFlash;
            this.emitSparksFromPool(hitPoint, 6, false);
        }

        const isKill = target.hp <= 0;
        if (isKill) {
            this.killBot(target, isHeadshot);
        }

        return {
            damage: damage,
            isHeadshot: isHeadshot,
            isKill: isKill,
            timeToKill: performance.now() - target.spawnTime
        };
    }

    killBot(target, isHeadshot = false) {
        if (target.isDead) return;
        target.isDead = true;

        const pos = target.root.position.clone();
        pos.y += 1.2;
        this.emitSparksFromPool(pos, 16, isHeadshot);

        this.scene.remove(target.root);
        this.targets = this.targets.filter(t => t !== target);
    }

    clearAllBots() {
        this.targets.forEach(t => {
            this.scene.remove(t.root);
        });
        this.targets = [];
    }

    // High-performance particle reuse from preallocated pool
    emitSparksFromPool(point, count, isGold) {
        for (let i = 0; i < count; i++) {
            const p = this.sparksPool[this.sparkIndex];
            this.sparkIndex = (this.sparkIndex + 1) % this.poolSize;

            p.mesh.position.copy(point);
            p.mesh.visible = true;
            p.active = true;
            p.life = 0.25 + Math.random() * 0.15;
            p.maxLife = p.life;

            const speed = 4 + Math.random() * 5;
            p.velocity.set(
                (Math.random() - 0.5) * speed,
                Math.random() * speed + 1,
                (Math.random() - 0.5) * speed
            );
        }
    }

    update(deltaTime, onBotTimeout = null) {
        const now = performance.now();

        // 1. Update active bots
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];

            if (target.lifetime !== null) {
                const elapsed = (now - target.spawnTime) / 1000;
                if (elapsed >= target.lifetime) {
                    if (onBotTimeout) onBotTimeout(target);
                    this.scene.remove(target.root);
                    this.targets.splice(i, 1);
                    continue;
                }
            }

            target.hoverPhase += deltaTime * 2.5;
            target.root.position.y = target.baseY + Math.sin(target.hoverPhase) * 0.08;

            if (target.isMoving) {
                target.root.position.x += target.moveDir * target.moveSpeed * deltaTime;
                if (target.root.position.x >= target.moveBounds.maxX) {
                    target.root.position.x = target.moveBounds.maxX;
                    target.moveDir = -1;
                } else if (target.root.position.x <= target.moveBounds.minX) {
                    target.root.position.x = target.moveBounds.minX;
                    target.moveDir = 1;
                }
            }

            if (target.flashTimer > 0) {
                target.flashTimer -= deltaTime;
                if (target.flashTimer <= 0) {
                    target.headMesh.material = this.materials.headArmor;
                    target.torsoMesh.material = this.materials.armorDark;
                }
            }
        }

        // 2. Update particle pool
        for (let i = 0; i < this.poolSize; i++) {
            const p = this.sparksPool[i];
            if (!p.active) continue;

            p.life -= deltaTime;
            if (p.life <= 0) {
                p.active = false;
                p.mesh.visible = false;
            } else {
                p.mesh.position.addScaledVector(p.velocity, deltaTime);
                p.velocity.y -= 12 * deltaTime; // Gravity
                const s = Math.max(0.1, p.life / p.maxLife);
                p.mesh.scale.set(s, s, s);
            }
        }
    }
}

window.TargetManager = TargetManager;
