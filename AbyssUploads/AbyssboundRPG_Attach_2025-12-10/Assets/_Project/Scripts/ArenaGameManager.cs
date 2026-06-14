// NOTE: LEGACY/ARENA-ONLY – candidate for removal once Zone 1 is stable.
using UnityEngine;

public class ArenaGameManager : MonoBehaviour
{
    [Header("Player References")]
    [SerializeField] private PlayerHealth playerHealth;
    [SerializeField] private SimpleTopDownPlayer movement;
    [SerializeField] private SimplePlayerMelee melee;
    [SerializeField] private Rigidbody rb;
    [SerializeField] private Transform playerRoot;
    [SerializeField] private Transform respawnPoint;

    [Header("Respawn Settings")]
    [SerializeField] private float spawnHeightOffset = 0.5f;
    [SerializeField] private float minDistanceFromEnemyOnRespawn = 2f;

    [Header("Spawners / Waves")]
    [SerializeField] private EnemyWaveSpawner waveSpawner;

    [Header("Wave UI")]
    [SerializeField] private WaveUIController waveUI;

    [Header("UI")]
    [SerializeField] private GameObject gameOverPanel;

    private bool isGameOver;
    private int currentWave = 0;

    private void OnEnable()
    {
        if (playerHealth != null)
        {
            playerHealth.OnPlayerDied += HandlePlayerDeath;
        }
    }

    private void OnDisable()
    {
        if (playerHealth != null)
        {
            playerHealth.OnPlayerDied -= HandlePlayerDeath;
        }
    }

    private void Start()
    {
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        isGameOver = false;

        StartNextWave();
    }

    private void Update()
    {
        if (!isGameOver) return;

        if (Input.GetKeyDown(KeyCode.R))
        {
            RespawnPlayer();
        }
    }

    private void HandlePlayerDeath()
    {
        isGameOver = true;

        if (movement != null)
        {
            movement.ResetMovementState();
            movement.enabled = false;
        }

        if (melee != null)
        {
            melee.enabled = false;
        }

        if (rb != null)
        {
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
        }

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
        }
    }

    private void RespawnPlayer()
    {
        isGameOver = false;

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        if (playerHealth != null)
        {
            playerHealth.ResetHealth();
        }

        // Base spawn position from respawn point
        Vector3 spawnPos = respawnPoint != null ? respawnPoint.position : playerRoot.position;
        spawnPos.y += spawnHeightOffset;

        // Keep some distance from enemies on respawn
        SimpleEnemyDummy[] enemies =
            Object.FindObjectsByType<SimpleEnemyDummy>(FindObjectsSortMode.None);

        foreach (var enemy in enemies)
        {
            if (enemy == null) continue;

            Vector3 enemyPos = enemy.transform.position;
            Vector2 flatDelta = new Vector2(spawnPos.x - enemyPos.x, spawnPos.z - enemyPos.z);
            float distance = flatDelta.magnitude;

            if (distance < minDistanceFromEnemyOnRespawn && distance > 0.0001f)
            {
                Vector2 safeOffset = flatDelta.normalized * minDistanceFromEnemyOnRespawn;
                spawnPos.x = enemyPos.x + safeOffset.x;
                spawnPos.z = enemyPos.z + safeOffset.y;
            }
        }

        if (playerRoot != null)
        {
            playerRoot.position = spawnPos;
            if (respawnPoint != null)
            {
                playerRoot.rotation = respawnPoint.rotation;
            }
        }

        if (rb != null)
        {
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
        }

        if (movement != null)
        {
            movement.ResetMovementState();
            movement.enabled = true;
        }

        if (melee != null)
        {
            melee.enabled = true;
        }

        // New wave after respawn
        StartNextWave();
    }

    private void StartNextWave()
    {
        currentWave++;

        if (waveSpawner != null)
        {
            waveSpawner.ResetAndStart();
        }

        if (waveUI != null)
        {
            waveUI.ShowWave(currentWave);
        }
    }
}
