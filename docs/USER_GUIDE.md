# Chudai Account Manager — User guide

Manage several Roblox accounts and launch them into the same game or server.

## Adding an account

**Recommended: Log in with browser**

1. Click **Add Account** in the ribbon, optionally type an alias, and click **Log in with browser**.
2. Sign in to Roblox in the window that opens (including 2-step verification).
3. CAM captures the cookie, checks it with Roblox, and closes the window by itself — **without logging out**.

The login window is private (InPrivate): nothing from it is kept on disk. Signing in to an account that is already in the list renews its cookie and keeps its alias and settings.

**Why not log out?** Logging out on roblox.com ends that session on Roblox's servers, so a cookie copied before logging out stops working ("Roblox rejected this cookie"). If you copy cookies by hand, use a private/incognito window per account and close the window instead of logging out.

**Manual: paste the cookie**

In a browser signed in to roblox.com: F12 → Application → Cookies → `.roblox.com` → `.ROBLOSECURITY`, then copy the whole value including the `_|WARNING…|_` part, paste it into **Add Account**, and click **Add Account**. The cookie is checked against Roblox before it is saved.

The cookie is equivalent to a password and bypasses 2FA. It is encrypted with Windows DPAPI before it is written to disk, so the stored file is useless on another PC or Windows user.

## Focus and selection

- **Click an account name** to see its details in **Properties**. This does not change the selection.
- **Tick the checkbox** to select an account. **Launch** and **Account tools** only use selected accounts.
- Keyboard: arrow keys move between accounts, Enter shows details, Space selects.

## Launching

1. Under **Properties → Launch target**, pick a **Game**: search by name, type a Place ID, or paste a roblox.com game link.
2. Optional:
   - **Job ID** — join one specific public server (pick one on the **Servers** page).
   - **Private server** — paste a VIP link, a share link, or `accessCode=<code>`.
   - **Follow player** — join whichever server that player is in. This overrides the game and server fields; their values are kept and come back when you clear it.
3. Select accounts and click **Launch**.

When several accounts are launched, each one waits until the previous client has joined, plus **Delay between launches**. **Cancel remaining** stops accounts that have not started yet. **Stop waiting** stops waiting for the current join. Neither closes a Roblox client that is already open.

The play button on a row launches only that account.

Everything in **Launch target** is remembered when you close the app, until you clear it.

## Saved servers

To keep a private server (or a specific server) for later:

1. Fill in **Launch target** — game, private server link, and/or Job ID.
2. Click the **bookmark** button next to *Launch target*. It turns into a check mark when saved.

To use it again, open **Saved ▾** in Properties and pick it, or press **Use** in **Saved servers** on the Servers page. The game, Job ID, and private server are filled in at once (Follow player is cleared). Rename or delete entries on the Servers page; deleting needs a second click.

## Resource saver (AFK accounts)

For accounts that only sit in a game, turn on **Properties → Account → Resource saver**, or use **Account tools → Resource saver → Turn on** for several selected accounts. From the next launch the account runs at 10 FPS, with low graphics and low process priority. Measured on Violence District at 10 FPS: CPU about −66%, GPU about −69%.

In **Account tools**, choose the **FPS** and **RAM** limit before clicking **Turn on**; they default to 10 FPS and 512 MB. For one account, change them under Properties (**Saver FPS**, **RAM limit**). While resource saver is on, its FPS replaces the account's FPS limit; turning resource saver off brings the FPS limit back.

Optional extras per account:

- **Minimize** — minimizes the window after it joins. GPU drops to 0%, but the client uses about 750 MB more private memory and twice the GPU memory.
- **Saver FPS** — 3, 5, 10 (default), 15, 20, 30, or 60. 3 FPS measured about 20% less CPU and 70% less GPU than 10 FPS, with the same RAM. Higher is smoother but uses more CPU and GPU.
- **RAM limit** — set to 512 MB when you turn resource saver on (choose Off to disable). It caps the client's physical memory. Windows compresses the rest and keeps it in RAM (not on disk while memory is free). 512 MB is recommended: it saved about 54% physical RAM in testing. 128 MB saves about 200 MB more per client, but roughly doubles CPU use; choose it only when RAM, not CPU, is what runs out.

RAM itself mostly depends on the game's map and assets; graphics settings do not reduce it.

If Roblox restarts a client in another installed version (it does this during some updates), the restarted client loses the RAM limit and low priority for that session. Output says so, and CAM starts that version directly from the next launch.

## FPS limit

**FPS limit** sets Roblox's own *Maximum Frame Rate* setting just before that account launches. Roblox no longer accepts FPS flags in ClientAppSettings.json. The setting is shared by all Roblox clients on this PC; when an account without a limit launches, your own setting is restored — unless you changed it in Roblox since.

## Roblox tray process

Recent Roblox versions keep a small process in the system tray after a game closes, and hand the next launch to it. That process does not re-read FPS limits, Fast Flags, or resource-saver settings, so CAM ends it (only when it is idle, never a running game) right before each launch.

## Multi-instance

Running more than one Roblox client needs **Multi-instance: On** in the ribbon. It is always off when the app starts. Roblox's anti-cheat vendor has said running multiple clients may be treated as suspicious behaviour, so turn it on only when you need it.

## Other pages

- **Servers** — browse public servers for a game, filter by free slots and region, and use one as the launch target.
- **History** — games launched from this app; click one to make it the launch target.
- **Client versions** — choose which installed Roblox version launches, add a downgraded folder, or download a version from Roblox's CDN.
- **Fast Flags** — flags written to the client's `ClientAppSettings.json` on save and before every launch.
- **Appearance** — colour presets, custom colours, and **Density** (Compact or Comfortable).

## Cookie refresh

**Cookie refresh → Refresh all cookies now** issues fresh cookies. With auto-refresh on, only accounts idle for a long time are refreshed at startup.

## Hide usernames

**Hide usernames** masks Roblox usernames for recordings and screenshots. Aliases and avatars stay visible.

## Where data is stored

- Accounts: `%APPDATA%\RobloxAccountManager\accounts.json` (cookies encrypted with DPAPI).
- Downloaded Roblox versions: `%LOCALAPPDATA%\ChudaiAccountManager\Versions`.
