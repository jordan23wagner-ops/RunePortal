using UnityEngine;

public interface IPlayerInputSource
{
    Vector2 GetMoveInput();
    bool GetDashPressed();
}

/// <summary>
/// Default legacy Input Manager implementation using WASD / arrow keys and Space for dash.
/// </summary>
public class KeyboardPlayerInputSource : IPlayerInputSource
{
    public Vector2 GetMoveInput()
    {
        float h = Input.GetAxisRaw("Horizontal");
        float v = Input.GetAxisRaw("Vertical");
        return new Vector2(h, v);
    }

    public bool GetDashPressed()
    {
        return Input.GetKeyDown(KeyCode.Space);
    }
}
