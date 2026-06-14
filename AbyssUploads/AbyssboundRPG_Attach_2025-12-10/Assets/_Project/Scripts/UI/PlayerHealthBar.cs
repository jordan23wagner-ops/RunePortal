using UnityEngine;
using UnityEngine.UI;

public class PlayerHealthBar : MonoBehaviour
{
    [Header("References")]
    public PlayerHealth playerHealth;
    public Slider healthSlider;

    private void Awake()
    {
        // Try to auto-fill references if they aren't set in the Inspector
        if (!healthSlider)
        {
            healthSlider = GetComponent<Slider>();
        }

        if (!playerHealth)
        {
            playerHealth = FindObjectOfType<PlayerHealth>();
        }
    }

    private void Start()
    {
        if (!playerHealth || !healthSlider)
        {
            Debug.LogWarning("PlayerHealthBar is missing references.");
            // Disable this component so Update doesn't spam errors
            enabled = false;
            return;
        }

        healthSlider.minValue = 0;
        healthSlider.maxValue = playerHealth.MaxHealth;
        healthSlider.value = playerHealth.CurrentHealth;
    }

    private void Update()
    {
        if (!playerHealth || !healthSlider) return;

        // If max health scales (buffs, level-ups), keep the slider in sync
        if (!Mathf.Approximately(healthSlider.maxValue, playerHealth.MaxHealth))
        {
            healthSlider.maxValue = playerHealth.MaxHealth;
        }

        // Always reflect current health
        healthSlider.value = playerHealth.CurrentHealth;
    }
}
