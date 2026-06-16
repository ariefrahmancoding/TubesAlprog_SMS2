/**
 * HYDROGUARD ADVANCED APPLICATION CONTROLLER (PHASE 3)
 * Handles View Routing, Visual Biometrics (Face Lock), Chart.js, Leaflet Map, AI Engine, and RBAC
 */

class HydroGuardApp {
    constructor() {
        this.views = {
            landing: document.getElementById('landing-view'),
            login: document.getElementById('login-view'),
            register: document.getElementById('register-view'),
            dashboard: document.getElementById('dashboard-view')
        };
        
        // UI Elements
        this.uiWaterLevel = document.getElementById('val-water-level');
        this.uiRainfall = document.getElementById('val-rainfall');
        this.uiFuzzyBadge = document.getElementById('badge-fuzzy');
        this.uiAiExplanation = document.getElementById('txt-ai-explanation');
        this.uiNnProgress = document.getElementById('nn-progress');
        this.uiNnPercent = document.getElementById('nn-percentage');
        
        this.uiWeatherIcon = document.getElementById('icon-weather');
        this.uiWeatherText = document.getElementById('val-weather');
        
        // Roles
        this.rolePanels = {
            warga: document.getElementById('role-panel-warga'),
            petugas: document.getElementById('role-panel-petugas'),
            admin: document.getElementById('role-panel-admin')
        };
        this.lblActiveRole = document.getElementById('lbl-active-role');
        this.lblActiveName = document.getElementById('lbl-active-name');
        
        this.lblLoginRole = document.getElementById('lbl-login-role');

        // Webcam Elements
        this.videoElement = document.getElementById('webcam-feed');
        this.webcamStatus = document.getElementById('webcam-status');
        this.webcamOverlay = document.getElementById('webcam-overlay');
        this.btnAuth = document.getElementById('btn-auth');
        
        // Face Lock Anim Elements (Login)
        this.faceLockBox = document.getElementById('face-lock-box');
        this.scanText = document.getElementById('scan-text');

        // Register Elements
        this.regVideoElement = document.getElementById('reg-webcam-feed');
        this.regWebcamStatus = document.getElementById('reg-webcam-status');
        this.regFaceLockBox = document.getElementById('reg-face-lock-box');
        this.regScanText = document.getElementById('reg-scan-text');
        this.btnReg = document.getElementById('btn-reg');

        this.mediaStream = null;
        this.simulationTimer = null;
        
        // Sensor state
        this.sensors = { water: 0.8, rain: 10.0, soil: 40.0 };
        this.trend = 1; // 1 = rising, -1 = falling
        this.historyData = { labels: [], water: [], rain: [] };
        
        this.map = null;
        this.chart = null;
        this.activeRole = 'warga'; // Default
        
        // Inisialisasi Mock DB jika kosong
        if(!localStorage.getItem('hydroUsers')) {
            localStorage.setItem('hydroUsers', JSON.stringify({}));
        }

        this.isFaceApiLoaded = false;
        this.initFaceAPI();
    }

    async initFaceAPI() {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            this.isFaceApiLoaded = true;
            console.log("Face API Models loaded successfully.");
        } catch(e) {
            console.error("Failed to load Face API models:", e);
        }
    }

    // ==========================================
    // ROUTING & LIFECYCLE
    // ==========================================
    navigate(viewName) {
        Object.values(this.views).forEach(v => v.classList.add('hidden'));
        if(this.views[viewName]) {
            this.views[viewName].classList.remove('hidden');
        }

        if(viewName === 'dashboard') {
            this.stopCamera();
            this.initDashboard();
        } else if (viewName === 'login') {
            this.stopSimulation();
            this.startCameraAndScanner('login');
        } else if (viewName === 'register') {
            this.stopSimulation();
            this.startCameraAndScanner('register');
        } else {
            this.stopSimulation();
            this.stopCamera();
        }
    }

    // ==========================================
    // AUTHENTICATION & REGISTRATION (Local DB)
    // ==========================================
    prepareLogin(role) {
        this.activeRole = role;
        let roleName = role === 'warga' ? "Warga Sipil" : (role === 'petugas' ? "Petugas BPBD" : "Administrator IT");
        this.lblLoginRole.innerText = roleName.toUpperCase();
        
        // Bersihkan input sebelumnya
        document.getElementById('login-username').value = "";
        
        this.navigate('login');
    }

    async registerUser() {
        if (!this.mediaStream) {
            alert("Kamera tidak aktif. Harap izinkan akses kamera untuk merekam biometrik.");
            return;
        }

        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const role = document.getElementById('reg-role').value;

        if(!username || !password) {
            alert("Harap lengkapi Username dan Password Anda!");
            return;
        }

        // C# MySQL Database Interop
        let isSuccess = false;
        try {
            isSuccess = await DotNet.invokeMethodAsync('HydroGuard', 'RegisterUserAsync', username, password, role);
        } catch (e) {
            console.error("C# Interop Error: ", e);
            alert("Gagal terhubung ke Backend C# MySQL. Pastikan XAMPP menyala.");
            return;
        }

        if(!isSuccess) {
            alert("Registrasi Gagal! Username mungkin sudah terdaftar di Database MySQL.");
            return;
        }

        // Mulai proses scanning Computer Vision (Face Lock Register)
        this.btnReg.disabled = true;
        this.btnReg.innerText = "Mendeteksi Wajah (Image Processing)...";
        
        this.regFaceLockBox.className = "face-lock-scanning";
        this.regFaceLockBox.style.borderColor = "";
        this.regScanText.style.display = 'block';
        this.regScanText.innerText = "MENCARI POLA WAJAH...";
        this.regScanText.style.color = "#FFF";

        if (this.isFaceApiLoaded && this.regVideoElement) {
            const detection = await faceapi.detectSingleFace(this.regVideoElement, new faceapi.TinyFaceDetectorOptions());
            if (!detection) {
                this.regFaceLockBox.className = "face-lock-idle";
                this.regFaceLockBox.style.borderColor = "var(--danger-red)";
                this.regScanText.innerText = "GAGAL: WAJAH MANUSIA TIDAK DITEMUKAN!";
                this.regScanText.style.color = "var(--danger-red)";
                this.btnReg.disabled = false;
                this.btnReg.innerText = "Posisikan Wajah & Ulangi";
                return;
            }
        } else {
            // Fallback or still loading
            console.warn("Face API not loaded yet, using simulated scan.");
            await new Promise(r => setTimeout(r, 1000));
        }

        // Sukses Lock
        this.regFaceLockBox.className = "face-lock-success";
        this.regScanText.innerText = "WAJAH TERDETEKSI & TEREKAM SUKSES";
        this.regScanText.style.color = "var(--safe-green)";
        
        setTimeout(() => {
            this.btnReg.disabled = false;
            this.btnReg.innerText = "Rekam Wajah & Buat Akun";
            
            alert("Registrasi Berhasil! Data Anda telah masuk ke MySQL XAMPP.");
            this.prepareLogin(role);
        }, 1500);
    }

    logout() {
        if(confirm("Apakah Anda yakin ingin keluar dari Command Center?")) {
            this.navigate('landing');
        }
    }

    // ==========================================
    // BIOMETRIC SCANNER (FACE LOCK ANIMATION)
    // ==========================================
    async startCameraAndScanner(mode = 'login') {
        // Reset animasi sesuai mode
        if (mode === 'login') {
            this.faceLockBox.className = "face-lock-idle";
            this.scanText.style.display = 'none';
        } else {
            this.regFaceLockBox.className = "face-lock-idle";
            this.regScanText.style.display = 'none';
        }
        
        try {
            // 1. Request Webcam
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            
            if (mode === 'login') {
                this.videoElement.srcObject = this.mediaStream;
                this.webcamStatus.innerText = "Kamera aktif. Posisikan wajah Anda dalam bingkai.";
                this.webcamStatus.style.color = "var(--safe-green)";
                this.btnAuth.disabled = false;
            } else {
                this.regVideoElement.srcObject = this.mediaStream;
                this.regWebcamStatus.innerText = "Kamera aktif. Posisikan wajah Anda untuk perekaman.";
                this.regWebcamStatus.style.color = "var(--safe-green)";
                this.btnReg.disabled = false;
            }
        } catch (err) {
            console.error("Camera error:", err);
            if (mode === 'login') {
                this.webcamStatus.innerText = "Gagal mengakses kamera. Mohon izinkan kamera pada browser.";
                this.webcamStatus.style.color = "var(--danger-red)";
                this.btnAuth.disabled = true;
            } else {
                this.regWebcamStatus.innerText = "Gagal mengakses kamera. Mohon izinkan kamera pada browser.";
                this.regWebcamStatus.style.color = "var(--danger-red)";
                this.btnReg.disabled = true;
            }
        }
    }

    stopCamera() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
            this.videoElement.srcObject = null;
            this.regVideoElement.srcObject = null;
        }
    }

    async authenticate() {
        if (!this.mediaStream) {
            alert("Kamera tidak aktif. Harap izinkan akses kamera terlebih dahulu.");
            return;
        }

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        if(!username || !password) {
            alert("Silakan masukkan Username dan Password Anda!");
            return;
        }

        // C# MySQL Database Interop
        let verifiedRole = "";
        try {
            verifiedRole = await DotNet.invokeMethodAsync('HydroGuard', 'LoginUserAsync', username, password);
        } catch (e) {
            console.error("C# Interop Error: ", e);
            alert("Gagal terhubung ke Backend C# MySQL. Pastikan XAMPP menyala.");
            return;
        }

        if(!verifiedRole) {
            alert("AKUN TIDAK DITEMUKAN ATAU PASSWORD SALAH!\nSilakan cek kembali kredensial Anda.");
            return;
        }

        if(verifiedRole !== this.activeRole) {
            alert(`Akses Ditolak! Anda terdaftar sebagai ${verifiedRole}, bukan ${this.activeRole}.`);
            return;
        }

        // Mulai proses scanning Computer Vision (Face Lock)
        this.btnAuth.disabled = true;
        this.btnAuth.innerText = "Mendeteksi Wajah (Image Processing)...";
        
        this.faceLockBox.className = "face-lock-scanning";
        this.faceLockBox.style.borderColor = "";
        this.scanText.style.display = 'block';
        this.scanText.innerText = "MENCARI WAJAH...";
        this.scanText.style.color = "#FFF";

        if (this.isFaceApiLoaded && this.videoElement) {
            const detection = await faceapi.detectSingleFace(this.videoElement, new faceapi.TinyFaceDetectorOptions());
            if (!detection) {
                this.faceLockBox.className = "face-lock-idle";
                this.faceLockBox.style.borderColor = "var(--danger-red)";
                this.scanText.innerText = "GAGAL: WAJAH MANUSIA TIDAK DITEMUKAN!";
                this.scanText.style.color = "var(--danger-red)";
                this.btnAuth.disabled = false;
                this.btnAuth.innerText = "Posisikan Wajah & Coba Lagi";
                return;
            }
            
            // === ADAPTIVE THRESHOLDING VISUAL EFFECT ===
            this.scanText.innerText = "EKSTRAKSI GRAYSCALE...";
            const loginCanvas = document.getElementById('login-canvas');
            if(loginCanvas) {
                loginCanvas.style.display = 'block';
                loginCanvas.width = this.videoElement.videoWidth;
                loginCanvas.height = this.videoElement.videoHeight;
                const ctx = loginCanvas.getContext('2d');
                // 1. Draw video frame
                ctx.drawImage(this.videoElement, 0, 0, loginCanvas.width, loginCanvas.height);
                
                // 2. Convert to Grayscale
                let imgData = ctx.getImageData(0,0,loginCanvas.width, loginCanvas.height);
                let d = imgData.data;
                let grayData = new Uint8Array(loginCanvas.width * loginCanvas.height);
                for(let i=0; i<d.length; i+=4) {
                    let gray = d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114;
                    grayData[i/4] = gray;
                    d[i] = gray; d[i+1] = gray; d[i+2] = gray; // draw grayscale
                }
                ctx.putImageData(imgData, 0, 0);
                await new Promise(r => setTimeout(r, 800)); // wait to show grayscale
                
                // 3. Adaptive Thresholding (Binary Picture)
                this.scanText.innerText = "THRESHOLDING BINER...";
                for(let i=0; i<d.length; i+=4) {
                    let val = grayData[i/4] > 100 ? 255 : 0; // simple binary threshold
                    // Make the dark pixels slightly cyan to look cool
                    if(val === 0) {
                        d[i] = 0; d[i+1] = 200; d[i+2] = 255;
                    } else {
                        d[i] = 255; d[i+1] = 255; d[i+2] = 255;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                await new Promise(r => setTimeout(r, 1200)); // wait to show binary
                loginCanvas.style.display = 'none'; // hide canvas
            }
            // ==========================================

        } else {
            console.warn("Face API not loaded yet, using simulated scan.");
            await new Promise(r => setTimeout(r, 1000));
        }

        // Sukses Lock
        this.faceLockBox.className = "face-lock-success";
        this.scanText.innerText = "WAJAH TERDETEKSI - AKSES DITERIMA";
        this.scanText.style.color = "var(--safe-green)";
        
        setTimeout(() => {
            this.btnAuth.disabled = false;
            this.btnAuth.innerText = "Mulai Pemindaian & Masuk";
            
            // Set Dashboard User Data
            this.lblActiveName.innerText = username;
            
            this.navigate('dashboard');
        }, 1500);
    }

    // ==========================================
    // DASHBOARD & ROLE MANAGEMENT
    // ==========================================
    initDashboard() {
        // Setup Role UI
        let roleName = this.activeRole === 'warga' ? "Warga Sipil" : (this.activeRole === 'petugas' ? "Petugas BPBD" : "Administrator IT");
        this.lblActiveRole.innerText = roleName;
        
        Object.values(this.rolePanels).forEach(p => p.classList.add('hidden'));
        if(this.rolePanels[this.activeRole]) {
            this.rolePanels[this.activeRole].classList.remove('hidden');
        }

        // Reset and Start Sim
        this.sensors = { water: 0.8, rain: 10.0, soil: 40.0 };
        this.trend = 1;
        this.historyData = { labels: [], water: [], rain: [] };

        // Pre-fill history data agar grafik langsung penuh saat dibuka
        let now = new Date();
        for(let i = 15; i >= 1; i--) {
            let t = new Date(now.getTime() - i * 3000);
            this.historyData.labels.push(t.toLocaleTimeString());
            
            let fakeWater = Math.max(0, 0.8 + (Math.random() * 0.4 - 0.2));
            let fakeRain = Math.max(0, 10.0 + (Math.random() * 5.0 - 2.5));
            
            this.historyData.water.push(parseFloat(fakeWater.toFixed(2)));
            this.historyData.rain.push(parseFloat(fakeRain.toFixed(1)));
        }

        // Init Chart & Map
        this.initChart();
        this.initMap();
        
        this.executeDataCycle();
        this.simulationTimer = setInterval(() => this.executeDataCycle(), 3000);
    }

    stopSimulation() {
        if(this.simulationTimer) clearInterval(this.simulationTimer);
    }

    // ==========================================
    // CHART.JS INTEGRATION
    // ==========================================
    initChart() {
        const ctx = document.getElementById('historicalChart');
        if(!ctx) return;
        
        if(this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.historyData.labels,
                datasets: [
                    {
                        label: 'Tinggi Air (m)',
                        data: this.historyData.water,
                        borderColor: '#4DD0E1',
                        backgroundColor: 'rgba(77, 208, 225, 0.2)',
                        borderWidth: 3,
                        pointBackgroundColor: '#4DD0E1',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Curah Hujan (mm/j)',
                        data: this.historyData.rain,
                        borderColor: '#2196F3',
                        borderWidth: 3,
                        pointBackgroundColor: '#2196F3',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: { ticks: { color: '#B0C4DE' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { type: 'linear', display: true, position: 'left', ticks: { color: '#4DD0E1' }, grid: { color: 'rgba(255,255,255,0.1)' }, title: {display: true, text: 'Tinggi (m)', color: '#4DD0E1'} },
                    y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#2196F3' }, grid: { drawOnChartArea: false }, title: {display: true, text: 'Curah Hujan (mm/j)', color: '#2196F3'} }
                },
                plugins: { 
                    legend: { labels: { color: '#fff' } },
                    tooltip: {
                        backgroundColor: 'rgba(11, 37, 69, 0.9)',
                        titleColor: '#4DD0E1',
                        bodyColor: '#FFF',
                        borderColor: 'var(--aqua-cyan)',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    updateChart(timeLabel, w, r) {
        if(!this.chart) return;
        if(this.historyData.labels.length >= 15) {
            this.historyData.labels.shift();
            this.historyData.water.shift();
            this.historyData.rain.shift();
        }
        this.historyData.labels.push(timeLabel);
        // Pastikan masuk sebagai Float (Number), bukan String, agar Chart.js merender garis dengan sempurna
        this.historyData.water.push(parseFloat(w.toFixed(2)));
        this.historyData.rain.push(parseFloat(r.toFixed(1)));
        this.chart.update();
    }



    // ==========================================
    // LEAFLET.JS GIS MAP INTEGRATION (INTERACTIVE COLOR MAP)
    // ==========================================
    initMap() {
        const mapDiv = document.getElementById('gis-map');
        if(!mapDiv) return;
        
        if(this.map) {
            this.map.remove();
        }

        // Center to Sumatra & Aceh Region
        this.map = L.map('gis-map').setView([1.5, 100.5], 5);

        // Dark theme map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(this.map);

        // Define Regional Polygons (Interactive Zones) - Sumatra & Aceh
        const acehCoords = [
            [5.9, 95.0], [5.9, 96.0], [4.5, 98.0], [3.0, 97.5], [4.0, 95.5]
        ];
        
        const sumutCoords = [
            [4.0, 98.0], [3.5, 99.5], [1.5, 100.0], [1.0, 98.5], [2.5, 97.5]
        ];

        const sumbarCoords = [
            [1.0, 99.0], [0.5, 100.5], [-1.5, 101.5], [-2.0, 100.5], [0.0, 98.5]
        ];

        this.regionalZones = {
            zonaAceh: L.polygon(acehCoords, { color: '#00E676', fillColor: '#00E676', fillOpacity: 0.4, weight: 2 }).addTo(this.map)
                           .bindTooltip("<b>Provinsi Aceh</b><br>Fokus Mitigasi Utama", {sticky: true})
                           .bindPopup("<b>Posko Sensor Aceh</b><br>Memantau DAS Krueng Aceh & Peusangan."),
                           
            zonaSumut: L.polygon(sumutCoords, { color: '#00E676', fillColor: '#00E676', fillOpacity: 0.3, weight: 2 }).addTo(this.map)
                          .bindTooltip("<b>Sumatera Utara (Medan)</b>", {sticky: true})
                          .bindPopup("<b>Kawasan Padat Penduduk</b><br>Pusat evakuasi Deli Serdang."),
                          
            zonaSumbar: L.polygon(sumbarCoords, { color: '#00E676', fillColor: '#00E676', fillOpacity: 0.3, weight: 2 }).addTo(this.map)
                          .bindTooltip("<b>Sumatera Barat (Padang)</b>", {sticky: true})
        };

        // Add hover effects for interactivity
        Object.values(this.regionalZones).forEach(zone => {
            zone.options.defaultOpacity = zone.options.fillOpacity;
            zone.on('mouseover', function() {
                this.setStyle({ fillOpacity: 0.7, weight: 3 });
            });
            zone.on('mouseout', function() {
                this.setStyle({ fillOpacity: this.options.defaultOpacity || 0.4, weight: 2 });
            });
        });

        // Specific Markers
        L.marker([5.5483, 95.3238]).addTo(this.map).bindPopup("<b>Posko Evakuasi Utama (Banda Aceh)</b>").openPopup();
        L.marker([3.5952, 98.6722]).addTo(this.map).bindPopup("<b>Posko Pantau (Medan)</b>");
        L.marker([-0.9471, 100.4172]).addTo(this.map).bindPopup("<b>Sensor Node (Padang)</b>");
        L.marker([-2.9761, 104.7754]).addTo(this.map).bindPopup("<b>Sensor Node (Palembang)</b>");

        setTimeout(() => this.map.invalidateSize(), 500);
    }

    updateMapRadius(nnRisk) {
        if(!this.regionalZones) return;
        
        // Dynamically color the main critical zone based on AI Risk
        let color = nnRisk > 75 ? '#f03' : (nnRisk > 40 ? '#FFD700' : '#00E676');
        let opacity = nnRisk > 75 ? 0.6 : 0.4;
        
        // Update Zona Tengah (Pusat Bendungan/Sungai)
        this.regionalZones.zonaTengah.setStyle({ color: color, fillColor: color, fillOpacity: opacity });
        this.regionalZones.zonaTengah.options.defaultOpacity = opacity; // Save for hover reset
        
        // Update Zona Utara (Berdampak lambat)
        let colorUtara = nnRisk > 85 ? '#f03' : (nnRisk > 60 ? '#FFD700' : '#00E676');
        this.regionalZones.zonaUtara.setStyle({ color: colorUtara, fillColor: colorUtara });
    }

    // ==========================================
    // WEATHER PREDICTION MODULE
    // ==========================================
    updateWeatherStatus(rainfall) {
        // Logika sederhana: Cuaca ditentukan oleh intensitas hujan
        if (rainfall < 5) {
            this.uiWeatherIcon.innerText = "⛅";
            this.uiWeatherText.innerText = "Cerah Berawan";
            this.uiWeatherText.style.color = "#FFF";
        } else if (rainfall < 20) {
            this.uiWeatherIcon.innerText = "🌦️";
            this.uiWeatherText.innerText = "Gerimis / Hujan Ringan";
            this.uiWeatherText.style.color = "var(--aqua-cyan)";
        } else if (rainfall < 60) {
            this.uiWeatherIcon.innerText = "🌧️";
            this.uiWeatherText.innerText = "Hujan Sedang";
            this.uiWeatherText.style.color = "var(--warning-yellow)";
        } else {
            this.uiWeatherIcon.innerText = "⛈️";
            this.uiWeatherText.innerText = "Badai Petir Ekstrem";
            this.uiWeatherText.style.color = "var(--danger-red)";
        }
    }

    // ==========================================
    // DATA CYCLE (AI & UI SYNC)
    // ==========================================
    async executeDataCycle() {
        // 1. Mock Fluctuating Data
        this.sensors.water += (Math.random() * 0.3) * this.trend;
        this.sensors.rain += (Math.random() * 15.0) * this.trend;
        this.sensors.soil += (Math.random() * 2.0) * this.trend;

        if(this.sensors.water > 3.0) this.trend = -1;
        if(this.sensors.water < 0.5) this.trend = 1;
        
        let w = Math.max(0, this.sensors.water);
        let r = Math.max(0, this.sensors.rain);
        let s = Math.max(0, Math.min(100, this.sensors.soil));

        // 2. Update Basic UI & Weather
        this.uiWaterLevel.innerText = `${w.toFixed(2)} m`;
        this.uiRainfall.innerText = `${r.toFixed(1)} mm/j`;
        this.updateWeatherStatus(r);

        // 3. AI Compute (C# JSInterop)
        let aiResult;
        try {
            aiResult = await DotNet.invokeMethodAsync('HydroGuard', 'RunAIAnalysisAsync', w, r, s);
        } catch (e) {
            console.error("AI Interop Error:", e);
            aiResult = { fuzzyStatus: "UNKNOWN", riskPercentage: 0, aiExplanation: "Gagal memuat AI C# Backend." };
        }

        let nnRisk = aiResult.riskPercentage;
        let status = aiResult.fuzzyStatus;

        // 4. Update Badges
        this.uiFuzzyBadge.innerText = status;
        this.uiFuzzyBadge.className = 'status-badge'; 
        
        if (status.includes("BAHAYA")) {
            this.uiFuzzyBadge.classList.add('bg-danger');
            this.uiNnProgress.style.background = "var(--danger-red)";
            this.triggerEarlyWarning(); 
        } else if (status.includes("WASPADA")) {
            this.uiFuzzyBadge.classList.add('bg-warning');
            this.uiNnProgress.style.background = "var(--warning-yellow)";
        } else {
            this.uiFuzzyBadge.classList.add('bg-safe');
            this.uiNnProgress.style.background = "var(--safe-green)";
        }

        this.uiNnProgress.style.width = `${nnRisk}%`;
        this.uiNnPercent.innerText = nnRisk;

        // 5. NLP Explanation
        this.uiAiExplanation.innerText = aiResult.aiExplanation;
        
        // 6. Update Advanced Features (Chart & Map)
        let timeStr = new Date().toLocaleTimeString();
        this.updateChart(timeStr, w, r);
        this.updateMapRadius(nnRisk);
        
        // 7. Admin Logging
        if(this.activeRole === 'admin') {
            const logBox = document.getElementById('admin-log');
            if(logBox) {
                logBox.innerHTML += `<br>[SYS] ${timeStr} | FWL: ${w.toFixed(2)} | NN Risk: ${nnRisk}% | Weather: ${this.uiWeatherText.innerText}`;
                logBox.scrollTop = logBox.scrollHeight;
            }
        }
    }

    triggerEarlyWarning() {
        if(!this._alertTriggered) {
            this._alertTriggered = true;
            document.body.style.boxShadow = "inset 0 0 50px rgba(255, 0, 0, 0.5)";
            
            setTimeout(() => {
                document.body.style.boxShadow = "none";
                this._alertTriggered = false;
            }, 10000);
        }
    }

    // ==========================================
    // CHATBOT AI INTEGRATION
    // ==========================================
    async sendChatMessage() {
        const inputEl = document.getElementById('chat-input');
        const msgContainer = document.getElementById('chat-messages');
        const text = inputEl.value.trim();
        
        if(!text) return;
        
        // 1. Tambahkan bubble chat User
        inputEl.value = "";
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-msg user-msg';
        userDiv.innerText = text;
        msgContainer.appendChild(userDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // 2. Tambahkan indikator Typing
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerText = "Gemini AI sedang mengetik...";
        msgContainer.appendChild(typingDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // 3. Panggil Backend C# JSInterop
        let aiReply = "";
        try {
            aiReply = await DotNet.invokeMethodAsync('HydroGuard', 'AskChatbotAsync', text);
        } catch (e) {
            console.error(e);
            aiReply = "Maaf, sistem AI tidak merespons.";
        }

        // 4. Hapus Typing & Tambahkan balasan AI
        msgContainer.removeChild(typingDiv);
        const aiDiv = document.createElement('div');
        aiDiv.className = 'chat-msg ai-msg';
        aiDiv.innerText = aiReply;
        msgContainer.appendChild(aiDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

// Inisialisasi
window.onload = () => {
    window.HydroApp = new HydroGuardApp();
};
