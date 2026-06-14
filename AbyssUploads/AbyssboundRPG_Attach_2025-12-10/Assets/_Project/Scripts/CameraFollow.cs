using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("Target")]
    public Transform target;

    [Header("Offset")]
    public Vector3 offset = new Vector3(0f, 10f, -10f);

    [Header("Smoothing")]
    [Range(0f, 1f)]
    public float smoothSpeed = 0.15f;

    private void LateUpdate()
    {
        if (target == null) return;

        // Desired position is target + offset
        Vector3 desiredPosition = target.position + offset;

        // Smoothly move from current to desired
        Vector3 smoothedPosition = Vector3.Lerp(
            transform.position,
            desiredPosition,
            smoothSpeed
        );

        transform.position = smoothedPosition;

        // Always look at the target from above
        transform.LookAt(target);
    }
}
