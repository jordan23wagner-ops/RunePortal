using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float moveSpeed = 5f;
    public float rotationSpeed = 10f;

    private Rigidbody rb;
    private Vector3 inputDirection;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        rb.freezeRotation = true; // we handle rotation manually
    }

    private void Update()
    {
        // Read input in Update (frame-rate dependent)
        float horizontal = Input.GetAxisRaw("Horizontal");
        float vertical = Input.GetAxisRaw("Vertical");

        inputDirection = new Vector3(horizontal, 0f, vertical).normalized;
    }

    private void FixedUpdate()
    {
        // Use the cached input in FixedUpdate for physics
        Vector3 currentPosition = rb.position;

        // Movement
        Vector3 velocity = inputDirection * moveSpeed;
        Vector3 targetPosition = currentPosition + velocity * Time.fixedDeltaTime;

        // Keep player at fixed Y height
        targetPosition.y = 1f;

        rb.MovePosition(targetPosition);

        // Rotation only when moving
        if (inputDirection.sqrMagnitude > 0.001f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(inputDirection, Vector3.up);
            Quaternion smoothedRotation = Quaternion.Slerp(rb.rotation, targetRotation, rotationSpeed * Time.fixedDeltaTime);
            rb.MoveRotation(smoothedRotation);
        }
    }
}
