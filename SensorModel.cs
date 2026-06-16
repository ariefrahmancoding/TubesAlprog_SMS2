using System;

namespace HydroGuard.Models
{
    /// <summary>
    /// Model data ini berfungsi sebagai cetakan (blueprint) untuk menampung 
    /// nilai-nilai parameter banjir yang dihasilkan oleh sensor IoT HydroGuard.
    /// </summary>
    public class SensorData
    {
        // 1. Parameter Level Air (Ketinggian Muka Air Sungai)
        // Menggunakan tipe 'double' agar bisa menampung angka desimal (contoh: 2.5 meter)
        public double WaterLevel { get; set; }

        // 2. Parameter Curah Hujan (Intensitas Air Hujan)
        // Satuan yang digunakan umumnya mm/jam (contoh: 45.8 mm/jam)
        public double Rainfall { get; set; }

        // 3. Parameter Kelembaban Tanah (Pemicu Risiko Longsor Bantaran)
        // Ditampilkan dalam bentuk persentase dari 0% hingga 100%
        public double SoilMoisture { get; set; }

        // 4. Status Keputusan Sistem (Output dari Logika Fuzzy/Neural Network)
        // Menyimpan teks indikator keselamatan (contoh: "NORMAL", "WASPADA", "BAHAYA")
        public string Status { get; set; }
    }
}