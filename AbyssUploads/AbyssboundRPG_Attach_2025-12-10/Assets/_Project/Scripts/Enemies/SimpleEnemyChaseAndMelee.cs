using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class SimpleEnemyChaseAndMelee : MonoBehaviour
{
    [Header("Target")]
    public Transform target;          // player transform
    public PlayerHealth playerHealth; // player health

    [Header("Movement")]
    public float moveSpeed = 3f;
    public float stoppingDistance = 1.5f;

    [Header("Attack")]
    public float attackInterval = 1f; // seconds between hits
    public EnemyStats stats;          // for contactDamage

    private Rigidbody rb;
    private float nextAttackTime;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
    }

    private void Start()
    {
        // Auto-wire target / health if not set in Inspector
        if (!playerHealth)
        {
            playerHealth = FindFirstObjectByType<PlayerHealth>();
        }

        if (playerHealth && !target)
        {
            target = playerHealth.transform;
        }

        nextAttackTime = Time.time;
    }

    private void FixedUpdate()
    {
        if (!target) return;

        // Work in XZ plane only
        Vector3 pos = rb.position;
        Vector3 targetPos = target.position;
        targetPos.y = pos.y;

        Vector3 toTarget = targetPos - pos;
        float distance = toTarget.magnitude;

        // Move toward player until within stoppingDistance
        if (distance > stoppingDistance)
        {
            Vector3 dir = toTarget.normalized;
            Vector3 newPos = pos + dir * moveSpeed * Time.fixedDeltaTime;
            rb.MovePosition(newPos);
        }

        // Try to attack when in range
        if (distance <= stoppingDistance)
        {
            TryAttack();
        }
    }

    private void TryAttack()
    {
        if (Time.time < nextAttackTime) return;
        if (!playerHealth) return;

        int dmg = stats != null ? stats.contactDamage : 5;
        playerHealth.TakeDamage(dmg);
        Debug.Log($"[Enemy] Melee hit player for {dmg} damage");

        nextAttackTime = Time.time + attackInterval;
    }
}
