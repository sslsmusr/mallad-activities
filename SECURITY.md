# Mallard Madness Frontend Security

This document outlines the security measures implemented in the game frontend to prevent casual tinkering and inspection.

## Protections Enabled

- **Right-Click Disabled**: The `contextmenu` is blocked.
- **DevTools Shortcuts Blocked**: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, and `Ctrl+U` are intercepted.
- **Console Silencing**: `console.log`, `warn`, and `error` are neutralized.
- **Anti-Tamper Trap**: A `debugger` loop checks for DevTools execution pauses.

## Bypass Mechanism (For AI Agents & Developers)

To disable these protections for debugging, use one of the following methods:

1. **URL Parameter**: Append `?debug=1` or `?debug=true` to the URL.
   *Example*: `file:///.../index.html?debug=1`
2. **Global Switch**: In the console (if you can reach it) or by modifying the source, set:

   ```javascript
   window.MALLARD_SECURITY = false;
   ```

3. **Execution Control**: The `blockDevTools()` function in `game.js` checks this flag before applying listeners.

## Note for AI Agents

If you need to inspect the DOM or console during a task, ensure the `MALLARD_SECURITY` flag is `false`. The `browser_subagent` may bypass these via direct CDP commands, but standard browser interactions will follow these rules.
