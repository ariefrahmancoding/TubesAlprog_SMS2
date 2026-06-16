namespace HydroGuard.Engines
{
    public class FuzzyLogicEngine
    {
        public string ComputeMamdani(double waterLevel, double rainfall)
        {
            // Simplified stub for the Mamdani fuzzy inference system
            if (waterLevel > 2.0 || rainfall > 50)
            {
                return "Bahaya";
            }
            if (waterLevel > 1.5 || rainfall > 20)
            {
                return "Waspada";
            }
            return "Aman";
        }
    }
}
