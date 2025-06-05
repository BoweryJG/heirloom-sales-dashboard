class HeirloomDashboard {
    constructor() {
        this.container = document.getElementById('dashboard-container');
        this.canvas = document.getElementById('dashboard-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.metricOverlay = document.getElementById('metric-overlay');
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.leatherPanel = null;
        this.gauges = [];
        this.needles = [];
        this.lights = [];
        this.clock = new THREE.Clock();
        
        this.metrics = {
            goalProgress: { value: 78, target: 100, label: '% to Goal' },
            monthlyRevenue: { value: 127.3, target: 150, label: 'Monthly Revenue ($K)' },
            pipelineHealth: { value: 92, target: 100, label: 'Pipeline Health (%)' },
            winRate: { value: 68, target: 80, label: 'Win Rate' },
            dailyActivity: { value: 85, target: 100, label: 'Daily Activity Score' }
        };
        
        this.touchStart = { x: 0, y: 0 };
        this.cameraOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.createLeatherPanel();
        this.createGauges();
        this.setupLighting();
        this.setupEventListeners();
        this.animate();
        
        setTimeout(() => {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 800);
        }, 2000);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 15);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }
    
    createLeatherPanel() {
        const panelGeometry = new THREE.BoxGeometry(12, 3, 0.8);
        panelGeometry.translate(0, 3, 0);
        
        const leatherTexture = this.createLeatherTexture();
        const normalMap = this.createLeatherNormalMap();
        
        const leatherMaterial = new THREE.MeshStandardMaterial({
            map: leatherTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(0.8, 0.8),
            roughness: 0.8,
            metalness: 0.1,
            color: new THREE.Color(0x2a1810),
            emissive: new THREE.Color(0x050302),
            emissiveIntensity: 0.1
        });
        
        this.leatherPanel = new THREE.Mesh(panelGeometry, leatherMaterial);
        this.leatherPanel.castShadow = true;
        this.leatherPanel.receiveShadow = true;
        this.scene.add(this.leatherPanel);
        
        this.createStitching();
    }
    
    createLeatherTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
        gradient.addColorStop(0, '#3a2218');
        gradient.addColorStop(0.5, '#2a1810');
        gradient.addColorStop(1, '#221208');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 512);
        
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const radius = Math.random() * 2;
            const opacity = Math.random() * 0.1;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 1);
        return texture;
    }
    
    createLeatherNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 10 + 5;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, '#a0a0ff');
            gradient.addColorStop(1, '#8080ff');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createStitching() {
        const stitchMaterial = new THREE.MeshStandardMaterial({
            color: 0xc9a961,
            emissive: 0xc9a961,
            emissiveIntensity: 0.1,
            roughness: 0.9,
            metalness: 0.3
        });
        
        const stitchGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1);
        
        const topStitches = 40;
        const bottomStitches = 40;
        
        for (let i = 0; i < topStitches; i++) {
            const x = (i / (topStitches - 1)) * 11.5 - 5.75;
            const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
            stitch.position.set(x, 4.3, 0.5);
            stitch.rotation.z = Math.PI / 2;
            this.leatherPanel.add(stitch);
        }
        
        for (let i = 0; i < bottomStitches; i++) {
            const x = (i / (bottomStitches - 1)) * 11.5 - 5.75;
            const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
            stitch.position.set(x, 1.7, 0.5);
            stitch.rotation.z = Math.PI / 2;
            this.leatherPanel.add(stitch);
        }
    }
    
    createGauges() {
        const gaugePositions = [
            { x: -4, y: 3, metric: 'goalProgress' },
            { x: -2, y: 3, metric: 'monthlyRevenue' },
            { x: 0, y: 3, metric: 'pipelineHealth' },
            { x: 2, y: 3, metric: 'winRate' },
            { x: 4, y: 3, metric: 'dailyActivity' }
        ];
        
        gaugePositions.forEach((pos, index) => {
            const gauge = this.createSingleGauge(pos.metric);
            gauge.position.set(pos.x, pos.y, 2);
            gauge.userData.metric = pos.metric;
            gauge.userData.index = index;
            this.scene.add(gauge);
            this.gauges.push(gauge);
        });
    }
    
    createSingleGauge(metricKey) {
        const gaugeGroup = new THREE.Group();
        const metric = this.metrics[metricKey];
        
        const baseGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 64);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.9,
            roughness: 0.2,
            envMapIntensity: 1
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.rotation.x = Math.PI / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        gaugeGroup.add(base);
        
        const dialCanvas = this.createDialTexture(metric);
        const dialTexture = new THREE.CanvasTexture(dialCanvas);
        const dialGeometry = new THREE.CircleGeometry(1, 64);
        const dialMaterial = new THREE.MeshBasicMaterial({
            map: dialTexture,
            transparent: true
        });
        const dial = new THREE.Mesh(dialGeometry, dialMaterial);
        dial.position.z = 0.16;
        gaugeGroup.add(dial);
        
        const glassGeometry = new THREE.CircleGeometry(1.15, 64);
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 1,
            thickness: 0.5,
            envMapIntensity: 1,
            clearcoat: 1,
            clearcoatRoughness: 0,
            transparent: true,
            opacity: 0.2
        });
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.z = 0.25;
        gaugeGroup.add(glass);
        
        const bezelGeometry = new THREE.TorusGeometry(1.2, 0.08, 8, 64);
        const bezelMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.95,
            roughness: 0.3
        });
        const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.z = 0.15;
        bezel.castShadow = true;
        gaugeGroup.add(bezel);
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const boltGeometry = new THREE.SphereGeometry(0.04, 16, 16);
            const boltMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 1,
                roughness: 0.2
            });
            const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
            bolt.position.x = Math.cos(angle) * 1.2;
            bolt.position.y = Math.sin(angle) * 1.2;
            bolt.position.z = 0.15;
            bolt.castShadow = true;
            gaugeGroup.add(bolt);
        }
        
        const needle = this.createNeedle(metric.value / metric.target);
        needle.position.z = 0.2;
        gaugeGroup.add(needle);
        this.needles.push(needle);
        
        gaugeGroup.userData.metric = metric;
        return gaugeGroup;
    }
    
    createDialTexture(metric) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 512, 512);
        
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#050505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.strokeStyle = '#c9a961';
        ctx.lineWidth = 2;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#c9a961';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= 10; i++) {
            const angle = (i / 10) * Math.PI * 1.5 - Math.PI * 1.25;
            const x1 = 256 + Math.cos(angle) * 200;
            const y1 = 256 + Math.sin(angle) * 200;
            const x2 = 256 + Math.cos(angle) * 180;
            const y2 = 256 + Math.sin(angle) * 180;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            if (i % 2 === 0) {
                const labelX = 256 + Math.cos(angle) * 150;
                const labelY = 256 + Math.sin(angle) * 150;
                ctx.fillText((i * 10).toString(), labelX, labelY);
            }
        }
        
        ctx.font = '16px Arial';
        ctx.fillText(metric.label, 256, 350);
        
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(metric.value.toString(), 256, 380);
        
        return canvas;
    }
    
    createNeedle(progress) {
        const needleGroup = new THREE.Group();
        
        const shaftGeometry = new THREE.BoxGeometry(0.02, 0.9, 0.02);
        shaftGeometry.translate(0, 0.45, 0);
        const shaftMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            metalness: 0.95,
            roughness: 0.1,
            emissive: 0xc9a961,
            emissiveIntensity: 0.05
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.castShadow = true;
        needleGroup.add(shaft);
        
        const tipGeometry = new THREE.ConeGeometry(0.03, 0.15, 4);
        tipGeometry.translate(0, 0.95, 0);
        const tip = new THREE.Mesh(tipGeometry, shaftMaterial);
        tip.castShadow = true;
        needleGroup.add(tip);
        
        const counterweightGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 32);
        const counterweightMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa0000,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xaa0000,
            emissiveIntensity: 0.1
        });
        const counterweight = new THREE.Mesh(counterweightGeometry, counterweightMaterial);
        counterweight.position.y = -0.1;
        counterweight.castShadow = true;
        needleGroup.add(counterweight);
        
        const centerPinGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 32);
        const centerPinMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 1,
            roughness: 0.2
        });
        const centerPin = new THREE.Mesh(centerPinGeometry, centerPinMaterial);
        centerPin.rotation.x = Math.PI / 2;
        centerPin.castShadow = true;
        needleGroup.add(centerPin);
        
        const targetAngle = progress * Math.PI * 1.5 - Math.PI * 1.25;
        needleGroup.userData.targetRotation = targetAngle;
        needleGroup.userData.currentRotation = -Math.PI * 1.25;
        needleGroup.userData.velocity = 0;
        needleGroup.userData.springConstant = 0.15;
        needleGroup.userData.damping = 0.85;
        needleGroup.userData.progress = progress;
        
        needleGroup.rotation.z = -Math.PI * 1.25;
        
        return needleGroup;
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
        this.scene.add(ambientLight);
        
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(5, 10, 5);
        keyLight.castShadow = true;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -10;
        keyLight.shadow.camera.right = 10;
        keyLight.shadow.camera.top = 10;
        keyLight.shadow.camera.bottom = -10;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.001;
        this.scene.add(keyLight);
        this.lights.push(keyLight);
        
        const fillLight = new THREE.DirectionalLight(0xc9a961, 0.3);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
        
        const rimLight = new THREE.DirectionalLight(0x4444ff, 0.2);
        rimLight.position.set(0, -5, -10);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
        
        const spotLight = new THREE.SpotLight(0xc9a961, 0.5);
        spotLight.position.set(0, 8, 8);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.5;
        spotLight.decay = 2;
        spotLight.distance = 30;
        spotLight.castShadow = true;
        this.scene.add(spotLight);
        this.lights.push(spotLight);
        
        this.gauges.forEach((gauge, index) => {
            const gaugeLight = new THREE.PointLight(0xc9a961, 0.3, 3);
            gaugeLight.position.copy(gauge.position);
            gaugeLight.position.z += 1;
            this.scene.add(gaugeLight);
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        this.canvas.addEventListener('click', (e) => this.onGaugeClick(e));
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
            this.isDragging = true;
        }
    }
    
    onTouchMove(e) {
        e.preventDefault();
        if (this.isDragging && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - this.touchStart.x;
            const deltaY = e.touches[0].clientY - this.touchStart.y;
            
            this.cameraOffset.x = deltaX * 0.01;
            this.cameraOffset.y = -deltaY * 0.01;
            
            gsap.to(this.leatherPanel.rotation, {
                x: this.cameraOffset.y * 0.1,
                y: this.cameraOffset.x * 0.1,
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        this.isDragging = false;
        
        gsap.to(this.leatherPanel.rotation, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)"
        });
        
        gsap.to(this.cameraOffset, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
        });
    }
    
    onMouseDown(e) {
        this.touchStart.x = e.clientX;
        this.touchStart.y = e.clientY;
        this.isDragging = true;
    }
    
    onMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.touchStart.x;
            const deltaY = e.clientY - this.touchStart.y;
            
            this.cameraOffset.x = deltaX * 0.01;
            this.cameraOffset.y = -deltaY * 0.01;
            
            gsap.to(this.leatherPanel.rotation, {
                x: this.cameraOffset.y * 0.1,
                y: this.cameraOffset.x * 0.1,
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        
        gsap.to(this.leatherPanel.rotation, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)"
        });
        
        gsap.to(this.cameraOffset, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
        });
    }
    
    onGaugeClick(e) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, this.camera);
        
        const intersects = raycaster.intersectObjects(this.gauges, true);
        
        if (intersects.length > 0) {
            let gauge = intersects[0].object;
            while (gauge.parent && !gauge.userData.metric) {
                gauge = gauge.parent;
            }
            
            if (gauge.userData.metric) {
                this.showMetricOverlay(gauge.userData.metric);
                
                gsap.to(gauge.scale, {
                    x: 1.1,
                    y: 1.1,
                    z: 1.1,
                    duration: 0.3,
                    ease: "back.out(2)",
                    onComplete: () => {
                        gsap.to(gauge.scale, {
                            x: 1,
                            y: 1,
                            z: 1,
                            duration: 0.3,
                            ease: "power2.out"
                        });
                    }
                });
                
                const needle = this.needles[gauge.userData.index];
                if (needle) {
                    gsap.to(needle.rotation, {
                        z: needle.userData.targetRotation + Math.PI * 2,
                        duration: 1.5,
                        ease: "elastic.out(1, 0.3)",
                        onComplete: () => {
                            needle.rotation.z = needle.userData.targetRotation;
                        }
                    });
                }
            }
        }
    }
    
    showMetricOverlay(metricKey) {
        const metric = this.metrics[metricKey];
        
        this.metricOverlay.innerHTML = `
            <div class="metric-close" onclick="dashboard.hideMetricOverlay()">✕</div>
            <div class="metric-title">${metric.label}</div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-details">
                Target: ${metric.target}<br>
                Progress: ${((metric.value / metric.target) * 100).toFixed(1)}%<br>
                Status: ${metric.value >= metric.target * 0.9 ? 'On Track' : 'Needs Attention'}
            </div>
        `;
        
        this.metricOverlay.style.left = '50%';
        this.metricOverlay.style.top = '50%';
        this.metricOverlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
        this.metricOverlay.classList.add('active');
        
        setTimeout(() => {
            this.metricOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }
    
    hideMetricOverlay() {
        this.metricOverlay.classList.remove('active');
    }
    
    updateNeedles(deltaTime) {
        this.needles.forEach((needle) => {
            const targetRotation = needle.userData.targetRotation;
            const currentRotation = needle.userData.currentRotation;
            const velocity = needle.userData.velocity;
            
            const force = (targetRotation - currentRotation) * needle.userData.springConstant;
            needle.userData.velocity = (velocity + force) * needle.userData.damping;
            needle.userData.currentRotation += needle.userData.velocity;
            
            needle.rotation.z = needle.userData.currentRotation;
            
            const vibration = Math.sin(Date.now() * 0.01) * 0.001 * Math.abs(needle.userData.velocity);
            needle.rotation.z += vibration;
        });
    }
    
    updateMetrics() {
        const time = Date.now() * 0.0001;
        
        Object.keys(this.metrics).forEach((key, index) => {
            const metric = this.metrics[key];
            const variation = Math.sin(time + index) * 0.02;
            const newValue = metric.value * (1 + variation);
            
            const needle = this.needles[index];
            if (needle) {
                const progress = newValue / metric.target;
                needle.userData.targetRotation = progress * Math.PI * 1.5 - Math.PI * 1.25;
            }
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        this.camera.position.x = 15 * Math.sin(this.cameraOffset.x);
        this.camera.position.y = 15 * Math.sin(this.cameraOffset.y);
        this.camera.lookAt(0, 0, 0);
        
        this.leatherPanel.position.y = 3 + Math.sin(elapsedTime * 0.5) * 0.02;
        
        this.lights.forEach((light, index) => {
            if (light.isPointLight || light.isSpotLight) {
                light.intensity = 0.3 + Math.sin(elapsedTime * 2 + index) * 0.05;
            }
        });
        
        this.updateNeedles(deltaTime);
        
        if (Math.random() < 0.01) {
            this.updateMetrics();
        }
        
        this.gauges.forEach((gauge, index) => {
            gauge.rotation.z = Math.sin(elapsedTime * 0.3 + index) * 0.01;
        });
        
        this.renderer.render(this.scene, this.camera);
    }
}

let dashboard;
window.addEventListener('DOMContentLoaded', () => {
    dashboard = new HeirloomDashboard();
});