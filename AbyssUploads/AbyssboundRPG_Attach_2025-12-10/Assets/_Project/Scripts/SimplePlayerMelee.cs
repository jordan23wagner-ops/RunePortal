using UnityEngine;

public class SimplePlayerMelee : MonoBehaviour
{
    [Header("Attack Settings")]
    public int damagePerHit = 10;
    public float attackRange = 1.8f;
    public float attackCooldown = 0.3f;

    private float nextAttackTime = 0f;
    private PlayerHealth playerHealth;

    private void Awake()
    {
        playerHealth = GetComponent<PlayerHealth>();
    }

    private void Update()
    {
        // Optional: prevent attacking when truly dead
        if (playerHealth != null && playerHealth.CurrentHealth <= 0)
            return;

        if (!Input.GetMouseButtonDown(0)) // left mouse button
            return;

        if (Time.time < nextAttackTime)
            return;

        PerformAttack();
    }

    private void PerformAttack()
    {
        nextAttackTime = Time.time + attackCooldown;

        Vector3 center = transform.position;

        // Hit ANY collider around the player, including triggers
        Collider[] hits = Physics.OverlapSphere(
            center,
            attackRange,
            ~0, // no layer filter for now
            QueryTriggerInteraction.Collide
        );

        bool hitSomething = false;

        foreach (var hit in hits)
        {
            SimpleEnemyDummy enemy = hit.GetComponentInParent<SimpleEnemyDummy>();
            if (enemy != null)
            {
                enemy.TakeDamage(damagePerHit);
                hitSomething = true;
            }
        }

        if (hitSomething)
        {
            Debug.Log($"[Player] Melee hit for {damagePerHit}");
        }
        else
        {
            Debug.Log("[Player] Melee swing hit nothing.");
        }
    }

    // Visualize melee range in the editor
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
    }
}
