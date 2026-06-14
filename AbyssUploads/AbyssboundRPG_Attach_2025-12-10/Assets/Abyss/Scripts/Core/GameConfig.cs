// Abyssbound – GameConfig
// Author: Jordan + ChatGPT
// Purpose: Centralized global configuration values for Abyssbound.
// Dependencies: None.
// Notes: Safe to paste as full file.

namespace Abyss.Core
{
    /// <summary>
    /// Global configuration values for Abyssbound.
    /// Keep ONLY stable, widely used constants here.
    /// </summary>
    public static class GameConfig
    {
        // Zone / Enemy Spawner defaults
        public const int DefaultZoneMaxActiveEnemies = 20;
        public const float DefaultSpawnPointRespawnDelay = 15f; // seconds

        // Boss / Corpse run / etc. will be added here later.
        public const float BossRespawnCooldownSeconds = 60f;
        public const float CorpseDespawnTimeSeconds = 600f;
    }
}
