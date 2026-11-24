# Chudai Account Manager — User guide

Manage several Roblox accounts and launch them into the same game or server.

## The window at a glance

- **Navigation** on the left has two parts. The narrow **icon bar** holds the pages (Accounts, Dashboard, Servers, History, Monitor, Client versions, Fast Flags) and, at the bottom, **?** (keyboard shortcuts) and Settings. Next to it, the **sidebar** shows the page's name, a short description and the page's own sections: folders on Accounts, Browse/Saved on Servers, Games/Disconnects on History, Clients/Windows on Monitor, and the categories of Settings. The arrow next to the page name folds the sidebar away (**Ctrl+B**); the page then shows its name and sections in a strip at the top, with a button to unfold the sidebar again. On Accounts the folders become a **folder** menu in the action bar, and Multi-instance, Sign-in protection and Hide usernames become a small pill in the title bar (the icons of the switches that are on; click it to change them). A dot on Settings means a new version is ready in About. On a narrow window the unfolded sidebar slides over the page and folds again when you click outside it.
- **Accounts** page: the action bar (Launch, Account tools, the account filter, Refresh, Cookies, Add account), the **status tabs** (All accounts, Running, Healthy, Needs attention, Not checked, each with its count), the account list, and the **side panel** on the right with two tabs, **Launch** (launch target and behaviour) and **Account** (details of the account you clicked). The arrow at the panel's top right folds it to a strip of two icons; click an icon to open that tab. When the window is too narrow for the list and the panel side by side, the panel is a drawer over the list that stays closed until you click the launch target next to Launch, press **Enter** or double-click an account, or choose **Details** in its ⋯ menu; **Esc** closes it. Without a Client column, a running account shows **· Running** in its Status, and an account whose cookie was rejected has a **Refresh** button in its row.
- The title bar keeps the search box (**Ctrl+K**) in the middle. Running clients and RAM are on the **Monitor** page.
- **Output** at the bottom: every message the app writes. **Ctrl+J** opens or closes it. Errors also show a badge and a strip above the log.
- **Ctrl+K** searches accounts, pages and commands from anywhere.

## Adding an account

**Recommended: Log in with browser**

1. Click **Add account** at the top of the Accounts page (or press **Ctrl+N**), optionally type an alias, and click **Log in with browser**.
2. Sign in to Roblox in the window that opens (including 2-step verification).
3. CAM captures the cookie, checks it with Roblox, and closes the window by itself — **without logging out**.

The login window is private and uses its own temporary browser profile, which is deleted after each sign-in. Signing in to an account that is already in the list renews its cookie and keeps its alias and settings.

**If the PC freezes or restarts while signing in**, turn on **Sign-in window: software rendering** in Add account. The Roblox page is then drawn without the graphics card. It turns on by itself when the previous sign-in never finished.

**Why not log out?** Logging out on roblox.com ends that session on Roblox's servers, so a cookie copied before logging out stops working ("Roblox rejected this cookie"). If you copy cookies by hand, use a private/incognito window per account and close the window instead of logging out.

**Manual: paste the cookie**

In a browser signed in to roblox.com: F12 → Application → Cookies → `.roblox.com` → `.ROBLOSECURITY`, then copy the whole value including the `_|WARNING…|_` part, paste it into **Add account**, and click **Add Account**. The cookie is checked against Roblox before it is saved.

The cookie is equivalent to a password and bypasses 2FA. It is encrypted with Windows DPAPI before it is written to disk, so the stored file is useless on another PC or Windows user.

### Many accounts at once

**Add account → Import many…** takes a list of cookies, one account per line. Plain cookies and `username:password:cookie` lines both work; passwords are ignored and never stored. **Import Roblox Account Manager file…** reads its `AccountData.json` (from this PC and Windows user; a file locked with a Roblox Account Manager password must be unlocked there first); alias and description come along as alias and notes. Each account is checked with Roblox one after another and every line shows its result. An account that is already in the list gets the new cookie and keeps its settings.

## Folders

Folders keep different kinds of accounts apart, for example a *Farming* folder and a *Boosting* folder. Each account is in one folder, or in *Ungrouped*.

- **Create**: click the **New folder** button at the top of the folder list. Pick a name, a color, and an icon.
- **Move accounts**: drag an account onto a folder in the folder list. Dragging a ticked account moves every ticked account. Without a mouse: an account's **⋯ → Move to folder**, **Folder** in the account panel, or **Account tools → Folder** for all ticked accounts.
- **Select or launch a folder**: the folder's checkbox ticks all of its accounts; its **⋯ → Launch folder** launches them.
- **Show one folder**: click the folder's name. **All accounts** shows everything; **Running** and **Needs attention** show running accounts and accounts that are banned, locked, restricted or signed out. The choice is remembered.
- **Rename**: double-click the folder name, or press F2. **Reorder**: ⋯ → Move up / Move down. **Delete**: ⋯ → Delete folder; its accounts stay and move to Ungrouped.
- **Resource saver preset**: ⋯ → Color, icon & saver preset. When it is on, every account in the folder gets those resource saver settings, and so does every account moved in later. You can still change an account on its own; the account panel shows when it differs from its folder and offers **Apply folder preset**.

### Order

With the list sorted in your own order (click a column header until the arrow disappears), drag accounts above or below another account to reorder them; a line shows where they will land. Dropping them next to an account in another folder also moves them into that folder. **Alt+Up** and **Alt+Down** move the focused account within its folder.

## Focus and selection

- **Click an account** to see its details in the side panel's **Account** tab. This does not change the selection.
- **Launch this account only** (in an account's **⋯** menu) launches just that account with the current launch target, without touching the ticks.
- **Tick the checkbox** to select an account. **Launch** and **Account tools** only use ticked accounts.
- Keyboard: arrow keys move between accounts, Enter shows details, Space ticks.

## Launching

1. In the side panel's **Launch** tab, under **Launch target**, pick a **Game**: search by name, type a Place ID, or paste a roblox.com game link.
2. Optional:
   - **Job ID** — join one specific public server (pick one on the **Servers** page).
   - **Private server** — paste a VIP link, a share link, or `accessCode=<code>`.
   - **Follow player** — join whichever server that player is in. This overrides the game and server fields; their values are kept and come back when you clear it.
3. Tick accounts and click **Launch** (or press **Ctrl+Enter**). With nothing ticked, Launch starts the account you clicked.

When several accounts are launched, each one waits until the previous client has joined, plus **Delay (s)**. **Cancel remaining** stops accounts that have not started yet. **Stop waiting** stops waiting for the current join. Neither closes a Roblox client that is already open.

The play button on a row launches only that account.

Everything in **Launch target** is remembered when you close the app, until you clear it.

### Same server, FPS for one launch

**Launch behavior → Same server** puts every ticked account (or a launched folder) in one public server: **Pick one with room for all** finds the fullest server that still fits all of them; **Follow the first account** sends the rest to the server the first account joined. It's ignored when the launch target already names a server (Job ID, private server, Follow player). **FPS limit** applies to that launch only, instead of each account's FPS and the resource saver FPS; auto-rejoin keeps it. Leave it empty to use each account's setting.

After launching several accounts, **Selection** in the Launch tab offers **Select them** for the ones that failed, so you can launch just those again.

### Last server, friends, private servers

The Account tab shows each account's **Last server** (from its Roblox log). **Rejoin** (the arrow) launches the account there after checking the server still exists; private servers can't be rejoined this way. The **people** button next to Follow player lists the account's online friends and your own accounts that are in a game. On the Servers page, **Private** lists the private servers the account can see in the game; **Use** sets one as the launch target.

## Saved servers

To keep a private server (or a specific server) for later:

1. Fill in **Launch target** — game, private server link, and/or Job ID.
2. Click the **bookmark** button next to *Launch target*. It turns into a check mark when saved.

To use it again, open **Saved ▾** in the Launch tab and pick it, or press **Use** in **Saved servers** on the Servers page. The game, Job ID, and private server are filled in at once (Follow player is cleared). Rename or delete entries on the Servers page; deleting needs a second click.

## Resource saver (AFK accounts)

For accounts that only sit in a game, turn on **Resource saver** in the Account tab, or use **Account tools → Resource saver → Turn on** for several ticked accounts. From the next launch the account runs at 10 FPS, with low graphics and low process priority. In an earlier test on Violence District against no saver, 10 FPS used about 66% less CPU and 69% less GPU.

**Account tools** also has two one-click profiles for the ticked accounts; main accounts are left out. **Balanced AFK** is 10 FPS with a 512 MB RAM limit. **Deep AFK** is 3 FPS with a 256 MB RAM limit, for accounts you only leave idle. Measured separately on one game while idle in a lobby: 3 FPS used about 68% less GPU than 10 FPS, and a 256 MB limit used about 216 MB less physical RAM than 512 MB. Both profiles apply from the next launch.

**Settings → Behavior → Light graphics** launches clients with low graphics without changing their FPS or RAM limits. Main and Full quality accounts keep their own Roblox graphics. It is on for new installations and stays off for existing ones until you turn it on.

**Settings → Behavior → Trim background clients** (off by default) is for clients you run without a RAM limit. Every 10 seconds CAM looks for a background client using more than 768 MB and asks Windows to trim its working set, at most once every 2 minutes per client. It never touches Main or Full quality accounts, the client in front, a client that is not responding, a client started less than 2 minutes ago, or a client already held by a resource saver RAM limit (trimming those saved nothing in testing). Measured on one game with one client: about 2.3 GB went down to about 0.5 GB on average, Windows had about 0.9 GB more free RAM, and CPU did not rise while the game was quiet (busier moments in the game varied too much to compare). Switching to a trimmed client can stutter for a moment while Windows brings its memory back. Trimming changes no setting on the client, so there is nothing to undo when CAM closes.

**Monitor** shows whether each running client's limits are in place (Limits column). **Limits applied** means the RAM limit and low priority were set and are still holding. **Not fully applied** means one failed or was lost; hover over it for details. FPS and graphics can only be shown as requested, because Windows doesn't report them.

In **Account tools**, choose the **FPS** and **RAM** limit before clicking **Turn on**; they default to 10 FPS and 512 MB. For one account, change them in the Account tab (**Saver FPS**, **RAM limit**). While resource saver is on, its FPS replaces the account's FPS limit; turning resource saver off brings the FPS limit back.

Optional extras per account:

- **Minimize** — minimizes the window after it joins. GPU drops to 0%, but the client uses about 750 MB more private memory and twice the GPU memory.
- **Saver FPS** — 3, 5, 10 (default), 15, 20, 30, or 60. 3 FPS measured about a third less CPU and 68% less GPU than 10 FPS while idle, with the same RAM. Higher is smoother but uses more CPU and GPU.
- **RAM limit** — set to 512 MB when you turn resource saver on (choose Off to disable). It limits the client's working set (the memory it holds in RAM), not its total private commit. Windows compresses the rest and keeps it in RAM (not on disk while memory is free), so counting the compressed part, 512 MB still means about 1 GB of physical RAM per client. Lower values can increase CPU use and page faults. 512 MB is recommended: it saved about 54% physical RAM in an earlier test against no limit. In the latest test, 128 MB used about 320 MB less physical RAM per client than 512 MB, with somewhat more CPU; choose it only when RAM, not CPU, is what runs out.

RAM itself mostly depends on the game's map and assets; graphics settings do not reduce it.

If Roblox restarts a client in another installed version (it does this during some updates), the restarted client loses the RAM limit and low priority for that session. Output says so, and CAM starts that version directly from the next launch.

## Auto-rejoin

For accounts that must stay in a game, turn on **Auto-rejoin** in the Account tab, or use **Account tools → Auto-rejoin → Turn on** for several ticked accounts. It can also be part of a folder's preset.

When the account's client is disconnected by Roblox (kicked, server shut down, connection lost), closes unexpectedly, or stops responding for about a minute, CAM closes what is left of it and launches the account again into the same game, through the normal launch path, so resource saver, sign-in protection and the account check apply again. Output says what happened and when it rejoined.

- It never rejoins when you leave the game or close the client yourself, when another client replaced it, or when the same account was launched somewhere else.
- Rejoins happen one at a time, and wait while a launch from the Launch button is running.
- The first wait is 10 seconds and doubles for each recent rejoin of that account (up to 2 minutes). After 5 rejoins of one account within 15 minutes it stops and says so, because something is wrong with the account or the game.
- With auto-rejoin off, a disconnect or crash is only reported in Output ("allow disconnects").
- It never rejoins a sign-in problem: Roblox asking for a human check, refusing the sign-in (error 403), or the client signing in as another account. A new client would hit the same problem; Output says to sign in to the account again.
- Just before rejoining, CAM looks again: if the client reconnected, started responding again, or you launched the account yourself meanwhile, the rejoin is cancelled.
- With multi-instance off and other Roblox clients open, it doesn't rejoin, because the new client would close the others.
- If launching fails for a reason that may pass (network down, Roblox busy), CAM keeps trying for up to an hour, waiting longer each time. A dead cookie stops it at once.
- Only rejoins that actually launched count towards the limit of 5 in 15 minutes.
- Clients keep being followed when CAM restarts (for example after an update): auto-rejoin still works for them.
- An account that already has a client open can't be launched again: the second client would sign the first one out.

## Anti-AFK

Roblox disconnects a player after 20 minutes without input (error 278). Turn on **Anti-AFK** in the Account tab, or **Account tools → Anti-AFK → Turn on** for several accounts; it can also be part of a folder's preset.

While you're away from the PC (no keyboard or mouse input for 5 seconds), each of those clients that is in a game is brought to the front for a moment, gets one real **F13** key press (no game uses F13, so the character doesn't move), and the window you had in front gets the focus back. A minimized client is restored for the press and minimized again. The interval is set in Account tools (default every 15 minutes, for all accounts).

- It waits while you use the PC, and stops a round as soon as you touch the keyboard or mouse.
- It never runs while a full-screen app, full-screen game or presentation is running, so it doesn't take the focus from your own game.
- A client that isn't responding is skipped. If a client is still kicked for idling, auto-rejoin (if on) brings it back.

## FPS limit

**FPS limit** sets Roblox's own *Maximum Frame Rate* setting just before that account launches. Roblox no longer accepts FPS flags in ClientAppSettings.json. The setting is shared by all Roblox clients on this PC, so CAM writes the account's value only until that client has read it (a few seconds), then puts yours back; the client keeps its limit. When a resource-saver client closes, Roblox saves its low value again, and CAM puts yours back within a second. The same goes for resource saver's graphics flags. If you pick the very same value as a saver in Roblox's menu, CAM can't tell it apart and restores your previous one.

## Client windows

**Monitor → Windows** lists the open Roblox windows with the account they belong to. **Tiny** (the shrink button) makes one smaller than Roblox's 800×600 minimum, at the **Tiny size** you pick (320×180 to 640×360); **Normal size** puts it back where and how big it was. **Tile tiny** does that for every client and lines them up. **Minimize all** and **Restore all** do what they say; tiny windows stay tiny after a restore, and also when you drag them by the title bar. Dragging a tiny window's *edge* still snaps it to Roblox's minimum: pick a size here instead. **Tile** and **Cascade** arrange normal-size windows; **Move…** places one window exactly.

A smaller window draws much less at high frame rates (measured at 2048×1080 with no FPS limit: GPU 25.7% full size, 5.7% at 320×180, 0% minimized). The saving on top of resource saver's low FPS hasn't been measured yet. **Start tiny** (Account tab, or a folder's preset) makes an account's client tiny right after it joins, also after an auto-rejoin.

Point at a window's **eye** button to see a live preview of it. A minimized client draws nothing, so it has no preview.

## Running clients, shutdown, logs

**Monitor** lists every running client with its account, status, Roblox version (and whether it is the pinned one), CPU and physical RAM trends, memory, GPU and graphics memory. Click a row for its details; the × closes one client (it isn't rejoined). **Close all** asks every client to close and **End all Roblox** ends them at once (also Roblox's tray process); hold either button for a second. Both cancel pending auto-rejoins. The **emergency hotkey Ctrl+Alt+End** (off by default) does End all Roblox from anywhere, even while a game is in front.

**Monitor → RAM capacity** estimates the physical RAM your Roblox clients use, and how many more would fit as Normal, Balanced AFK or Deep AFK. The estimate comes from one game while idle in a lobby, so real use depends on the game. A client with a RAM limit still uses more physical RAM than its limit, because Windows compresses the rest. Set a **RAM budget** to cap all clients together: when a launch would go over it, CAM asks before launching, and auto-rejoin waits and reports in Output until there is room. Leave it empty to turn it off.

**Settings → Maintenance → Shut down the PC** schedules Windows to shut down in 30 minutes to 12 hours; with **Close Roblox clients first**, every client leaves its game 30 seconds before. **Call off** cancels it. **Settings → Maintenance → Roblox logs → Clean up** removes Roblox's logs and crash dumps that are more than a day old.

**History → Disconnects & crashes** lists every disconnect, crash, freeze and sign-in problem of clients launched by CAM, with Roblox's reason. **Play again** launches that account into the same game (a new server).

## Launch arguments

Client versions → **Launch arguments** are added after the launch link for every account that has none of its own. An account's own arguments are in the Account tab (leave the field empty to use the default). With arguments, CAM starts RobloxPlayerBeta.exe directly, because the roblox-player: link can't carry them; with Automatic selected that is the newest installed version. Quotes and `& | < > ^` are refused.

## Folder profiles

A folder's menu (⋯ next to it) → **Export profile…** saves the folder's name, colour, icon and saver preset to a `.camprofile` file. It holds no accounts, cookies or IDs, so it's safe to send to a friend. To use one: **New folder → Import profile…**. If a folder with the same name exists, CAM shows what would change and asks first; on **Replace** it gets the profile's colour, icon and preset, and the preset is applied to its accounts. Other profiles become new, empty folders.

## Discord notifications

**Settings → Notifications**. In Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL, then paste it here and **Save**. Pick what to hear about, and use **Send test** to check. The webhook URL is stored encrypted and never shown again; **Remove** stops all messages. Messages name accounts by alias and never carry a cookie, ticket or launch link.

## Appearance

**Settings → Appearance**:

- **Language** → English or Bahasa Indonesia. The switch is instant and remembered on this PC. Your account names, notes and game names are left as they are. This guide, Windows dialogs (file pickers, Windows Hello), the tray menu and some rarer messages stay in English.
- **Density** (Compact or Comfortable), **Interface size** (Small, Default, Large) and **Animations**, remembered on this PC.
- **Theme**: Dark or Light mode and a theme card (Black, Graphite, Dim, Forest in dark mode; Paper, Studio Light, Mist, Sage in light mode). **Customize colours** opens four colours of your own; **Reset to default** goes back to the mode's default. Every change applies and is saved at once. Switching mode keeps your selection colour when it stays readable on the new background. The contrast check warns if your own colours make text hard to read.
- **Account list**: which extra columns show when there is room.

## Tray and shortcuts

The tray icon shows CAM when clicked; its menu launches a folder or picks a saved server, closes or ends every client, and quits. With **Settings → Behavior → Close button: Hides to the tray**, the window's close button hides CAM instead of quitting. While hidden this way, CAM asks its window engine to release memory, and returns to normal when you open it.

Shortcuts (press **?** to see them all):

- **Ctrl+K** search accounts, pages and commands; **Ctrl+F** filter accounts.
- **Ctrl+N** add an account; **Ctrl+Enter** launch the ticked accounts, or the clicked one when nothing is ticked.
- **Ctrl+1 … Ctrl+6** Accounts, Servers, History, Monitor, Client versions, Fast Flags; **Ctrl+7** Appearance; **Ctrl+8** About; **Ctrl+9** Dashboard; **Ctrl+,** Settings.
- **Ctrl+J** show or hide Output; **Ctrl+B** fold or unfold the sidebar.
- **F11** full screen without borders; press it again to go back to the window at the size it had.
- Notifications in the corner: swipe one up, down or to the right to dismiss it. It stays while the pointer is on it.

## Roblox tray process

Recent Roblox versions keep a small process in the system tray after a game closes, and hand the next launch to it. That process does not re-read FPS limits, Fast Flags, or resource-saver settings, so CAM ends it (only when it is idle, never a running game) right before each launch.

## Multi-instance

Running more than one Roblox client needs **Multi-instance** on (the switch at the top of the Accounts page). It is always off when the app starts. Roblox's anti-cheat vendor has said running multiple clients may be treated as suspicious behaviour, so turn it on only when you need it.

Turn it on before opening any Roblox game. Roblox keeps a small tray process after a game closes; CAM closes that idle process when multi-instance is turned on, so it cannot take over. If a Roblox game opened earlier is still running, CAM offers **Take over**: it closes Roblox's single-instance lock inside that game (nothing else in it is touched), so the game keeps running next to the clients CAM starts. If you'd rather not, close the game and turn multi-instance on again.

Multi-instance works alongside executors and other multi-Roblox tools, including ones that run as administrator. If such a tool already holds Roblox's single-instance lock, CAM shares it.

## Sign-in protection

All Roblox clients on a PC share one sign-in file. Without protection, every launch writes that account's session into it, so the file always holds the last account launched; other clients and your own Roblox can pick it up.

**Sign-in protection** (the switch next to Multi-instance; on by default) locks that file while multi-instance is on, from the first launch until the last Roblox client closes. It shows **Active** while it is locked.

- After each join, CAM checks that the client signed in as the account it launched. If not, the client is closed and Output says so.
- If a client disconnects while protection is on, Output shows the reason from Roblox's log.
- To open Roblox yourself while CAM's accounts are running, turn sign-in protection off first; it unlocks at once.

## Main account and Full quality

In the Account tab, **Main account** leaves an account out of Select all, bulk resource saver and folder presets. **Full quality** stops folder presets from lowering that account's FPS, graphics, RAM limit or window size. Either way you can still select the account yourself or change its settings by hand.

## Network connections

CAM talks to roblox.com services and Roblox's download CDN, and to GitHub when it checks for an update. Two others are used only if you turn them on:

- **ip-api.com**, only when you use Auto-locate or Locate on the Servers page. Each lookup sends the server's address without encryption, and makes one Roblox join request with the account. The region is an estimate.
- **Discord**, only after you save a webhook.

## Security, backup and diagnostics

**Settings → Security → Windows Hello** (off by default): when on, Copy cookie first asks for your face, fingerprint or Windows PIN. Turning the option on or off asks once too, so nobody at your PC can simply switch it off. If Windows Hello isn't set up, the reason is shown under the option.

**Settings → Backup → Back up accounts…** saves one `.cambak` file protected by a password you choose (at least 8 characters): every account with its cookie, folders with their presets, and saved servers. The accounts file itself only opens on this PC and Windows user; the backup opens anywhere with its password, so keep both safe — anyone with the file and the password can sign in to the accounts, and a forgotten password can't be recovered. **Restore from backup…** adds the accounts you don't have. For accounts you already have, choose **Keep mine** or **Replace with the backup**; a replacement only happens when the backup's cookie still signs in as that account. Folders are matched by name and created when missing.

**Settings → About → Diagnostics → Copy diagnostics** copies a report to the clipboard (or **Save to file…**): Windows and graphics driver versions, crashes, blue screens and graphics resets from the last 7 days, and this app's state. It only reads, and contains no cookies, account names or your Windows user name. Paste it into your bug report.

## Updates

Chudai Account Manager checks for a new version once, a few seconds after it opens, and Output says so when one is available. **Settings → About → Updates** shows the new version and its notes; **Install update** downloads it, checks its digital signature (an altered or fake installer is refused), installs it, and reopens the app. Your accounts and settings are kept.

Install update is disabled while Roblox clients are running: installing closes this app, which would also close them. Close the clients first.

Updates work for the copy installed with the setup program. A loose copy of the .exe (for example one copied to the desktop) cannot update itself; install with the setup program once.

## Other pages

- **Dashboard** — one account at a time: its avatar in 3D (drag to turn, scroll to zoom, right-drag to move; **Auto-rotate** and **Reset view** under it), its session, account details, resources and limits, and below them what every client is playing and a table of all accounts. Change the account with the card deck under the avatar (drag, scroll, ← → or click) or by clicking a row in the table; the Dashboard remembers your choice. The 3D models are fetched from Roblox with each account's sign-in and prepared in the background while CAM runs (soon after it opens, then every 30 minutes); while the Dashboard is open the selected avatar is also checked every 20 seconds and the others every 2 minutes, and a changed avatar swaps in by itself. Roblox sometimes needs several minutes to make an avatar's 3D files; CAM keeps checking and shows the model as soon as it is ready. When Roblox is still preparing a model you see the last saved one (with a note), or Roblox's 2D full-body picture if there is none yet; the 3D model replaces it as soon as it is ready. If your PC can't show 3D (no WebGL) you see the 2D picture. A banned, locked or signed-out account still shows its avatar, fetched with another of your accounts (never the main account). Refresh an account once if its avatar never loads: CAM needs its Roblox user ID. The saved models take about 0.7 MB per account, never more than 150 MB together, and are not written at all when the drive has less than 1 GB free.
- **Servers** — browse public servers for a game, filter by free slots and region, and use one as the launch target.
- **History** — games launched from this app; click one (or press Enter) to make it the launch target.
- **Monitor** — every running Roblox client in one table: status (joining, in game, disconnected, …), CPU, estimated physical RAM, private/shared/compressed RAM, commit, GPU and graphics memory, reads and writes, uptime, automatic rejoins and limits; click a column to sort. **Physical RAM (est.)** is the RAM a client really takes: its private pages in RAM, its share of the pages it shares with clients of the same Roblox version, and its share of Windows' compressed memory (Windows doesn't report that part per program, so it is an estimate). Updated every 3 seconds while the page is open.
- **Client versions** — choose which installed Roblox version launches, add a downgraded folder, or download a version from Roblox's CDN.
- **Fast Flags** — flags written to the client's `ClientAppSettings.json` on save and before every launch.
- **Settings** — General (start page, Output at startup), Appearance, Behavior, Notifications, Security, Backup, Maintenance and About.

## Roblox website as an account

In the Account tab, the **globe** button opens roblox.com signed in as the focused account; the button next to it opens the account's profile. Each account gets its own private window that keeps nothing after it closes. Log out is blocked in that window, because logging out on roblox.com ends the session CAM stores for the account; to stop using an account, delete it in CAM instead. The window only goes to roblox.com (and the Apple/Google sign-in pages), and Play buttons do nothing: launch games from CAM.

## Cookie refresh

**Cookies ▾ → Refresh all cookies now** (top of the Accounts page) issues fresh cookies. With auto-refresh on, only accounts idle for a long time are refreshed at startup.

## Hide usernames

**Hide usernames** (top of the Accounts page) masks Roblox usernames for recordings and screenshots. Aliases and avatars stay visible.

## Where data is stored

- Accounts: `%APPDATA%\RobloxAccountManager\accounts.json` (cookies encrypted with DPAPI).
- Downloaded Roblox versions: `%LOCALAPPDATA%\ChudaiAccountManager\Versions`.
