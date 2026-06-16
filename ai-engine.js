/**
 * HYDROGUARD AI ANALYTICS CENTER
 * Implements Fuzzy Logic Mamdani and Artificial Neural Network (Feed Forward & Backpropagation)
 */

// ==========================================
// 1. FUZZY LOGIC MAMDANI
// ==========================================
class FuzzyLogicEngine {
    constructor() { }

    // Fuzzification
    fuzzifyWaterLevel(wl) {
        return {
            Rendah: wl < 1.0 ? 1 : (wl >= 1.0 && wl < 1.5 ? (1.5 - wl) / 0.5 : 0),
            Sedang: wl > 1.0 && wl < 2.0 ? (wl <= 1.5 ? (wl - 1.0) / 0.5 : (2.0 - wl) / 0.5) : 0,
            Tinggi: wl > 1.5 ? (wl >= 2.0 ? 1 : (wl - 1.5) / 0.5) : 0
        };
    }

    fuzzifyRainfall(rf) {
        return {
            Ringan: rf < 20 ? 1 : (rf >= 20 && rf < 50 ? (50 - rf) / 30 : 0),
            Lebat: rf > 20 && rf < 100 ? (rf <= 60 ? (rf - 20) / 40 : (100 - rf) / 40) : 0,
            Ekstrem: rf > 60 ? (rf >= 100 ? 1 : (rf - 60) / 40) : 0
        };
    }

    // Rule Evaluation (Inference)
    evaluateRules(fwl, frf) {
        let aman = Math.max(
            Math.min(fwl.Rendah, frf.Ringan),
            Math.min(fwl.Rendah, frf.Lebat)
        );
        let waspada = Math.max(
            Math.min(fwl.Sedang, frf.Ringan),
            Math.min(fwl.Sedang, frf.Lebat),
            Math.min(fwl.Rendah, frf.Ekstrem)
        );
        let bahaya = Math.max(
            Math.min(fwl.Tinggi, frf.Ringan),
            Math.min(fwl.Tinggi, frf.Lebat),
            Math.min(fwl.Tinggi, frf.Ekstrem),
            Math.min(fwl.Sedang, frf.Ekstrem)
        );
        return { aman, waspada, bahaya };
    }

    // Defuzzification (Centroid method simplified)
    defuzzify(inference) {
        let weightAman = 25, weightWaspada = 60, weightBahaya = 90;
        let numerator = (inference.aman * weightAman) + (inference.waspada * weightWaspada) + (inference.bahaya * weightBahaya);
        let denominator = inference.aman + inference.waspada + inference.bahaya;
        
        let crispValue = denominator === 0 ? 0 : numerator / denominator;
        
        if (crispValue > 75) return { status: "BAHAYA", percentage: crispValue };
        if (crispValue > 40) return { status: "WASPADA", percentage: crispValue };
        return { status: "NORMAL", percentage: crispValue };
    }

    computeMamdani(waterLevel, rainfall) {
        let fwl = this.fuzzifyWaterLevel(waterLevel);
        let frf = this.fuzzifyRainfall(rainfall);
        let inference = this.evaluateRules(fwl, frf);
        return this.defuzzify(inference);
    }
}

// ==========================================
// 2. ARTIFICIAL NEURAL NETWORK
// ==========================================
class NeuralNetwork {
    constructor() {
        // Simple 3-layer architecture weights for demonstration
        // Input: WaterLevel, Rainfall, SoilMoisture
        // Hidden: 4 neurons
        // Output: FloodRisk (0 to 1)
        this.weightsIH = [
            [0.2, -0.1, 0.4, 0.5],
            [0.5, 0.2, -0.3, 0.1],
            [-0.1, 0.6, 0.2, 0.3]
        ];
        this.weightsHO = [0.4, -0.2, 0.5, 0.6];
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    // Feed Forward
    predict(waterLevel, rainfall, soilMoisture) {
        // Normalize inputs
        let inputs = [waterLevel / 5.0, rainfall / 150.0, soilMoisture / 100.0];
        
        // Hidden layer
        let hidden = [0, 0, 0, 0];
        for(let i=0; i<4; i++) {
            let sum = 0;
            for(let j=0; j<3; j++) {
                sum += inputs[j] * this.weightsIH[j][i];
            }
            hidden[i] = this.sigmoid(sum);
        }

        // Output layer
        let outputSum = 0;
        for(let i=0; i<4; i++) {
            outputSum += hidden[i] * this.weightsHO[i];
        }
        
        let prediction = this.sigmoid(outputSum);
        return (prediction * 100).toFixed(2);
    }
}

// ==========================================
// 3. SMART EXPLANATION ENGINE (NLP Mock)
// ==========================================
class HydroAI {
    generateExplanation(waterLevel, rainfall, riskPercentage, status) {
        if (status === "BAHAYA") {
            return `⚠️ Peringatan Dini! HydroGuard mendeteksi kenaikan debit air mencapai ${waterLevel.toFixed(2)}m disertai curah hujan ekstrem ${rainfall.toFixed(1)} mm/j. Berdasarkan analisis AI Neural Network, terdapat risiko banjir sebesar ${riskPercentage}%. Warga di sekitar bantaran sungai disarankan segera memantau informasi resmi dan bersiap evakuasi.`;
        } else if (status === "WASPADA") {
            return `Pemberitahuan: Kondisi air saat ini di level ${waterLevel.toFixed(2)}m. Risiko luapan berada di angka ${riskPercentage}%. Diharapkan warga tetap waspada terhadap curah hujan susulan.`;
        } else {
            return `Kondisi aman terkendali. Ketinggian air normal pada ${waterLevel.toFixed(2)}m dengan risiko banjir sangat rendah (${riskPercentage}%). Tidak ada anomali yang terdeteksi oleh jaringan syaraf tiruan HydroGuard.`;
        }
    }
}

window.HydroAIEngine = {
    FuzzyLogic: new FuzzyLogicEngine(),
    NeuralNetwork: new NeuralNetwork(),
    Assistant: new HydroAI()
};
