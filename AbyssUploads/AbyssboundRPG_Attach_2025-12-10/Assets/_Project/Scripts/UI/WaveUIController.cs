// NOTE: LEGACY/ARENA-ONLY – candidate for removal once Zone 1 is stable.
using System.Collections;
using UnityEngine;
using TMPro;

public class WaveUIController : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private TextMeshProUGUI waveText;

    [Header("Timing")]
    [SerializeField] private float showDuration = 1.5f;
    [SerializeField] private float fadeDuration = 0.5f;

    private Coroutine currentRoutine;

    private void Awake()
    {
        if (waveText == null)
        {
            waveText = GetComponent<TextMeshProUGUI>();
        }

        if (waveText != null)
        {
            var color = waveText.color;
            color.a = 0f;
            waveText.color = color;
            waveText.gameObject.SetActive(false);
        }
    }

    public void ShowWave(int waveNumber)
    {
        if (waveText == null) return;

        if (currentRoutine != null)
        {
            StopCoroutine(currentRoutine);
        }

        currentRoutine = StartCoroutine(ShowWaveRoutine(waveNumber));
    }

    private IEnumerator ShowWaveRoutine(int waveNumber)
    {
        waveText.gameObject.SetActive(true);
        waveText.text = $"Wave {waveNumber}";

        // fully visible
        Color c = waveText.color;
        c.a = 1f;
        waveText.color = c;

        yield return new WaitForSeconds(showDuration);

        float t = 0f;
        while (t < fadeDuration)
        {
            t += Time.deltaTime;
            float normalized = Mathf.Clamp01(t / fadeDuration);

            c.a = Mathf.Lerp(1f, 0f, normalized);
            waveText.color = c;

            yield return null;
        }

        waveText.gameObject.SetActive(false);
    }
}
