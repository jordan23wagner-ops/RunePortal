using System;
using UnityEngine;

public class SimpleEnemyDummy : MonoBehaviour
{
    [Header("Stats")]
    [SerializeField] private EnemyStats stats;   // <-- correct ScriptableObject type

    [Header("Visuals")]
    [SerializeField] private Renderer bodyRenderer;

    [Header("Damage Popup")]
    [SerializeField] private GameObject damageTextPrefab;

    private int currentHealth;
    private bool isDead;

    private Material originalMaterial;
    private Coroutine flashRoutine;

    // Event for spawner / game manager
    public event Action<SimpleEnemyDummy> OnEnemyDied;

    private void Awake()
    {
        currentHealth = stats != null ? stats.maxHealth : 10;

        if (bodyRenderer != null)
        {
            originalMaterial = bodyRenderer.material;
        }
    }

    public void TakeDamage(int amount)
    {
        if (isDead) return;

        currentHealth = Mathf.Max(currentHealth - amount, 0);

        SpawnDamageText(amount);
        FlashRed();

        if (currentHealth <= 0 && !isDead)
        {
            Die();
        }
    }

    private void SpawnDamageText(int amount)
    {
        if (damageTextPrefab == null) return;

        Vector3 spawnPos = transform.position + Vector3.up * 1.5f;
        Instantiate(damageTextPrefab, spawnPos, Quaternion.identity);
    }

    private void FlashRed()
    {
        if (bodyRenderer == null) return;

        if (flashRoutine != null)
        {
            StopCoroutine(flashRoutine);
        }

        flashRoutine = StartCoroutine(FlashRoutine());
    }

    private System.Collections.IEnumerator FlashRoutine()
    {
        var mat = bodyRenderer.material;
        Color startColor = mat.color;
        mat.color = Color.red;
        yield return new WaitForSeconds(0.1f);
        mat.color = startColor;
    }

    private void Die()
    {
        isDead = true;

        OnEnemyDied?.Invoke(this);

        Destroy(gameObject);
    }
}
