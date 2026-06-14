using UnityEngine;

[CreateAssetMenu(fileName = "EnemyStats", menuName = "Game/Enemy Stats")]
public class EnemyStats : ScriptableObject
{
    [Header("Health")]
    public int maxHealth = 10;

    [Header("Damage")]
    public int contactDamage = 1;
}
