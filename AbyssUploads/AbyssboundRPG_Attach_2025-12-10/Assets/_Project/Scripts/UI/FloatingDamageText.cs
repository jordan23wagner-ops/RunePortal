using UnityEngine;
using TMPro;

/// <summary>
/// Simple floating damage text that drifts upward and fades out.
/// Intended for a world-space TextMeshPro-based prefab.
/// </summary>
[RequireComponent(typeof(TMP_Text))]
public class FloatingDamageText : MonoBehaviour
{
    [Header("Movement")] 
    public float lifetime = 0.8f;
    public float moveSpeed = 1.0f;

    [Header("Visuals")] 
    public float fadeDuration = 0.5f;

    private TMP_Text tmpText;
    private float elapsed;
    private Color initialColor;

    private void Awake()
    {
        tmpText = GetComponent<TMP_Text>();
        initialColor = tmpText.color;
    }

    private void Update()
    {
        elapsed += Time.deltaTime;

        // Move upward over time (world space).
        transform.position += Vector3.up * (moveSpeed * Time.deltaTime);

        // Fade out over fadeDuration.
        float fadeStartTime = lifetime - fadeDuration;
        if (elapsed >= fadeStartTime && fadeDuration > 0f)
        {
            float t = Mathf.InverseLerp(lifetime, fadeStartTime, elapsed);
            Color c = initialColor;
            c.a = Mathf.Lerp(0f, initialColor.a, t);
            tmpText.color = c;
        }

        if (elapsed >= lifetime)
        {
            Destroy(gameObject);
        }
    }

    /// <summary>
    /// Set the numeric damage text.
    /// </summary>
    public void SetValue(int amount)
    {
        if (tmpText == null)
        {
            tmpText = GetComponent<TMP_Text>();
        }

        tmpText.text = amount.ToString();
    }
}
