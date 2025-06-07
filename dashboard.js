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
        const panelGroup = new THREE.Group();
        
        // Create main leather panel with cutouts for gauges
        const panelWidth = 14;
        const panelHeight = 3.5;
        const panelDepth = 1.2;
        
        // Create box geometry for the panel
        const panelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth, 1, 1, 10);
        
        // Create leather material
        const leatherTexture = this.createLeatherTexture();
        const normalMap = this.createLeatherNormalMap();
        
        const leatherMaterial = new THREE.MeshStandardMaterial({
            map: leatherTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(0.8, 0.8),
            roughness: 0.85,
            metalness: 0.05,
            color: new THREE.Color(0x2a1810),
            emissive: new THREE.Color(0x050302),
            emissiveIntensity: 0.05
        });
        
        const leatherPanel = new THREE.Mesh(panelGeometry, leatherMaterial);
        leatherPanel.castShadow = true;
        leatherPanel.receiveShadow = true;
        panelGroup.add(leatherPanel);
        
        // Create gauge positions and cutouts
        const gaugePositions = [
            { x: -5, y: 0, metric: 'goalProgress' },
            { x: -2.5, y: 0, metric: 'monthlyRevenue' },
            { x: 0, y: 0, metric: 'pipelineHealth' },
            { x: 2.5, y: 0, metric: 'winRate' },
            { x: 5, y: 0, metric: 'dailyActivity' }
        ];
        
        // Create cutouts and gauges
        gaugePositions.forEach((pos, index) => {
            // Create cylindrical cutout
            const cutoutGroup = new THREE.Group();
            
            // Dark recessed area
            const recessGeometry = new THREE.CylinderGeometry(1.25, 1.25, 0.6, 64);
            const recessMaterial = new THREE.MeshStandardMaterial({
                color: 0x0a0805,
                roughness: 0.95,
                metalness: 0.05
            });
            const recess = new THREE.Mesh(recessGeometry, recessMaterial);
            recess.rotation.x = Math.PI / 2;
            recess.position.set(pos.x, pos.y, panelDepth/2 - 0.3);
            recess.receiveShadow = true;
            cutoutGroup.add(recess);
            
            
            panelGroup.add(cutoutGroup);
            
            // Create gauge INSIDE the cutout
            const gauge = this.createSingleGauge(pos.metric);
            gauge.position.set(pos.x, pos.y, panelDepth/2 - 0.15); // Recessed slightly into panel
            gauge.userData.metric = pos.metric;
            gauge.userData.index = index;
            panelGroup.add(gauge);
            this.gauges.push(gauge);
        });
        
        // Add stitching
        this.createStitching(panelGroup, panelWidth, panelHeight, panelDepth);
        
        panelGroup.position.y = 3;
        this.scene.add(panelGroup);
        this.leatherPanel = panelGroup;
    }
    
    createLeatherTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base leather color with gradient
        const gradient = ctx.createLinearGradient(0, 0, 2048, 512);
        gradient.addColorStop(0, '#3a2218');
        gradient.addColorStop(0.5, '#2a1810');
        gradient.addColorStop(1, '#221208');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 512);
        
        // Add leather grain
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 512;
            const radius = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.15;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.fill();
        }
        
        // Add subtle wear patterns
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 512;
            const width = Math.random() * 100 + 50;
            const height = Math.random() * 50 + 25;
            
            ctx.save();
            ctx.globalAlpha = 0.05;
            ctx.fillStyle = '#000';
            ctx.translate(x, y);
            ctx.rotate(Math.random() * Math.PI);
            ctx.fillRect(-width/2, -height/2, width, height);
            ctx.restore();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createLeatherNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 512, 512);
        
        // Create pores and texture
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 8 + 3;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, '#a0a0ff');
            gradient.addColorStop(0.5, '#9090ff');
            gradient.addColorStop(1, '#8080ff');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    createStitching(parent, width, height, depth) {
        const stitchMaterial = new THREE.MeshStandardMaterial({
            color: 0xc9a961,
            emissive: 0xc9a961,
            emissiveIntensity: 0.05,
            roughness: 0.9,
            metalness: 0.2
        });
        
        const stitchGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.12);
        const stitchSpacing = 0.3;
        
        // Top stitching
        const topStitchCount = Math.floor(width / stitchSpacing);
        for (let i = 0; i < topStitchCount; i++) {
            const x = (i / (topStitchCount - 1)) * (width - 1) - (width - 1) / 2;
            const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
            stitch.position.set(x, height/2 - 0.25, depth/2 + 0.05);
            stitch.rotation.z = Math.PI / 2;
            stitch.castShadow = true;
            parent.add(stitch);
        }
        
        // Bottom stitching
        for (let i = 0; i < topStitchCount; i++) {
            const x = (i / (topStitchCount - 1)) * (width - 1) - (width - 1) / 2;
            const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
            stitch.position.set(x, -height/2 + 0.25, depth/2 + 0.05);
            stitch.rotation.z = Math.PI / 2;
            stitch.castShadow = true;
            parent.add(stitch);
        }
    }
    
    createSingleGauge(metricKey) {
        const gaugeGroup = new THREE.Group();
        const metric = this.metrics[metricKey];
        
        // Gauge base - sits inside the recess
        const baseGeometry = new THREE.CylinderGeometry(1.2, 1.15, 0.3, 64);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.9,
            roughness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.rotation.x = Math.PI / 2;
        base.position.z = -0.15;  // Recessed into the panel
        base.castShadow = true;
        base.receiveShadow = true;
        gaugeGroup.add(base);
        
        // Dial face - flush with leather surface
        const dialCanvas = this.createDialTexture(metric);
        const dialTexture = new THREE.CanvasTexture(dialCanvas);
        const dialGeometry = new THREE.CircleGeometry(1.1, 64);
        const dialMaterial = new THREE.MeshBasicMaterial({
            map: dialTexture
        });
        const dial = new THREE.Mesh(dialGeometry, dialMaterial);
        dial.position.z = 0.15;  // At leather surface level
        gaugeGroup.add(dial);
        
        // Crystal glass
        const glassGeometry = new THREE.CircleGeometry(1.15, 64);
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 0.95,
            opacity: 0.3,
            transparent: true,
            envMapIntensity: 1,
            clearcoat: 1,
            clearcoatRoughness: 0
        });
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.z = 0.18;
        gaugeGroup.add(glass);
        
        // Bezel ring
        const bezelGeometry = new THREE.TorusGeometry(1.15, 0.08, 8, 64);
        const bezelMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.95,
            roughness: 0.2
        });
        const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
        bezel.position.z = 0.15;
        bezel.castShadow = true;
        gaugeGroup.add(bezel);
        
        // Decorative bolts
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const boltGeometry = new THREE.CylinderGeometry(0.04, 0.035, 0.08, 16);
            const boltMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 1,
                roughness: 0.2
            });
            const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
            bolt.position.x = Math.cos(angle) * 1.15;
            bolt.position.y = Math.sin(angle) * 1.15;
            bolt.position.z = 0.15;
            bolt.rotation.x = Math.PI / 2;
            bolt.castShadow = true;
            gaugeGroup.add(bolt);
        }
        
        // Needle assembly
        const needle = this.createNeedle(metric.value / metric.target);
        needle.position.z = 0.17;
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
        
        // Background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 512, 512);
        
        // Subtle radial gradient
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(0.7, '#0f0f0f');
        gradient.addColorStop(1, '#050505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Tick marks and numbers
        ctx.strokeStyle = '#c9a961';
        ctx.fillStyle = '#c9a961';
        ctx.lineWidth = 2;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Major tick marks
        for (let i = 0; i <= 10; i++) {
            const angle = (i / 10) * Math.PI * 1.5 - Math.PI * 1.25;
            const innerRadius = 200;
            const outerRadius = i % 2 === 0 ? 180 : 190;
            
            const x1 = 256 + Math.cos(angle) * innerRadius;
            const y1 = 256 + Math.sin(angle) * innerRadius;
            const x2 = 256 + Math.cos(angle) * outerRadius;
            const y2 = 256 + Math.sin(angle) * outerRadius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Numbers
            if (i % 2 === 0) {
                const labelX = 256 + Math.cos(angle) * 155;
                const labelY = 256 + Math.sin(angle) * 155;
                ctx.fillText((i * 10).toString(), labelX, labelY);
            }
        }
        
        // Label
        ctx.font = '18px Arial';
        ctx.fillStyle = '#c9a961';
        ctx.fillText(metric.label, 256, 350);
        
        // Current value
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(metric.value.toString(), 256, 380);
        
        return canvas;
    }
    
    createNeedle(progress) {
        const needleGroup = new THREE.Group();
        
        // Main needle shaft
        const shaftGeometry = new THREE.BoxGeometry(0.025, 1, 0.015);
        shaftGeometry.translate(0, 0.5, 0);
        const shaftMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.95,
            roughness: 0.1,
            emissive: 0xc9a961,
            emissiveIntensity: 0.02
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.castShadow = true;
        needleGroup.add(shaft);
        
        // Needle tip
        const tipGeometry = new THREE.ConeGeometry(0.04, 0.2, 4);
        tipGeometry.translate(0, 1.05, 0);
        const tip = new THREE.Mesh(tipGeometry, shaftMaterial);
        tip.castShadow = true;
        needleGroup.add(tip);
        
        // Counterweight
        const counterweightGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const counterweightMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa0000,
            metalness: 0.8,
            roughness: 0.3,
            emissive: 0xaa0000,
            emissiveIntensity: 0.05
        });
        const counterweight = new THREE.Mesh(counterweightGeometry, counterweightMaterial);
        counterweight.position.y = -0.15;
        counterweight.castShadow = true;
        needleGroup.add(counterweight);
        
        // Center cap
        const capGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 32);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 1,
            roughness: 0.2
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.rotation.x = Math.PI / 2;
        cap.castShadow = true;
        needleGroup.add(cap);
        
        // Set initial rotation
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
        // Ambient light - increased for better visibility
        const ambientLight = new THREE.AmbientLight(0x444444, 0.8);
        this.scene.add(ambientLight);
        
        // Key light - main illumination - brighter
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(5, 10, 5);
        keyLight.castShadow = true;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -15;
        keyLight.shadow.camera.right = 15;
        keyLight.shadow.camera.top = 15;
        keyLight.shadow.camera.bottom = -15;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.001;
        this.scene.add(keyLight);
        this.lights.push(keyLight);
        
        // Fill light - warm tone - increased
        const fillLight = new THREE.DirectionalLight(0xc9a961, 0.6);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
        
        // Rim light - cool accent
        const rimLight = new THREE.DirectionalLight(0x6666ff, 0.3);
        rimLight.position.set(0, -5, -10);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
        
        // Spot light on panel - brighter
        const spotLight = new THREE.SpotLight(0xc9a961, 0.8);
        spotLight.position.set(0, 8, 8);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        spotLight.decay = 2;
        spotLight.distance = 30;
        spotLight.castShadow = true;
        spotLight.target = this.leatherPanel;
        this.scene.add(spotLight);
        this.lights.push(spotLight);
        
        // Individual gauge accent lights - brighter
        this.gauges.forEach((gauge, index) => {
            const gaugeLight = new THREE.PointLight(0xc9a961, 0.4, 5);
            gaugeLight.position.copy(gauge.position);
            gaugeLight.position.z += 2;
            gaugeLight.position.y += 3;
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
                
                // Animate gauge
                gsap.to(gauge.scale, {
                    x: 1.05,
                    y: 1.05,
                    z: 1.05,
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
                
                // Spin needle
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
            
            // Spring physics
            const force = (targetRotation - currentRotation) * needle.userData.springConstant;
            needle.userData.velocity = (velocity + force) * needle.userData.damping;
            needle.userData.currentRotation += needle.userData.velocity;
            
            needle.rotation.z = needle.userData.currentRotation;
            
            // Micro vibration
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
        
        // Camera orbit
        this.camera.position.x = 15 * Math.sin(this.cameraOffset.x);
        this.camera.position.y = 15 * Math.sin(this.cameraOffset.y);
        this.camera.lookAt(0, 0, 0);
        
        // Subtle leather panel float
        this.leatherPanel.position.y = 3 + Math.sin(elapsedTime * 0.5) * 0.02;
        
        // Dynamic lighting - adjusted for brighter scene
        this.lights.forEach((light, index) => {
            if (light.isPointLight) {
                light.intensity = 0.4 + Math.sin(elapsedTime * 2 + index) * 0.05;
            } else if (light.isSpotLight) {
                light.intensity = 0.8 + Math.sin(elapsedTime * 2 + index) * 0.05;
            }
        });
        
        // Update needle physics
        this.updateNeedles(deltaTime);
        
        // Occasional metric updates
        if (Math.random() < 0.01) {
            this.updateMetrics();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

let dashboard;
window.addEventListener('DOMContentLoaded', () => {
    dashboard = new HeirloomDashboard();
});