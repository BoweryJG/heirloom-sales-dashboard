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
        
        this.gaugeStyle = 'classic';
        
        
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
                // Start needle initialization sequence
                this.initializeNeedles();
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
        
        // Create initial material
        const leatherMaterial = this.createStingrayMaterial();
        
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
        
        // Add minimal stitching
        this.createMinimalStitching(panelGroup, panelWidth, panelHeight, panelDepth);
        
        panelGroup.position.y = 3;
        this.scene.add(panelGroup);
        this.leatherPanel = panelGroup;
    }
    
    createStingrayMaterial() {
        const texture = this.createStingrayTexture();
        const normalMap = this.createPearlNormalMap();
        
        return new THREE.MeshPhysicalMaterial({
            map: texture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(1.5, 1.5),
            roughness: 0.15,
            metalness: 0.1,
            color: new THREE.Color(0x0a0a0a),
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0.02,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            reflectivity: 0.5
        });
    }
    
    
    createStingrayTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base black stingray color
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 2048, 512);
        
        // Subtle gradient for depth
        const gradient = ctx.createRadialGradient(1024, 256, 0, 1024, 256, 1400);
        gradient.addColorStop(0, 'rgba(20, 20, 20, 0.5)');
        gradient.addColorStop(0.5, 'rgba(10, 10, 10, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 512);
        
        // Create stingray pearl pattern
        const pearlSize = 8;
        const spacing = 12;
        
        // Regular pearl grid with slight randomization
        for (let x = 0; x < 2048; x += spacing) {
            for (let y = 0; y < 512; y += spacing) {
                // Add randomization for natural look
                const offsetX = x + (Math.random() - 0.5) * 4;
                const offsetY = y + (Math.random() - 0.5) * 4;
                const size = pearlSize + (Math.random() - 0.5) * 3;
                
                // Skip some pearls for variation
                if (Math.random() > 0.9) continue;
                
                // Create pearl with highlight
                const pearlGradient = ctx.createRadialGradient(
                    offsetX - size * 0.3, offsetY - size * 0.3, 0,
                    offsetX, offsetY, size
                );
                pearlGradient.addColorStop(0, '#2a2a2a');
                pearlGradient.addColorStop(0.3, '#1a1a1a');
                pearlGradient.addColorStop(0.7, '#0f0f0f');
                pearlGradient.addColorStop(1, '#050505');
                
                ctx.fillStyle = pearlGradient;
                ctx.beginPath();
                ctx.arc(offsetX, offsetY, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add subtle highlight
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#3a3a3a';
                ctx.beginPath();
                ctx.arc(offsetX - size * 0.3, offsetY - size * 0.3, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        // Add central diamond pattern (characteristic of stingray)
        const centerX = 1024;
        const centerY = 256;
        const diamondSize = 120;
        
        // Create diamond star pattern
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const length = diamondSize * (1 + Math.sin(angle * 4) * 0.3);
            const x1 = centerX + Math.cos(angle) * 20;
            const y1 = centerY + Math.sin(angle) * 20;
            const x2 = centerX + Math.cos(angle) * length;
            const y2 = centerY + Math.sin(angle) * length;
            
            const lineGradient = ctx.createLinearGradient(x1, y1, x2, y2);
            lineGradient.addColorStop(0, 'rgba(40, 40, 40, 0.8)');
            lineGradient.addColorStop(0.5, 'rgba(30, 30, 30, 0.5)');
            lineGradient.addColorStop(1, 'rgba(20, 20, 20, 0)');
            
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Polished areas around gauges
        const gaugeX = [410, 820, 1024, 1230, 1640];
        gaugeX.forEach(x => {
            const polishGradient = ctx.createRadialGradient(x, 256, 60, x, 256, 120);
            polishGradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
            polishGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.01)');
            polishGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = polishGradient;
            ctx.fillRect(x - 120, 256 - 120, 240, 240);
        });
        
        // Edge polish
        const edgeGradient = ctx.createLinearGradient(0, 0, 0, 512);
        edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        edgeGradient.addColorStop(0.1, 'rgba(255, 255, 255, 0)');
        edgeGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0)');
        edgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        ctx.fillStyle = edgeGradient;
        ctx.fillRect(0, 0, 2048, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    
    createPearlNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base normal color (flat surface)
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 2048, 512);
        
        // Create pearl bump pattern for stingray
        const pearlSize = 8;
        const spacing = 12;
        
        // Create pearl bumps matching texture
        for (let x = 0; x < 2048; x += spacing) {
            for (let y = 0; y < 512; y += spacing) {
                const offsetX = x + (Math.random() - 0.5) * 4;
                const offsetY = y + (Math.random() - 0.5) * 4;
                const size = pearlSize + (Math.random() - 0.5) * 3;
                
                if (Math.random() > 0.9) continue;
                
                // Pearl bump with proper normal map colors
                const pearlGradient = ctx.createRadialGradient(
                    offsetX, offsetY, 0,
                    offsetX, offsetY, size
                );
                // Inverted for bump effect
                pearlGradient.addColorStop(0, '#b0b0ff');
                pearlGradient.addColorStop(0.3, '#a0a0ff');
                pearlGradient.addColorStop(0.6, '#9090ff');
                pearlGradient.addColorStop(1, '#8080ff');
                
                ctx.fillStyle = pearlGradient;
                ctx.beginPath();
                ctx.arc(offsetX, offsetY, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Diamond pattern normal
        const centerX = 1024;
        const centerY = 256;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const length = 100;
            const x2 = centerX + Math.cos(angle) * length;
            const y2 = centerY + Math.sin(angle) * length;
            
            ctx.strokeStyle = '#9090ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    
    createMinimalStitching(parent, width, height, depth) {
        // Elegant black thread for stingray leather
        const stitchMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0
        });
        
        const stitchGeometry = new THREE.BoxGeometry(0.04, 0.006, 0.003);
        
        // Only corner stitches - 4 per corner
        const cornerOffset = 0.3;
        const corners = [
            { x: -width/2 + cornerOffset, y: height/2 - cornerOffset },
            { x: width/2 - cornerOffset, y: height/2 - cornerOffset },
            { x: -width/2 + cornerOffset, y: -height/2 + cornerOffset },
            { x: width/2 - cornerOffset, y: -height/2 + cornerOffset }
        ];
        
        corners.forEach(corner => {
            // Horizontal stitches
            for (let i = 0; i < 4; i++) {
                const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
                stitch.position.set(corner.x + i * 0.08, corner.y, depth/2 + 0.01);
                parent.add(stitch);
            }
            // Vertical stitches
            for (let i = 0; i < 4; i++) {
                const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
                stitch.position.set(corner.x, corner.y + i * 0.08, depth/2 + 0.01);
                stitch.rotation.z = Math.PI / 2;
                parent.add(stitch);
            }
        });
    }
    
    createStitching(parent, width, height, depth) {
        // Create thread material with slight variations
        const threadColors = [0xc9a961, 0xd4b26c, 0xbf9f57];
        const stitchMaterials = threadColors.map(color => new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.03,
            roughness: 0.95,
            metalness: 0.1
        }));
        
        // Stitch geometry variations for realism
        const stitchGeometries = [
            new THREE.CylinderGeometry(0.012, 0.012, 0.11),
            new THREE.CylinderGeometry(0.013, 0.013, 0.115),
            new THREE.CylinderGeometry(0.014, 0.014, 0.12)
        ];
        
        // Create stitch holes (indentations)
        const holeGeometry = new THREE.CircleGeometry(0.02, 8);
        const holeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0805,
            roughness: 1,
            metalness: 0
        });
        
        const stitchSpacing = 0.5; // Increased spacing for fewer stitches
        const doubleStitchOffset = 0.06; // Smaller distance for subtler double stitch
        
        // Helper function to create a single stitch with variation
        const createSingleStitch = (x, y, z, isDouble = false, lineOffset = 0) => {
            // Random variations
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
            const heightVar = (Math.random() - 0.5) * 0.01;
            const xVar = (Math.random() - 0.5) * 0.005;
            const materialIndex = Math.floor(Math.random() * stitchMaterials.length);
            const geoIndex = Math.floor(Math.random() * stitchGeometries.length);
            
            // Create stitch hole
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);
            hole.position.set(x + xVar, y + lineOffset, z - 0.02);
            hole.rotation.x = -Math.PI / 2;
            parent.add(hole);
            
            // Create thread
            const stitch = new THREE.Mesh(stitchGeometries[geoIndex], stitchMaterials[materialIndex]);
            stitch.position.set(x + xVar, y + lineOffset + heightVar, z);
            stitch.rotation.z = angle;
            stitch.castShadow = true;
            parent.add(stitch);
            
            // Add slight thread fraying
            if (Math.random() < 0.15) {
                const frayGeometry = new THREE.ConeGeometry(0.008, 0.03, 4);
                const fray = new THREE.Mesh(frayGeometry, stitchMaterials[materialIndex]);
                fray.position.set(x + xVar, y + lineOffset + heightVar, z + 0.06);
                fray.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
                fray.rotation.z = Math.random() * Math.PI * 2;
                parent.add(fray);
            }
        };
        
        // Top single stitching (not double anymore for cleaner look)
        const topStitchCount = Math.floor(width / stitchSpacing);
        for (let i = 0; i < topStitchCount; i++) {
            const x = (i / (topStitchCount - 1)) * (width - 1) - (width - 1) / 2;
            // Slight irregularity in spacing
            const spacingVar = (Math.random() - 0.5) * 0.02;
            
            // Single stitch line only
            createSingleStitch(x + spacingVar, height/2 - 0.25, depth/2 + 0.05);
        }
        
        // Bottom single stitching
        for (let i = 0; i < topStitchCount; i++) {
            const x = (i / (topStitchCount - 1)) * (width - 1) - (width - 1) / 2;
            const spacingVar = (Math.random() - 0.5) * 0.02;
            
            // Single stitch line only
            createSingleStitch(x + spacingVar, -height/2 + 0.25, depth/2 + 0.05);
        }
        
        // Remove decorative corner stitching for cleaner look
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
        if (this.gaugeStyle === 'supreme') {
            return this.createSupremeDialTexture(metric);
        }
        return this.createClassicDialTexture(metric);
    }
    
    createClassicDialTexture(metric) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Background with multiple gradient layers
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 512, 512);
        
        // Primary radial gradient
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(0.5, '#151515');
        gradient.addColorStop(0.7, '#0f0f0f');
        gradient.addColorStop(1, '#050505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add subtle circular brushed metal texture
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 0.5;
        for (let r = 20; r < 250; r += 3) {
            ctx.beginPath();
            ctx.arc(256, 256, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Outer decorative ring
        ctx.strokeStyle = '#c9a961';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(256, 256, 210, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(256, 256, 208, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner decorative ring
        ctx.beginPath();
        ctx.arc(256, 256, 145, 0, Math.PI * 2);
        ctx.stroke();
        
        // Major tick marks with enhanced detail
        for (let i = 0; i <= 10; i++) {
            const angle = (i / 10) * Math.PI * 1.5 - Math.PI * 1.25;
            const innerRadius = 200;
            const outerRadius = i % 2 === 0 ? 175 : 185;
            
            // Main tick
            ctx.strokeStyle = '#c9a961';
            ctx.lineWidth = i % 2 === 0 ? 3 : 2;
            
            const x1 = 256 + Math.cos(angle) * innerRadius;
            const y1 = 256 + Math.sin(angle) * innerRadius;
            const x2 = 256 + Math.cos(angle) * outerRadius;
            const y2 = 256 + Math.sin(angle) * outerRadius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Add diamond markers at major ticks
            if (i % 2 === 0) {
                const markerX = 256 + Math.cos(angle) * 165;
                const markerY = 256 + Math.sin(angle) * 165;
                
                ctx.save();
                ctx.translate(markerX, markerY);
                ctx.rotate(angle + Math.PI / 2);
                ctx.fillStyle = '#c9a961';
                ctx.beginPath();
                ctx.moveTo(0, -3);
                ctx.lineTo(2, 0);
                ctx.lineTo(0, 3);
                ctx.lineTo(-2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
        
        // Minor tick marks
        ctx.strokeStyle = '#8a7641';
        ctx.lineWidth = 1;
        for (let i = 0; i < 50; i++) {
            if (i % 5 !== 0) { // Skip major tick positions
                const angle = (i / 50) * Math.PI * 1.5 - Math.PI * 1.25;
                const innerRadius = 200;
                const outerRadius = 192;
                
                const x1 = 256 + Math.cos(angle) * innerRadius;
                const y1 = 256 + Math.sin(angle) * innerRadius;
                const x2 = 256 + Math.cos(angle) * outerRadius;
                const y2 = 256 + Math.sin(angle) * outerRadius;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        
        // Numbers with better typography
        ctx.fillStyle = '#c9a961';
        ctx.font = '600 24px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= 10; i += 2) {
            const angle = (i / 10) * Math.PI * 1.5 - Math.PI * 1.25;
            const labelX = 256 + Math.cos(angle) * 155;
            const labelY = 256 + Math.sin(angle) * 155;
            
            // Add subtle shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText((i * 10).toString(), labelX + 1, labelY + 1);
            ctx.fillStyle = '#c9a961';
            ctx.fillText((i * 10).toString(), labelX, labelY);
        }
        
        // Central value display area - enlarged with decorative border
        const valueBoxY = 320;
        const valueBoxHeight = 80;
        
        // Decorative frame for value
        ctx.strokeStyle = '#c9a961';
        ctx.lineWidth = 2;
        ctx.strokeRect(156, valueBoxY - 10, 200, valueBoxHeight);
        
        // Corner decorations
        const corners = [
            { x: 156, y: valueBoxY - 10 },
            { x: 356, y: valueBoxY - 10 },
            { x: 156, y: valueBoxY + valueBoxHeight - 10 },
            { x: 356, y: valueBoxY + valueBoxHeight - 10 }
        ];
        
        corners.forEach(corner => {
            ctx.fillStyle = '#c9a961';
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Current value - much larger
        ctx.font = 'bold 56px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Value shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(metric.value.toString(), 257, valueBoxY + 31);
        
        // Value highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillText(metric.value.toString(), 256, valueBoxY + 30);
        
        // Label with better styling
        ctx.font = '300 16px Georgia, serif';
        ctx.fillStyle = '#8a7641';
        ctx.letterSpacing = '2px';
        ctx.fillText(metric.label.toUpperCase(), 256, valueBoxY - 35);
        
        // Progress percentage in small text
        const progress = Math.round((metric.value / metric.target) * 100);
        ctx.font = '14px Georgia, serif';
        ctx.fillStyle = '#666666';
        ctx.fillText(`${progress}% OF TARGET`, 256, valueBoxY + 65);
        
        // Add guilloche pattern in corners
        this.drawGuilloche(ctx, 60, 60, 40);
        this.drawGuilloche(ctx, 452, 60, 40);
        this.drawGuilloche(ctx, 60, 452, 40);
        this.drawGuilloche(ctx, 452, 452, 40);
        
        return canvas;
    }
    
    drawGuilloche(ctx, centerX, centerY, size) {
        ctx.save();
        ctx.strokeStyle = 'rgba(201, 169, 97, 0.15)';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * size * 0.5;
            const y = centerY + Math.sin(angle) * size * 0.5;
            
            ctx.beginPath();
            ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    createSupremeDialTexture(metric) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Pure black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);
        
        // LED segments for value display
        const progress = metric.value / metric.target;
        const segments = 20;
        const segmentAngle = (Math.PI * 1.5) / segments;
        const startAngle = -Math.PI * 1.25;
        
        for (let i = 0; i < segments; i++) {
            const angle = startAngle + i * segmentAngle;
            const lit = i / segments <= progress;
            
            // LED color based on progress
            if (lit) {
                if (progress > 0.8) {
                    ctx.strokeStyle = '#00ff00'; // Green
                    ctx.shadowColor = '#00ff00';
                } else if (progress > 0.5) {
                    ctx.strokeStyle = '#ffd700'; // Gold
                    ctx.shadowColor = '#ffd700';
                } else {
                    ctx.strokeStyle = '#ff4400'; // Orange-red
                    ctx.shadowColor = '#ff4400';
                }
                ctx.shadowBlur = 20;
                ctx.lineWidth = 8;
            } else {
                ctx.strokeStyle = '#222222';
                ctx.shadowBlur = 0;
                ctx.lineWidth = 6;
            }
            
            const innerRadius = 180;
            const outerRadius = 200;
            
            const x1 = 256 + Math.cos(angle) * innerRadius;
            const y1 = 256 + Math.sin(angle) * innerRadius;
            const x2 = 256 + Math.cos(angle) * outerRadius;
            const y2 = 256 + Math.sin(angle) * outerRadius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        
        // Enhanced digital display area
        const displayY = 280;
        const displayHeight = 100;
        
        // Main display panel with gradient
        const displayGradient = ctx.createLinearGradient(0, displayY - 50, 0, displayY + displayHeight);
        displayGradient.addColorStop(0, '#0a0a0a');
        displayGradient.addColorStop(0.5, '#111111');
        displayGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = displayGradient;
        ctx.fillRect(106, displayY - 50, 300, displayHeight);
        
        // LED display frame
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(106, displayY - 50, 300, displayHeight);
        
        // Inner frame
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.strokeRect(110, displayY - 46, 292, displayHeight - 8);
        
        // Grid overlay for LCD effect
        ctx.globalAlpha = 0.1;
        for (let y = displayY - 45; y < displayY + displayHeight - 10; y += 2) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(115, y);
            ctx.lineTo(397, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Digital value - extra large
        ctx.font = 'bold 72px Monaco, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const valueColor = progress > 0.8 ? '#00ff00' : progress > 0.5 ? '#ffd700' : '#ff4400';
        
        // Multiple glow layers for intensity
        ctx.shadowColor = valueColor;
        ctx.shadowBlur = 30;
        ctx.fillStyle = valueColor;
        ctx.fillText(metric.value.toString(), 256, displayY);
        
        ctx.shadowBlur = 20;
        ctx.fillText(metric.value.toString(), 256, displayY);
        
        ctx.shadowBlur = 10;
        ctx.fillText(metric.value.toString(), 256, displayY);
        
        // Decimal point indicator
        ctx.fillStyle = valueColor;
        ctx.fillRect(256 + ctx.measureText(metric.value.toString()).width/2 + 5, displayY + 15, 4, 4);
        
        // Progress bar underneath value
        const barWidth = 200;
        const barHeight = 8;
        const barX = 156;
        const barY = displayY + 40;
        
        // Bar background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Bar fill
        const fillGradient = ctx.createLinearGradient(barX, 0, barX + barWidth * progress, 0);
        fillGradient.addColorStop(0, valueColor);
        fillGradient.addColorStop(1, valueColor);
        ctx.fillStyle = fillGradient;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Bar segments
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            const x = barX + (barWidth / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, barY);
            ctx.lineTo(x, barY + barHeight);
            ctx.stroke();
        }
        
        // Percentage with better styling
        ctx.font = 'bold 20px Monaco, monospace';
        ctx.fillStyle = '#888888';
        ctx.shadowBlur = 0;
        ctx.fillText(`${Math.round(progress * 100)}%`, 180, displayY - 80);
        
        // Target
        ctx.font = '16px Monaco, monospace';
        ctx.fillStyle = '#666666';
        ctx.fillText(`TARGET`, 330, displayY - 90);
        ctx.font = 'bold 20px Monaco, monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText(metric.target.toString(), 330, displayY - 70);
        
        // Label at top
        ctx.font = 'bold 18px Monaco, monospace';
        ctx.fillStyle = '#aaaaaa';
        ctx.letterSpacing = '3px';
        ctx.fillText(metric.label.toUpperCase(), 256, 180);
        
        // Status indicator
        const status = progress >= 0.9 ? 'OPTIMAL' : progress >= 0.7 ? 'GOOD' : progress >= 0.5 ? 'FAIR' : 'LOW';
        ctx.font = '14px Monaco, monospace';
        ctx.fillStyle = valueColor;
        ctx.fillText(`[ ${status} ]`, 256, displayY - 120);
        
        // Corner markers
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        const corners = [
            { x: 20, y: 20 },
            { x: 492, y: 20 },
            { x: 20, y: 492 },
            { x: 492, y: 492 }
        ];
        
        corners.forEach(corner => {
            ctx.beginPath();
            ctx.moveTo(corner.x - 10, corner.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(corner.x, corner.y - 10);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(corner.x + 10, corner.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(corner.x, corner.y + 10);
            ctx.stroke();
        });
        
        return canvas;
    }
    
    createNeedle(progress) {
        const needleGroup = new THREE.Group();
        
        if (this.gaugeStyle === 'supreme') {
            // Digital/minimal needle for supreme style
            const shaftGeometry = new THREE.BoxGeometry(0.015, 0.9, 0.01);
            shaftGeometry.translate(0, 0.45, 0);
            
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: progress > 0.8 ? 0x00ff00 : progress > 0.5 ? 0xffd700 : 0xff4400,
                transparent: true,
                opacity: 0.9
            });
            
            const shaft = new THREE.Mesh(shaftGeometry, glowMaterial);
            needleGroup.add(shaft);
            
            // Glowing tip
            const tipGeometry = new THREE.CircleGeometry(0.04, 16);
            tipGeometry.translate(0, 0.9, 0);
            const tip = new THREE.Mesh(tipGeometry, glowMaterial);
            needleGroup.add(tip);
            
            // Digital center
            const capGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 32);
            const capMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                metalness: 1,
                roughness: 0.1,
                emissive: glowMaterial.color,
                emissiveIntensity: 0.1
            });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.rotation.x = Math.PI / 2;
            needleGroup.add(cap);
        } else {
            // Classic needle design
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
        }
        
        // Set initial rotation
        const targetAngle = progress * Math.PI * 1.5 - Math.PI * 1.25;
        needleGroup.userData.targetRotation = targetAngle;
        needleGroup.userData.currentRotation = -Math.PI * 1.25;
        needleGroup.userData.velocity = 0;
        needleGroup.userData.springConstant = 0.08; // Reduced for heavier feel
        needleGroup.userData.damping = 0.92; // Increased for more weight
        needleGroup.userData.progress = progress;
        needleGroup.userData.isInitialized = false;
        needleGroup.userData.initDelay = 0;
        needleGroup.userData.initSpins = 1;
        needleGroup.userData.initDuration = 2;
        
        needleGroup.rotation.z = -Math.PI * 1.25;
        
        return needleGroup;
    }
    
    setupLighting() {
        // Ambient light - much brighter for leather visibility
        const ambientLight = new THREE.AmbientLight(0x666666, 1.2);
        this.scene.add(ambientLight);
        
        // Key light - main illumination - increased
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
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
        
        // Fill light - warm tone - much brighter
        const fillLight = new THREE.DirectionalLight(0xc9a961, 1.0);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
        
        // Rim light - reduced for less blue tint
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, -5, -10);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
        
        // Spot light on panel - much brighter
        const spotLight = new THREE.SpotLight(0xffffff, 1.2);
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
        
        // Track mouse for needle hover
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        
        this.canvas.addEventListener('click', (e) => this.onGaugeClick(e));
        
        // Gauge style selector
        const styleBtns = document.querySelectorAll('.style-btn');
        styleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.onStyleChange(e));
        });
        
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
        if (e.touches.length === 1) {
            // Update touch position for gauge hover
            this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            this.checkGaugeHover();
            
            if (this.isDragging) {
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
        // Update mouse position for raycasting
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        // Check for gauge hover
        this.checkGaugeHover();
        
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
    
    checkGaugeHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Reset all hover states
        this.needles.forEach(needle => {
            needle.userData.isHovered = false;
        });
        
        // Check each gauge for intersection
        this.gauges.forEach((gauge, index) => {
            const intersects = this.raycaster.intersectObject(gauge, true);
            if (intersects.length > 0) {
                this.needles[index].userData.isHovered = true;
                
                // Add instant response jitter
                const jitter = (Math.random() - 0.5) * 0.03;
                this.needles[index].rotation.z += jitter;
            }
        });
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
    
    onStyleChange(e) {
        const newStyle = e.target.dataset.style;
        if (newStyle === this.gaugeStyle) return;
        
        // Update active button
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        this.gaugeStyle = newStyle;
        
        // Update all gauge dials
        this.gauges.forEach((gauge, index) => {
            const metric = Object.keys(this.metrics)[index];
            const dialCanvas = this.createDialTexture(this.metrics[metric]);
            const dialTexture = new THREE.CanvasTexture(dialCanvas);
            
            // Find the dial mesh in the gauge group
            gauge.traverse(child => {
                if (child.isMesh && child.geometry.type === 'CircleGeometry' && child.material.map) {
                    child.material.map.dispose();
                    child.material.map = dialTexture;
                    child.material.needsUpdate = true;
                }
            });
        });
        
        // Update gauge bezels for supreme style
        if (newStyle === 'supreme') {
            this.updateGaugeBezelsSupreme();
        } else {
            this.updateGaugeBezelsClassic();
        }
        
        // Recreate needles with new style
        this.updateNeedles();
    }
    
    updateGaugeBezelsSupreme() {
        this.gauges.forEach(gauge => {
            gauge.traverse(child => {
                // Update bezel to black/dark style
                if (child.isMesh && child.geometry.type === 'TorusGeometry') {
                    child.material.color.setHex(0x111111);
                    child.material.metalness = 0.9;
                    child.material.roughness = 0.1;
                    child.material.emissive = new THREE.Color(0xffd700);
                    child.material.emissiveIntensity = 0.02;
                }
                // Update bolts to darker style
                if (child.isMesh && child.geometry.type === 'CylinderGeometry' && child.scale.x < 0.1) {
                    child.material.color.setHex(0x222222);
                    child.material.metalness = 1;
                    child.material.roughness = 0.3;
                }
            });
        });
    }
    
    updateGaugeBezelsClassic() {
        this.gauges.forEach(gauge => {
            gauge.traverse(child => {
                // Restore classic bezel style
                if (child.isMesh && child.geometry.type === 'TorusGeometry') {
                    child.material.color.setHex(0x2a2a2a);
                    child.material.metalness = 0.95;
                    child.material.roughness = 0.2;
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
                // Restore classic bolts
                if (child.isMesh && child.geometry.type === 'CylinderGeometry' && child.scale.x < 0.1) {
                    child.material.color.setHex(0x888888);
                    child.material.metalness = 1;
                    child.material.roughness = 0.2;
                }
            });
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
    
    initializeNeedles() {
        // Create an elaborate synchronized choreography
        const timeline = gsap.timeline();
        
        // Store final positions for each needle
        const finalPositions = this.needles.map((needle, index) => {
            const metric = this.metrics[Object.keys(this.metrics)[index]];
            return (metric.value / metric.target) * Math.PI * 1.5 - Math.PI * 1.25;
        });
        
        // Phase 1: All needles sweep to max position in sequence (wave effect)
        this.needles.forEach((needle, index) => {
            needle.userData.isInitialized = false;
            timeline.to(needle.rotation, {
                z: Math.PI * 0.25, // All go to max
                duration: 0.4,
                ease: "power2.inOut",
                delay: index * 0.08 // Cascade effect
            }, index * 0.08);
        });
        
        // Phase 2: Hold at max, then sweep to minimum in reverse order
        timeline.to({}, { duration: 0.3 }); // Pause
        
        this.needles.slice().reverse().forEach((needle, index) => {
            timeline.to(needle.rotation, {
                z: -Math.PI * 1.25, // All go to min
                duration: 0.5,
                ease: "power3.inOut",
                delay: index * 0.06
            }, 1.2 + index * 0.06);
        });
        
        // Phase 3: Synchronized full spin
        timeline.to({}, { duration: 0.2 }); // Small pause
        
        this.needles.forEach((needle) => {
            timeline.to(needle.rotation, {
                z: -Math.PI * 1.25 + Math.PI * 2, // Full rotation
                duration: 1.2,
                ease: "power2.inOut"
            }, 2.5); // All at same time
        });
        
        // Phase 4: Fan out pattern - alternating high/low
        this.needles.forEach((needle, index) => {
            const target = index % 2 === 0 ? Math.PI * 0.25 : -Math.PI * 0.75;
            timeline.to(needle.rotation, {
                z: target,
                duration: 0.6,
                ease: "back.out(1.7)"
            }, 3.8);
        });
        
        // Phase 5: Converge to center then explode to final positions
        timeline.to({}, { duration: 0.3 });
        
        // First converge to center
        this.needles.forEach((needle) => {
            timeline.to(needle.rotation, {
                z: -Math.PI * 0.5, // Center position
                duration: 0.8,
                ease: "power3.in"
            }, 4.7);
        });
        
        // Phase 6: Final dramatic reveal - explode to actual values
        this.needles.forEach((needle, index) => {
            const finalAngle = finalPositions[index];
            
            // Dramatic overshoot based on position
            const overshootAmount = 0.3 * (1 - Math.abs(finalAngle) / (Math.PI * 0.75));
            
            timeline.to(needle.rotation, {
                z: finalAngle + overshootAmount,
                duration: 0.8,
                ease: "expo.out",
                onStart: () => {
                    // Add glow effect during final movement
                    if (this.gaugeStyle === 'supreme') {
                        gsap.to(needle.children[0].material, {
                            opacity: 1,
                            duration: 0.3
                        });
                    }
                }
            }, 5.6 + index * 0.05);
            
            // Settle to exact position
            timeline.to(needle.rotation, {
                z: finalAngle,
                duration: 0.6,
                ease: "elastic.out(1.5, 0.5)",
                onComplete: () => {
                    needle.userData.isInitialized = true;
                    needle.userData.currentRotation = finalAngle;
                    needle.userData.targetRotation = finalAngle;
                }
            }, 6.5 + index * 0.05);
        });
        
        // Add scale animations throughout for weight
        this.needles.forEach((needle, index) => {
            // Subtle scale during spins
            gsap.to(needle.scale, {
                x: 1.03,
                y: 0.97,
                duration: 2,
                ease: "sine.inOut",
                yoyo: true,
                repeat: 2,
                delay: index * 0.1
            });
        });
        
        // Add camera subtle zoom during finale
        timeline.to(this.camera.position, {
            z: 14,
            duration: 1,
            ease: "power2.inOut"
        }, 5.5);
        
        timeline.to(this.camera.position, {
            z: 15,
            duration: 0.8,
            ease: "power2.out"
        }, 6.5);
    }
    
    updateNeedles() {
        // Recreate all needles with current style
        this.needles = [];
        this.gauges.forEach((gauge, index) => {
            const metric = Object.keys(this.metrics)[index];
            const progress = this.metrics[metric].value / this.metrics[metric].target;
            
            // Remove old needle
            const oldNeedle = gauge.children.find(child => child.userData.targetRotation !== undefined);
            if (oldNeedle) {
                gauge.remove(oldNeedle);
            }
            
            // Create new needle
            const needle = this.createNeedle(progress);
            needle.position.z = 0.17;
            gauge.add(needle);
            this.needles.push(needle);
        });
    }
    
    updateNeedlePhysics(deltaTime) {
        this.needles.forEach((needle, index) => {
            // Skip physics if needle is still initializing
            if (!needle.userData.isInitialized) return;
            
            const targetRotation = needle.userData.targetRotation;
            const currentRotation = needle.userData.currentRotation;
            const velocity = needle.userData.velocity;
            
            // Spring physics with heavy damping
            const force = (targetRotation - currentRotation) * needle.userData.springConstant;
            needle.userData.velocity = (velocity + force) * needle.userData.damping;
            needle.userData.currentRotation += needle.userData.velocity;
            
            needle.rotation.z = needle.userData.currentRotation;
            
            // Constant pulsation - each needle has slightly different frequency
            const time = Date.now() * 0.001;
            const pulseFreq = 2 + index * 0.3; // Different frequency for each gauge
            const pulseAmount = 0.015; // Reduced for more subtle movement
            const pulse = Math.sin(time * pulseFreq) * pulseAmount;
            
            // Micro vibration that's always active
            const vibration = Math.sin(time * 15 + index) * 0.002;
            
            // Hovering amplification
            const hoverAmplification = needle.userData.isHovered ? 2.5 : 1;
            
            // Apply all movements with smooth interpolation
            needle.rotation.z += (pulse + vibration) * hoverAmplification;
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
        this.updateNeedlePhysics(deltaTime);
        
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