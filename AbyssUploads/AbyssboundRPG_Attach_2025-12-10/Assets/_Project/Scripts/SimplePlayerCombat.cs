using UnityEngine;

public class SimplePlayerCombat : MonoBehaviour
{
    [Header("Attack Settings")] 
    public float attackRange = 1.5f;
    public float attackCooldown = 0.4f;
    public int attackDamage = 1;

    [Header("Targeting")] 
    [Tooltip("Layer mask used to filter which colliders are considered enemies.")]
    public LayerMask enemyLayerMask;

    private float _nextAttackTime;

    private void Update()
    {
        // Left Mouse Button triggers an attack.
        if (Input.GetMouseButtonDown(0))
        {
            TryAttack();
        }
    }

    private void TryAttack()
    {
        if (Time.time < _nextAttackTime)
        {
            return; // Still on cooldown
        }

        _nextAttackTime = Time.time + attackCooldown;

        Vector3 origin = transform.position;
        Collider[] hits = Physics.OverlapSphere(origin, attackRange, enemyLayerMask, QueryTriggerInteraction.Ignore);

        for (int i = 0; i < hits.Length; i++)
        {
            SimpleEnemyDummy enemy = hits[i].GetComponent<SimpleEnemyDummy>();
            if (enemy != null)
            {
                enemy.TakeDamage(attackDamage);
            }
        }
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
    }
}
