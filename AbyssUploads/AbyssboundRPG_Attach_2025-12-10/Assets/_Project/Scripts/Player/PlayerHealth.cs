using System;
using UnityEngine;

[DisallowMultipleComponent]
public class PlayerHealth : MonoBehaviour
{
    [Header("Stats")]
    [SerializeField] private PlayerStats stats;   // <-- uses PlayerStats (class name)

    public int CurrentHealth { get; private set; }
    public int MaxHealth => stats != null ? stats.maxHealth : 100;

    public bool IsDead { get; private set; }

    // Other systems (UI, GameManager, etc.) can hook into this later
    public event Action OnPlayerDied;

    private void Awake()
    {
        ResetHealth();
    }

    public void ResetHealth()
    {
        IsDead = false;
        CurrentHealth = MaxHealth;
    }

    public void TakeDamage(int amount)
    {
        if (IsDead) return;

        CurrentHealth = Mathf.Max(CurrentHealth - amount, 0);

        if (CurrentHealth <= 0 && !IsDead)
        {
            IsDead = true;
            OnPlayerDied?.Invoke();
        }
    }

    public void Heal(int amount)
    {
        if (IsDead) return;

        CurrentHealth = Mathf.Clamp(CurrentHealth + amount, 0, MaxHealth);
    }
}
