// NOTE: LEGACY/ARENA-ONLY – candidate for removal once Zone 1 is stable.
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class EnemyWaveSpawner : MonoBehaviour
{
    [Header("Spawning")]
    [SerializeField] private GameObject enemyPrefab;
    [SerializeField] private Transform[] spawnPoints;

    [Header("Wave Settings")]
    [SerializeField] private int enemiesPerWave = 10;
    [SerializeField] private int maxAliveAtOnce = 3;
    [SerializeField] private float initialDelay = 1f;
    [SerializeField] private float spawnInterval = 1.5f;

    public event Action OnWaveFinished;

    private readonly List<SimpleEnemyDummy> activeEnemies = new List<SimpleEnemyDummy>();
    private Coroutine spawnRoutine;
    private int spawnedThisWave;
    private int aliveCount;

    public void ResetAndStart()
    {
        // Stop any ongoing spawn loop
        if (spawnRoutine != null)
        {
            StopCoroutine(spawnRoutine);
            spawnRoutine = null;
        }

        // Clean up any existing enemies spawned by this spawner
        for (int i = activeEnemies.Count - 1; i >= 0; i--)
        {
            if (activeEnemies[i] != null)
            {
                activeEnemies[i].OnEnemyDied -= HandleEnemyDied;
                Destroy(activeEnemies[i].gameObject);
            }
        }
        activeEnemies.Clear();

        spawnedThisWave = 0;
        aliveCount = 0;

        if (enemyPrefab == null || spawnPoints == null || spawnPoints.Length == 0)
        {
            Debug.LogWarning("[EnemyWaveSpawner] Missing enemyPrefab or spawnPoints.");
            return;
        }

        spawnRoutine = StartCoroutine(SpawnLoop());
    }

    private IEnumerator SpawnLoop()
    {
        yield return new WaitForSeconds(initialDelay);

        while (spawnedThisWave < enemiesPerWave)
        {
            if (aliveCount < maxAliveAtOnce)
            {
                SpawnOneEnemy();
            }

            yield return new WaitForSeconds(spawnInterval);
        }

        // Once we've spawned them all, we just wait for them to die.
        spawnRoutine = null;
    }

    private void SpawnOneEnemy()
    {
        if (enemyPrefab == null || spawnPoints == null || spawnPoints.Length == 0)
            return;

        Transform spawnPoint = spawnPoints[UnityEngine.Random.Range(0, spawnPoints.Length)];
        GameObject instance = Instantiate(enemyPrefab, spawnPoint.position, spawnPoint.rotation);

        SimpleEnemyDummy dummy = instance.GetComponent<SimpleEnemyDummy>();
        if (dummy != null)
        {
            activeEnemies.Add(dummy);
            aliveCount++;

            dummy.OnEnemyDied += HandleEnemyDied;
        }
        else
        {
            Debug.LogWarning("[EnemyWaveSpawner] Spawned enemy without SimpleEnemyDummy component.");
        }

        spawnedThisWave++;
    }

    private void HandleEnemyDied(SimpleEnemyDummy enemy)
    {
        if (enemy != null)
        {
            enemy.OnEnemyDied -= HandleEnemyDied;
        }

        aliveCount = Mathf.Max(0, aliveCount - 1);

        activeEnemies.Remove(enemy);

        if (spawnedThisWave >= enemiesPerWave && aliveCount == 0)
        {
            OnWaveFinished?.Invoke();
        }
    }
}
