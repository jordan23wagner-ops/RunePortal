using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class PlayerMovement : MonoBehaviour
{
	[Header("Stats")]
	[Tooltip("ScriptableObject that defines core player parameters.")]
	public PlayerStats stats;

	[Header("Dash Visuals (Optional)")]
	public bool useDashTint = true;
	public Color dashTintColor = Color.cyan;

	private Rigidbody rb;
	private Vector3 inputDirection;
	private Vector3 lastNonZeroDirection;
	private bool isDashing;
	private float dashTimeRemaining;
	private float dashCooldownRemaining;

	private Renderer cachedRenderer;
	private Color originalColor;
	private bool hasOriginalColor;

	private void Awake()
	{
		rb = GetComponent<Rigidbody>();

		cachedRenderer = GetComponentInChildren<Renderer>();
		if (cachedRenderer != null)
		{
			originalColor = cachedRenderer.material.color;
			hasOriginalColor = true;
		}

		if (stats == null)
		{
			Debug.LogError("PlayerMovement is missing a PlayerStats reference.", this);
			enabled = false;
		}
	}

	private void Update()
	{
		// Read movement input (WASD / Arrow keys via legacy Input).
		float horizontal = Input.GetAxisRaw("Horizontal");
		float vertical = Input.GetAxisRaw("Vertical");

		Vector3 rawDirection = new Vector3(horizontal, 0f, vertical);

		// Normalize so diagonal movement isnt faster than straight movement.
		if (rawDirection.sqrMagnitude > 1f)
		{
			rawDirection.Normalize();
		}

		inputDirection = rawDirection;
		if (inputDirection.sqrMagnitude > 0.0001f)
		{
			lastNonZeroDirection = inputDirection;
		}

		// Timers
		if (dashCooldownRemaining > 0f)
		{
			dashCooldownRemaining -= Time.deltaTime;
		}

		if (isDashing)
		{
			dashTimeRemaining -= Time.deltaTime;
			if (dashTimeRemaining <= 0f)
			{
				EndDash();
			}
		}

		// Dash input (Spacebar)
		if (!isDashing && Input.GetKeyDown(KeyCode.Space))
		{
			TryStartDash();
		}
	}

	private void FixedUpdate()
	{
		if (stats == null)
		{
			return;
		}

		// Preserve any vertical velocity (e.g., if gravity is used).
		Vector3 currentVelocity = rb.linearVelocity;
		Vector3 newHorizontalVelocity;

		if (isDashing)
		{
			// Dash along the most recent movement direction, normalized.
			Vector3 dashDir = lastNonZeroDirection.sqrMagnitude > 0.0001f
				? lastNonZeroDirection.normalized
				: Vector3.zero;

			newHorizontalVelocity = dashDir * stats.dashSpeed;
		}
		else
		{
			// Regular WASD movement using stats.moveSpeed.
			newHorizontalVelocity = inputDirection * stats.moveSpeed;
		}

		// Apply horizontal velocity while keeping Y component intact.
		currentVelocity.x = newHorizontalVelocity.x;
		currentVelocity.z = newHorizontalVelocity.z;
		rb.linearVelocity = currentVelocity;
	}

	private void TryStartDash()
	{
		if (stats == null)
		{
			return;
		}

		// If there is no current movement input, do not dash.
		if (inputDirection.sqrMagnitude < 0.0001f)
		{
			return;
		}

		if (dashCooldownRemaining > 0f)
		{
			return;
		}

		isDashing = true;
		dashTimeRemaining = stats.dashDuration;
		dashCooldownRemaining = stats.dashCooldown;

		BeginDashVisuals();
	}

	private void EndDash()
	{
		isDashing = false;
		EndDashVisuals();
	}

	private void BeginDashVisuals()
	{
		if (!useDashTint || !hasOriginalColor)
		{
			return;
		}

		cachedRenderer.material.color = dashTintColor;
	}

	private void EndDashVisuals()
	{
		if (!useDashTint || !hasOriginalColor)
		{
			return;
		}

		cachedRenderer.material.color = originalColor;
	}
}
