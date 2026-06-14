using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class SimpleTopDownPlayer : MonoBehaviour
{
    [Header("Stats")]
    public PlayerStats stats;

    [Header("Movement (fallback when no stats)")]
    public float moveSpeed = 5f;

    [Header("Dash (fallback when no stats)")]
    public bool enableDash = true;
    public float dashSpeed = 12f;
    public float dashDuration = 0.15f;
    public float dashCooldown = 0.5f;

    private Rigidbody rb;
    private IPlayerInputSource inputSource;
    private Vector3 moveDirection;
    private Vector3 lastNonZeroMoveDirection;
    private bool isDashing;
    private Vector3 dashDirection;
    private float dashTimeRemaining;
    private float dashCooldownRemaining;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();

        // Hard-set the important bits so the Inspector can’t mess us up
        rb.useGravity = false;
        rb.isKinematic = false;
        rb.constraints = RigidbodyConstraints.FreezePositionY |
                         RigidbodyConstraints.FreezeRotationX |
                         RigidbodyConstraints.FreezeRotationZ;

        // Default to legacy keyboard input; this can later be
        // replaced with another IPlayerInputSource implementation.
        inputSource = new KeyboardPlayerInputSource();
    }

    private void Update()
    {
        // Get movement input from the pluggable input source
        Vector2 moveInput = inputSource != null ? inputSource.GetMoveInput() : Vector2.zero;
        Vector3 rawDir = new Vector3(moveInput.x, 0f, moveInput.y);

        // Normalize to avoid diagonal speed abuse
        if (rawDir.sqrMagnitude > 1f)
        {
            rawDir.Normalize();
        }

        moveDirection = rawDir;
        if (moveDirection.sqrMagnitude > 0.0001f)
        {
            lastNonZeroMoveDirection = moveDirection;
        }

        // Handle dash input and timers
        if (enableDash && inputSource != null && inputSource.GetDashPressed())
        {
            TryStartDash();
        }

        if (dashCooldownRemaining > 0f)
        {
            dashCooldownRemaining -= Time.deltaTime;
        }

        if (isDashing)
        {
            dashTimeRemaining -= Time.deltaTime;
            if (dashTimeRemaining <= 0f)
            {
                isDashing = false;
            }
        }
    }

    private void FixedUpdate()
    {
        float currentMoveSpeed = stats != null ? stats.moveSpeed : moveSpeed;
        float currentDashSpeed = stats != null ? stats.dashSpeed : dashSpeed;

        // Simple velocity-based movement with dash override
        if (isDashing && lastNonZeroMoveDirection.sqrMagnitude > 0.0001f)
        {
            dashDirection = lastNonZeroMoveDirection.normalized;
            rb.linearVelocity = dashDirection * currentDashSpeed;
        }
        else if (moveDirection.sqrMagnitude > 0f)
        {
            rb.linearVelocity = moveDirection.normalized * currentMoveSpeed;
        }
        else
        {
            rb.linearVelocity = Vector3.zero;
        }
    }

    // NEW: hard reset all movement/dash state (for death/respawn)
    public void ResetMovementState()
    {
        moveDirection = Vector3.zero;
        lastNonZeroMoveDirection = Vector3.zero;
        isDashing = false;
        dashDirection = Vector3.zero;
        dashTimeRemaining = 0f;
        dashCooldownRemaining = 0f;

        if (rb != null)
        {
            rb.linearVelocity = Vector3.zero;
        }
    }

    private void TryStartDash()
    {
        if (!enableDash)
            return;

        if (dashCooldownRemaining > 0f)
            return;

        if (lastNonZeroMoveDirection.sqrMagnitude < 0.0001f)
        {
            // Don’t dash if we have no movement direction
            return;
        }

        float usedDashDuration = stats != null ? stats.dashDuration : dashDuration;
        float usedDashCooldown = stats != null ? stats.dashCooldown : dashCooldown;

        isDashing = true;
        dashTimeRemaining = usedDashDuration;
        dashCooldownRemaining = usedDashCooldown;
    }
}
