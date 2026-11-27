# Changelog

## 0.14.7 — 27 Nov 2026

- **Updates that get stuck now end.** A download that receives no data for 2 minutes is stopped and reported, so you can try again (it used to say "Downloading…" for ever). A slow download that keeps receiving data is never cut off, and the install itself is never stopped. Changing the PC's clock doesn't affect this.
- If the app can't read the download's progress for a minute, it says so; pressing the download button again follows the download that is still running instead of starting a new one.
- About shows **Downloading** while the update downloads (it said Installing), also when the download was started from the top bar, and **Check now** waits until it's done.
- With Windows' reduce-motion setting, the download button's ring and the GitHub button no longer animate.

## 0.14.6 — 27 Nov 2026

- **Update from the top bar.** While a new version is available, a round download button sits next to the Chudai logo. One click downloads, checks and installs it, and the app reopens, without going to About. Its ring fills as the update downloads. It goes away when there's nothing to update; About's **Check now** updates it too.
- **GitHub** in Settings → About opens this app's page on GitHub in your browser.
- Anti-AFK: after pressing its key in a minimized client, the focus now always returns to the window you were using.

## 0.14.5 — 27 Nov 2026

- **Anti-AFK works with Roblox in full screen.** A client in full screen (F11) counted as a full-screen app, so anti-AFK kept waiting and Roblox disconnected it for idling after 20 minutes while you were away. A client that has Anti-AFK on is now kept active in full screen too. Other full-screen apps and games, and a Roblox game you're playing in full screen with an account that doesn't have Anti-AFK on, are still left alone. When one client with Anti-AFK on is in full screen and another one is due, the focus moves to that one for a moment and comes back, as it does without full screen. Checked for 26 minutes in a normal window and in a Tiny window (320×180, which keeps its size).

## 0.14.4 — 27 Nov 2026

- **Launch plan, as designed.** At the top one line says where accounts without their own target go; click it to change it. The accounts are grouped by game. Click a group's header to move all its accounts, or one account to send just that one somewhere else (it keeps that target for later launches; **Use default** takes it back). Accounts with their own server in a game are shown with it; the others follow the group's rule.
- **Target picker.** Search a game by name, type a Place ID or paste a game link, a Job ID, a private server link or a share link, or type a player's name to follow them. Without typing it lists the current game (any server, and for one account its own private server), recent games, saved servers, and friends in a game (your own accounts in a game join that exact server). An account's own target can now be a player to follow.
- **Server rule per game**, remembered for each game: **Roblox picks**, **Emptiest server for each**, **Own private server for each** (free ones are made for 0 Robux after you confirm; paid ones are never bought) or **All together** (one server with room for everyone; if none has room, the rest follow the first account). The old "Follow the first" choice is part of All together now.
- **Delay** is a number field with up and down arrows (also the arrow keys). The plan no longer has an FPS field: each account's FPS limit applies (Account tools or the details card).

## 0.14.3 — 26 Nov 2026

- **A cleaner Accounts page.** One header row holds the page's title with a summary (accounts, running, needing attention), the account filter, the folder menu, **Refresh ▾** (refresh all accounts or all cookies, and auto-refresh idle cookies) and **Add account**. Below it are two cards: the account list (a table: Account, Status, Client, Folder) and, always beside it, the **details card** of the account you clicked last. Its name, username, status and actions stay at the top while the rest scrolls; the eight actions fill one row. The list scrolls below its column headers. The Tiles view, the status filter, the FPS and Last launched columns, the "Own target" tag, the list footer and the ⋯ button on each row are gone (the right-click menu has the row's actions; a link to "needs attention" or "running" now selects those accounts).
- **Selection toolbar.** Tick accounts or click one and a toolbar rises at the bottom of the list: **Launch**, **Account tools** (quick resource saver, auto-rejoin, refresh cookies, own target, move to folder, copy usernames, and the full tools) and **Delete**. Esc, ✕ or a click on the empty list clears the selection. It steps away while Output is open. After you confirm a delete, the accounts fly into the toolbar's bin before they are removed; if the delete fails they stay selected.
- **Launch plan.** Launch (and Ctrl+Enter, and **Launch…** in the right-click menu) opens a plan: the launch target, the accounts grouped by where each one goes, Delay and FPS for this launch, then the progress in the same window. Closing it keeps the launch running. At the end it sums up, **Done** closes it after 3 seconds, and **Retry N failed** relaunches just those. The Launch and Account tabs of the side panel became the plan and the details card.
- CAM's window now opens, and stays, at least 1280 px wide.

## 0.14.2 — 25 Nov 2026

- **Only the app.** Developer measurement tools that were built into the program (hidden command-line switches) are gone from the installer and from the published source, which now holds just the app itself. Nothing you use changes.

## 0.14.1 — 24 Nov 2026

- **Server details in Browse servers.** Each located server now shows its **uptime** (counting live, every second), its **place version** (marked **latest**, or older when Roblox has updated the game since that server started), and a **Full** badge; Use is off on a full server. Sort by **Oldest server** or **Newest server** and filter to **Latest version only**, all without asking Roblox again. **Copy server link** gives a link anyone can open to join that exact server. Before launching into a chosen server on an older version, Output says Roblox may move you to another one.
- **Private server price in Discover.** A game's details now show whether it allows private servers and what they cost: **Free (0 Robux)**, **N Robux** or **Not allowed** (it used to say Not allowed for every game).
- **Own launch target per account.** Give an account its own game (and server) with **Own target** in its Account tab or right-click menu; one Launch then sends every account to its own game, and the rest to the main launch target. Server choices (emptiest, pick, follow) apply within each game.
- **Own private server for each.** A new **Server** choice in the Launch panel sends every account into its own private server in that game. Accounts that don't have one yet are listed once in a single question; when the game's private servers are **free**, CAM makes one for each (always 0 Robux). CAM never buys: when private servers cost Robux, accounts without one are skipped with a note, and a paid server whose period has ended is never turned back on.
- **Servers › Private servers** (new tab): every private server your accounts own, in every game, grouped by game. Rename, turn off or on, allow friends, make a new invite link, copy the link, use it as the launch target (its owner gets ticked), and stop renewal of paid ones. Tick several to change them together. Roblox has no way to delete a private server, so turn it off instead.
- Translated into Bahasa Indonesia like the rest.

## 0.14.0 — 24 Nov 2026

- **Right-click menu on accounts.** Right-click an account (or press **Shift+F10**) for its actions: Launch, Details, Refresh data, Refresh cookie, Rename, FPS limit, Copy cookie, Account tools, **Move to folder** (including **New folder…**, which creates the folder with the accounts in it), Select all and Delete. On a ticked account the menu acts on every ticked account ("Launch 3 accounts", "Move 3 accounts to folder"). The **Delete** key deletes the ticked accounts, or the account row that has the keyboard focus; it always asks first. **Delete** and **Add account** now sit next to the status filter, so the action bar has room for the rest.
- **Emptiest server for each account.** The Launch panel's **Server** choice (it was "Same server") adds **Emptiest server for each**: every account joins its own public server, the one with the fewest players first. With more accounts than servers that still have room, the rest share, and Output says so. It also works for one account. Roblox never lists empty servers, so the emptiest one has at least one player. The two "all in one server" choices are still there.
- **Private servers of all your accounts.** Servers › Browse servers › Private now lists the private servers every usable account can see in the game (it used to ask only the first account in the list), each server once. **Can join** shows which accounts can enter it. **Use** makes it the launch target and ticks those accounts (not the main account), and clears the account filters so you see them all. An account whose list couldn't be read is named; the rest still shows.
- **Delete several accounts at once.** Tick accounts and press Delete: the warning lists every account that will go. Deleting removes everything CAM keeps about them (cookie, settings, notes, history, disconnect notes, client tracking, cached 3D avatar) and closes their running clients first. **Also sign out on Roblox** (off by default) ends the saved sessions on Roblox too. The status tabs became one **status filter** dropdown.
- **Everything in Bahasa Indonesia.** Messages that came from the app's engine (auto-rejoin, Roblox errors, Windows Hello, downloads, backups, imports) are now translated, and so are the tray menu, the file dialogs, the Windows Hello prompts, the sign-in window title and the Discord messages and status.
- **Launch notes in Output.** Notes about a launch that were never shown now appear in Output with the account's name: that Roblox had an update (so this launch went through the Roblox launcher), that the FPS limit or a resource saver limit couldn't be applied, or that sign-in protection locked only some files.
- **Discord status.** Your Discord profile can show "Chudai" with the page you have open, or "Playing Roblox with Chudai" and how many clients are open (Settings → Notifications). It never blocks when Discord is closed or slow.
- **Servers › Discover**: Roblox's game charts with device, location and genre filters, search, a detail view, and one click to make a game the launch target or browse its servers.
- **Resource saver starts the window tiny.** Turning resource saver on also sets **Start tiny** (320 px wide) when it was off; tiny sizes 160 and 240 were added.
- **Fixed:** with Roblox's **Fullscreen** setting on, a tiny window could lose its title bar (no way to move, minimize or close it); it now always gets one, and **Normal size** brings back the window as it was. On Windows 10, Roblox icons no longer pile up in the tray after CAM ends Roblox's background process. The Launch panel no longer shows an old game after you picked another one, and picking another game clears the old Job ID and private server. After a Roblox update, Start tiny, minimize, auto-rejoin and the FPS reading work on the first launch too. Dropdowns inside dialogs (Account tools) were hidden behind the dialog. The empty part of the title bar next to the search box now moves the window like the rest.
- **Launches never use an outdated Roblox build**: when Roblox has an update, a launch that would start an old installed version goes through the Roblox launcher instead, so script tools see the build they expect. A version you pinned is never replaced.
- **Interface touches.** One dropdown style everywhere; Multi-instance, Sign-in protection and Hide usernames are switches; a new logo and launch animation; the window opens centred without a flash; the Dashboard stage became a small world around the avatar with the account's recent games around it. CAM always opens on Accounts.

- **Smoother Dashboard.** Full screen no longer stutters: the frosted cards over the 3D stage used a live blur that the PC had to redo on every frame the avatar moved (measured at 1920 px: about 40 frames a second with it, a steady 60 without; the cards look the same). Folding or unfolding the sidebar keeps 60 frames a second too: the 3D view and its background now resize once the width settles instead of on every step. Auto-rotate turns at the same speed whatever the frame rate, Reset view orbits back smoothly (it used to twitch right after a drag), and the stage stops drawing while it is dimmed behind the lower part. **New switch animation:** picking another account slides the avatar out the way the deck moved and the next one in from the other side, turning to face you, without the bounce. When the sidebar changes the width so the info cards move between the stage and the space under the deck, they now glide out to their side and rise into the new place instead of vanishing and reappearing.
- **Accounts on smaller windows.** When the window is too narrow for the account list and the side panel together (for example 1511×958 at 150 % scaling), the panel becomes a **drawer** over the list that stays closed until you ask for it: click the launch target next to Launch, press **Enter** or double-click an account, or choose **Details** in an account's ⋯ menu. **Esc**, the close button or the launch target again closes it. The list keeps its full width and all its columns. Without a Client column, a running account shows **· Running** in its Status, and an account whose cookie Roblox rejected gets a **Refresh** button right in its row (it waits while Refresh all runs, and Output names the account).
- **One Launch button.** Launch in the action bar launches the ticked accounts, or, when nothing is ticked, the account you clicked (**Ctrl+Enter** does the same; the bottom line names it). With several ticked it shows how many. An account the folder, the filter or a status tab hides is never the launch target (it loses the selection); opening an account from search or Monitor clears the filters so it is shown. Next to it, the **launch target** (game and icon, or the player being followed) opens the Launch panel. The Launch tab no longer has a second Launch button.
- **Folded sidebar takes no room.** Folding the sidebar (arrow or **Ctrl+B**) now hides it completely instead of leaving a second column of icons: the page shows its name and its sections in a strip at the top, with a button to unfold the sidebar. On Accounts a **folder** menu sits in the action bar (with New folder…), and **Multi-instance**, **Sign-in protection** and **Hide usernames** become a small pill in the title bar showing the icons of the switches that are on (point at it for their names, click it to change them). Ctrl+B folds and unfolds at once, without the animation. A new version no longer shows a notification; a dot on Settings in the icon bar opens About.
- **Dashboard** (new page, Ctrl+9, second in the icon bar): the selected account's avatar in **3D** that you can turn (drag), zoom (scroll) and move (right-drag), with **Auto-rotate** and **Reset view** in the middle under it. Pick the account from the deck of cards under the stage: the chosen card stays in the middle with the others stacked beside it; drag, flick, scroll, use ← → or click a card. Frosted cards beside the avatar show the **session** (game, place, starting → joining → in game, join time, rejoins, PID, Roblox version), the **account** (Robux, membership, folder, profile, auto-rejoin, anti-AFK, last launched; Launch, Bring to front, Close), the client's **resources** (CPU, GPU, GPU memory, physical RAM with a 2-minute chart, reads and writes, uptime) and its **limits and memory** (FPS and RAM limits with whether they hold, low priority, low graphics, private/shared/not-in-RAM). Below: **Playing now** (clients per game) and a **Clients** table of every account (click a row to show it above). Pointing at the lower part dims the stage. On a narrow window the info cards move under the deck so they never cover the avatar. Only real figures CAM measures are shown (no ping, server players or in-game FPS). Everything is automatic, with no extra buttons: while CAM runs, whatever page is open, it prepares the 3D model of every account in the background (8 seconds after it opens, then every 30 minutes), so the Dashboard shows 3D at once. Roblox sometimes has no 3D files for an avatar and makes them only minutes after being asked, and may remove them again soon after: for an account without a model CAM checks every 15 seconds for the first 15 minutes (then less often) and keeps it as soon as it appears. Measured with every model deleted: 8 of 12 back within 34 seconds, 11 of 12 within 15 minutes; the last one waited on Roblox. While the Dashboard is open, the selected avatar is compared with Roblox every 20 seconds and all of them every 2 minutes (one small request per account); when an avatar changes, its new model rises in. Roblox sometimes reports a 3D model as ready before its files exist and prepares them only after being asked: CAM then waits and asks again, shows the last saved model meanwhile (marked as such), and swaps in the new one when it arrives. A banned, locked or signed-out account still shows its avatar: CAM then asks with another of your accounts (never the main one), the way anyone signed in can see a profile. Only without any saved model (or without WebGL) does the Dashboard show Roblox's 2D full-body picture until the 3D one is ready. **Disk:** one folder per account that each new avatar replaces, the model stored compressed (about 0.7 MB per account), folders of removed accounts and leftovers deleted on their own, at most 150 MB in total (the longest-unused go first), and nothing is written when the drive has less than 1 GB free. The 3D viewer loads only when the page is opened, draws only while something moves, and its background pauses while you look at the lower part, when the window is hidden, or when animations are off.
- **New interface.** Every page was rebuilt; all features stay where you can reach them. Navigation is an icon bar with the pages plus a sidebar with the page's name and its own sections (folders on Accounts, Browse/Saved on Servers, Games/Disconnects on History, Clients/Windows on Monitor, the Settings categories); it folds to icons with the arrow next to the page name or **Ctrl+B**. The Accounts page starts with its action bar and **status tabs** (All accounts, Running, Healthy, Needs attention, Not checked), then the account list (table or tiles) and a side panel with **Launch** and **Account** tabs that folds to an icon strip. The side panel never covers the list by itself: on a narrow window it stays folded and slides open only when you click one of its icons. **Multi-instance**, **Sign-in protection** and **Hide usernames** are switches at the bottom of the Accounts sidebar. Launch the ticked accounts from the action bar or the Launch tab; the play button on each row became **Launch this account only** in the account's ⋯ menu. **Settings** (bottom of the icon bar) holds General, Appearance, Behavior, Notifications, Security, Backup, Maintenance and About. Client windows moved to **Monitor → Windows**; Roblox logs and the shutdown timer moved to **Settings → Maintenance**. Icons come from IBM's Carbon set. See the user guide for where everything is.
- **Search everything with Ctrl+K**: accounts, pages and commands; the search box sits in the middle of the title bar. **Ctrl+F** now puts the cursor in the account filter (it used to be Ctrl+K), **Ctrl+J** shows or hides Output, **Ctrl+B** folds or unfolds the sidebar, and **?** (also at the bottom of the icon bar) lists every shortcut.
- **Swipe notifications away.** Drag a notification up, down or to the right to dismiss it; it follows the pointer and flies out, a short drag springs back. A notification waits while the pointer is on it, and the close button animates it out too.
- **Full screen with F11.** F11 makes the window fill the screen without borders; F11 again brings it back at the size it had.
- **Monitor is livelier.** The charts slide along as new readings come in, and pointing at one shows the value and the time it was read. Numbers count to their new value, and a client's row flashes briefly when its status changes (for example Joining → In game). Click a status in the summary above the table, or the CPU or RAM card, to highlight the clients it is about. **Columns** (grouped: Memory, CPU and GPU, Disk and network, Client) chooses which of the 15 client columns the table shows (Private, Shared, Compressed, Commit, Not in RAM, GPU memory, Read and Write included); each can be sorted, and columns that don't fit the window wait until it is wider. **Close all** and **End all Roblox** react to the pointer, show their progress while held and confirm with a check.
- **Appearance** follows one layout: Language, Density and Mode as switches, the theme as cards, **Customize colours** and **Reset to default**. Theme changes are saved at once (there is no Save button any more). **Light mode** has its own text and status colours, and **Interface size** (Small, Default, Large) and **Animations** can be set there too.
- **More is translated** into Bahasa Indonesia, including messages that used to stay in English (for example times like "3h ago").
- **Fixed:** "Refresh all cookies now" never showed its summary. A font subset could fail to load because it was embedded in a way the app's security policy doesn't allow.

- **Copy diagnostics covers the newer features.** The report now also lists CAM settings (light graphics, trimming, RAM budget, hotkey, launch arguments, Discord on/off, per-account options, managed Fast Flags), account status without names (cookie rejected, bans with end dates, locks, never checked), installed Roblox versions with the current one, pinned or missing versions and leftover delete folders, each running client (version, tracker status and rejoins, whether its limits hold, CPU and memory), PC memory and RAM capacity, the latest disconnects and crashes, and the integrity label of CAM's folders. It still never contains cookies, tickets, account names, user IDs, or the Windows user or PC name.
- **Running now moved to Monitor.** Close all and End all Roblox (hold), the emergency hotkey and the list of running clients are now on the Monitor page, which also shows each client's Roblox version and whether it is the pinned one. **RAM capacity** (with the RAM budget) moved there too. Client versions keeps versions, Roblox logs and the shutdown timer.
- **Monitor** (new page, Ctrl+4): everything CAM knows about running Roblox clients. A summary (CPU of all clients and of the PC, physical RAM of all clients with a 2-minute trend, PC RAM and commit in use, compressed memory, GPU memory, reads and writes) and a sortable table per client: status (starting, joining, in game, teleporting, disconnected, human check, sign-in refused, not responding), CPU and physical RAM with trends, private, shared and compressed RAM, commit, memory not in RAM, GPU, GPU memory, reads and writes per second, uptime, automatic rejoins since CAM was opened, limits status, and a close button. **Physical RAM** is an estimate of the RAM a client really takes from the PC: its private pages in RAM, its share of shared pages, and its share of Windows' compressed memory (Windows doesn't report that part per program). Read without opening the Roblox process, from the same system snapshot Task Manager uses, and only while the page is open. Page shortcuts after History moved by one (Client versions is now Ctrl+5, About Ctrl+8).
- **Delete old Roblox versions** (Client versions). Roblox installs every update into a new folder and leaves the old one behind when it was still in use (about 360 MB each). Each installed version now shows its size and whether it is the **current** one; old versions get a delete button, and **Delete old versions** removes them all at once. The current version, a version pinned for launching (bulk delete only), and a version whose Roblox process is still running are never deleted. Roblox Studio's folder is left alone.
- **Account status shows bans and locks.** A banned or security-locked account used to show **Healthy** (or a cookie error), because Roblox answers such accounts with "User is moderated" and CAM treated that as a temporary problem. Refresh now reads the restriction from Roblox and the Status column shows **Banned · 2 days left** (with the ban type and end date in Properties), **Locked**, **Terminated**, **Warning** or **Restricted**. The cookie of such an account stays **Valid**. **Healthy** now means Roblox accepted the sign-in and reported no restriction; an account that was never checked shows **Not checked**. Refresh all once after updating so the status is read.

## 0.13.0 — 10 Nov 2026

- **One-click profiles** in Account tools: **Balanced AFK** (10 FPS, 512 MB RAM limit) and **Deep AFK** (3 FPS, 256 MB RAM limit). Main accounts are left out.
- **Light graphics** (About → Behavior): low graphics for every launch, without changing FPS or RAM limits. Main and Full quality accounts keep their own graphics. On for new installations; existing installations stay as they are until you turn it on.
- **Trim background clients** (About → Behavior, off by default): a background client using more than 768 MB of RAM has its working set trimmed, at most once every 2 minutes. Main and Full quality accounts, the client in front, clients that are not responding or still loading, and clients already held by a RAM limit are skipped. Measured on one game: a client without a RAM limit went from about 2.3 GB to about 0.5 GB on average, giving Windows about 0.9 GB more free RAM; its CPU did not rise while the game was quiet (busier moments in the game varied too much to compare). Trimming a client that already has a RAM limit saved nothing, so CAM leaves those alone.
- **Client versions** now shows whether each running client's limits are in place.
- CAM asks its window engine to release memory while it is hidden in the tray, and returns to normal when you open it.
- **RAM capacity** (Client versions): an estimate of the RAM your Roblox clients use and how many more would fit with each profile. An optional **RAM budget**: above it, Launch asks first and auto-rejoin waits until there is room.

## 0.12.0 — 9 Nov 2026

- **Main account** and **Full quality** (Properties). A main account is left out of Select all, bulk resource saver and folder presets. Folder presets don't lower a Full quality account's FPS, graphics, RAM limit or window size. You can still change either by hand.
- **Privacy: Auto-locate on the Servers page is now off by default.** Each lookup sends the server's address to ip-api.com without encryption and makes one Roblox join request with the account; the Servers page says so. The region is an estimate.
- **Bahasa Indonesia** (Appearance → Language): the interface can be shown in Indonesian, switched instantly without a restart and remembered on this PC. Account names, notes and game names are never translated. The documentation, Windows dialogs, the tray menu and some rarer messages stay in English.
- **Light mode** (Appearance → Mode): dark text on light surfaces, with four light presets (Studio Light, Paper, Mist, Sage). Your selection colour is kept when you switch, and the contrast check uses the light text colours. Every preset passes it.
- **Discord notifications** (About, optional): paste a webhook from your Discord server and pick what to hear about: disconnects, crashes and hangs (also auto-rejoin giving up), sign-in problems, successful rejoins, and a launch of several accounts finishing. The webhook is stored encrypted and never shown again (only the last 4 digits of its ID). Messages are grouped (at most one every 2 seconds), name accounts by alias, and never carry a cookie, ticket or launch link. **Send test** checks it.
- **Share folder profiles**: a folder's menu has **Export profile…**, which saves its name, colour, icon and saver preset to a `.camprofile` file with no accounts in it. **New folder → Import profile…** adds them on another PC. If a folder with the same name exists, CAM shows what would change and asks first; on Replace the folder gets the profile's settings, applied to its accounts.
- **Launch arguments**: extra arguments for RobloxPlayerBeta.exe, as a default for every account (Client versions → Client used for launching) or per account (Properties; empty = the default). With arguments, the client is started directly instead of through the roblox-player: link (the newest installed version when Automatic is selected). Quotes, `& | < > ^`, line breaks and a second roblox-player: link are refused.
- **Errors stay visible**: the latest error you haven't seen stays at the top of Output (with how many arrived) until you dismiss it, instead of scrolling away under newer messages.
- **Play again** next to each disconnect or crash in History launches that account into the same game again.
- Releases now come with **SHA256SUMS.txt** (and the installer's SHA-256 in the release notes) so a download can be checked.
- **No more surprise mass-close by a Roblox update**: when Roblox has a new version that isn't installed yet, starting another client would run Roblox's installer, which closes every running client. While clients are running, CAM now holds such a launch and says why (auto-rejoin waits and tries again). Not applied when you picked a specific client version.
- **Launching several accounts slows down when Roblox refuses a sign-in (error 403)**: that client is closed, the account is tried once more, and the wait between launches doubles for the rest of the queue; a second refusal in a row stops the queue with a clear message instead of failing every account. A human check (captcha) for an account also stops the queue.
- **Account status**: Refresh now also reads whether Roblox shows the account as **banned** (a red badge in the list), whether its **email is verified**, and which **2-step verification** methods are on (Properties).
- **Close all** and **End all Roblox** (Client versions → Running now; hold the button for a second): close every client politely or end every Roblox process at once. Both cancel pending auto-rejoins, so closed clients aren't relaunched. Optional **emergency hotkey Ctrl+Alt+End** (off by default) ends every client even while a game is in front.
- **Closing a client is clean and quicker.** Roblox ignores a plain close request while its window isn't in front, so CAM used to wait 5 seconds and then end the process. It now presses the window's close button the way you would: the client leaves its game properly (measured: 3.5 s instead of 6.5 s). Applies to Close all, auto-rejoin and the leftover clean-up.
- Monitor also shows each client's private memory **not in RAM** (compressed, in the page file, or reserved but unused) — the part the resource saver's RAM limit pushes out. Windows doesn't report the compressed share per program, so this is its honest upper bound.
- **Monitor** (Running now): a one-minute CPU/GPU trend per client, commit (private) memory and graphics memory next to CPU, RAM and GPU, and a close button per client (not rejoined).
- **Crash details**: for a crash or a freeze, History → Disconnects & crashes also says what the evidence points to (the client itself crashed, it never started properly, something closed it…), with Windows' own error record for that client and any crash dump Roblox wrote.
- **Disconnects & crashes** (History): every disconnect, crash, freeze and sign-in problem of clients launched by CAM, with Roblox's reason, the game and how long the client had run (the last 200).
- **Tray icon**: click to show CAM; its menu launches a folder or picks a saved server, closes or ends all clients, or quits. **About → Behavior → Close button** can hide CAM to the tray instead of quitting.
- **Roblox logs** (Client versions): Roblox's logs and crash dumps older than a day can be removed in one click (measured here: 88.8 MB of crash dumps). Logs of running clients are never touched.
- **Shut down the PC** after an AFK session (Client versions): in 30 minutes to 12 hours, optionally closing every client 30 seconds before so they leave their games properly; called off with one click.
- **Keyboard shortcuts**: Ctrl+N add an account, Ctrl+Enter launch the selected accounts, Ctrl+1 … Ctrl+7 switch pages (Ctrl+K still filters accounts).
- **Leftover Roblox processes are cleaned up.** Rarely, after you close a game Roblox's process stays in memory without any window (seen: 1.5 GB, for minutes), the account shows as running, CAM refuses to launch it again and Roblox's own next start crashes. CAM now ends such a process when it has had no game window for 30 seconds and its log shows the game was left; the Output says so. Minimized clients are never touched.
- **Tiny client windows** (Client versions → Client windows): make a Roblox window smaller than Roblox's own 800×600 minimum (320×180 up to 640×360), and back to its normal size. A small window draws far less — measured here at 2048×1080 with no FPS limit: GPU 25.7% at full size, 5.7% at 320×180 (minimized: 0%). A tiny window stays tiny when it's restored from minimized, and when you drag it by its title bar.
- **Tile tiny** makes every client tiny and lines them up; **Minimize all** / **Restore all** (tiny ones stay tiny).
- **Start tiny** per account (Properties) and in a folder's preset: the client is made tiny right after it joins, also after an auto-rejoin.
- **Preview** a client in Client windows by pointing at its eye button: Windows draws the window's live picture while the pointer is there, without copying frames or touching the client.
- The window editor (Move…) accepts sizes below 800×600 too.
- **Same server** (Launch behavior): put every selected account — or a whole folder — in one public server. *Pick one with room for all* finds the fullest server that still fits everyone; *Follow the first account* reads the server the first account joined from its Roblox log and sends the rest there. If no server has room, it falls back to following the first account, and the Output says what happened.
- **FPS limit for one launch** (Launch behavior): overrides each account's FPS and the resource saver FPS for that launch only; auto-rejoin keeps it.
- **Last server** per account in Properties, recorded from the client's log (also after rejoins and teleports), with a one-click **Rejoin** (the server is checked first). Private servers are listed but can't be rejoined by their Job ID.
- **Join a friend**: the people button next to Follow player lists the account's online friends (read from Roblox's presence service; Roblox's own "friends online" list now always comes back empty), plus your own accounts that are in a game — those go in by their exact server, without depending on Roblox's "who can join me" setting.
- **Fixed: launching with only a private server access code** (`accessCode=…` pasted, or Use in the private server list) joined a random public server instead of that private server.
- **Private servers** on the Servers page (Public / Private): the private servers an account can see in a game; **Use** sets one as the launch target.
- Servers page: **Fullest** now asks Roblox for the fullest servers (it used to sort only the page already loaded, which always held the emptiest), and full servers aren't fetched when you need free slots. A server list Roblox refuses (rate limit) now shows an error instead of an empty list.
- After a launch of several accounts, **Select them** (Properties → Selection) re-selects the ones that failed in one click.
- **Cookies stay fresh.** Roblox now replaces sign-in cookies through its normal replies; CAM saves the new cookie as soon as Roblox sends it, so stored accounts don't expire months later. CAM also no longer uses Roblox's logout address to get its security token (one wrong move there would sign the account out); it asks the way the website does, which also halves the requests for most actions.
- Private server codes (the Launch target's private server field and Saved servers) are now stored encrypted with Windows, like cookies; codes saved by older versions are encrypted on the next save.
- **Fixed: a network outage marked every account as Rejected.** Refresh now tells apart a signed-out cookie, Roblox asking for a human check, Roblox requiring a bound session, and a check that simply couldn't happen (network down, Roblox busy) — the last one leaves the account as it was. Refresh all ends with a summary (ready / need signing in / need a human check / couldn't be checked).
- Accounts show **Plus** (Roblox's subscription since April 2026) next to the old Premium badge.
- **Fixed: Account tools → Blocked list (show, block, unblock, unblock all) stopped working** because Roblox moved its blocking service; CAM now uses the new one.
- **Reorder accounts by dragging** them above or below another account, in the list or in the Explorer tree; a line shows where they land, and the order is saved. Dropped next to an account in another folder, they join that folder. With the keyboard: Alt+Up / Alt+Down in the Explorer tree moves the focused account within its folder.
- **Notes and favourites** per account (Properties). Favourites show a star in the list; the account filter also searches notes.
- **Fixed:** the Anti-AFK switch in Properties and the "x of n on" count in Account tools always showed Off after the list reloaded, although the setting was saved and working.
- **Safer Copy cookie.** The cookie is copied by CAM itself (it never passes through the app window), kept out of Windows' clipboard history and cloud clipboard, and the clipboard is cleared after 30 seconds unless you copied something else meanwhile. Also fixes Copy cookie sometimes doing nothing in the installed app.
- **Open roblox.com as this account** (Properties, globe button; the next button opens the account's profile): a separate private window signed in as the account, without signing in by hand. It stays on roblox.com, its Log out is blocked (logging out there would also end the session CAM keeps for the account), and it is wiped when closed. If Roblox renewed the cookie meanwhile, the newer one is saved. One window per account; opening it again brings it to the front.
- Copy buttons next to Username and User ID in Properties.
- **Import many accounts** (Add Account → Import many…): paste many cookies, one per line (plain or username:password:cookie; passwords are ignored and never stored), or import Roblox Account Manager's AccountData.json (alias and description come along). Accounts are checked one by one with live progress and a result for every line, new accounts go straight into the folder you pick, and accounts already in the list get the new cookie with their settings kept.
- **Password-protected backups** (About → Backup): one `.cambak` file with every account and its cookie, folders with their presets, and saved servers, encrypted with your password (Argon2id + AES-256-GCM). Unlike the accounts file, it opens on another PC or after reinstalling Windows. Restore adds missing accounts and either keeps yours or replaces them with the backup — only when the backup's cookie still signs in as that account. Folders are matched by name. With Windows Hello on, making a backup asks for it.
- **Windows Hello for Copy cookie** (optional, off by default): About → Security → Windows Hello asks for your face, fingerprint or Windows PIN before a cookie is copied. Turning it on or off also asks once. If this PC has no Windows Hello, CAM says why.
- **Auto-rejoin** per account (Properties, Account tools, or a folder's preset): after a disconnect by Roblox, an unexpected close, or a client that stops responding, the account is launched again into the same game through the normal launch path, so resource saver, sign-in protection and the account check apply again. Never after you leave or close it yourself. One rejoin at a time, growing waits, and it stops after 5 rejoins of one account in 15 minutes.
- **Anti-AFK** per account (Properties, Account tools, or a folder's preset): while you're away from the PC, each client gets one F13 key press every few minutes (default 15) so Roblox doesn't disconnect it for idling; the focus goes back to your window right away. Never while you use the PC or while a full-screen app runs.
- **Fixed: your own Roblox could stay at the resource saver's 10 FPS and low graphics.** CAM now writes an account's FPS and saver flags only until its client has read them, then puts your settings back (the client keeps its limit; measured: GPU 8% vs 20% for the same game at your 60 FPS). When a saver client closes and Roblox saves its 10 FPS again, CAM restores yours within a second. Leftover saver flags from older versions are removed at start.
- Auto-rejoin is smarter: no rejoin for sign-in problems (human check, error 403, wrong account); a rejoin is cancelled when the client recovers during the wait; no rejoin while multi-instance is off and other clients are open; network and Roblox outages are retried for up to an hour; clients are still followed after CAM restarts; a frozen or kicked client is closed politely (twice, also its hidden windows) before it is ended.
- An account whose client is already open can't be launched a second time (Roblox would sign the first client out).
- Disconnects and crashes of clients launched by CAM are reported in Output with Roblox's reason, also when auto-rejoin is off.
- **Safer sign-in window.** It only goes to roblox.com and the Apple/Google sign-in pages Roblox uses; anything else is blocked. It no longer offers to save passwords or fill forms, and browser keys (reload, print, developer tools) are off.
- The app window can no longer be reloaded by F5, Ctrl+R or the right-click menu (a reload during a launch queue reset the app); text fields keep Copy/Paste.
- Browser crashes inside the app (blank window, graphics process failure) and blocked navigations are written to `crash.log`, so Copy diagnostics shows them. WebView2 override variables from the environment are ignored, and a sign-in window redirected to another browser profile by a system policy is closed.
- **Diagnostics** now include the end of the last 3 Roblox client logs, filtered: lines with tickets, cookies or server codes are left out, and IP addresses, job IDs, user IDs, account names and your Windows user name are masked. **Save to file…** writes the same report to a file.
- **Take over** for multi-instance: if a Roblox game was opened before multi-instance, CAM offers to take over its single-instance lock instead of asking you to close the game, which keeps running.
- **Safer accounts file.** If a saved value can't be read (for example after going back to an older version), only that value returns to its default and every account is kept; a banner says what was reset and where a copy of the original file is. If the file can't be read at all, CAM no longer saves over it: the banner offers **Start fresh**, and the copy stays.

## 0.11.0 — 4 Nov 2026

- **Sign-in window is more robust.** Log in with browser now uses its own temporary browser profile, deleted after each sign-in. A new option, **Sign-in window: software rendering**, draws the Roblox page without the graphics card, for PCs that freeze or restart while signing in. It turns on by itself when the previous sign-in never finished.
- **Copy diagnostics** in About: one click copies a report for bug reports (Windows and graphics driver versions, recent crashes, blue screens and graphics resets, and this app's state). It only reads, and contains no cookies, account names or Windows user name.
- **Sign-in protection** (ribbon, on by default with multi-instance): Roblox's shared sign-in file is locked from the first launch until the last client closes, so accounts no longer overwrite each other's session. After each join CAM checks that the client signed in as the right account and closes it if not; disconnects while protection is on are reported in Output with Roblox's reason.
- **Fixed: multi-instance could fail after a game was closed.** Roblox's tray process (started when a game closes) took over the single-instance lock, so each new client closed the previous one. CAM now closes that idle process first and holds the lock in a way Roblox cannot take over.
- Multi-instance works together with executors and other multi-Roblox tools, including ones running as administrator.
- **Fixed:** dragging accounts onto a folder did not work in the installed app (only in the test page).
- **Fixed:** Copy diagnostics stayed on "Collecting…" in the installed app.
- More resilient: an internal error no longer makes every following action close the app, and such errors are written to `crash.log` (included in the diagnostics).

## 0.10.0 — 3 Nov 2026

- **Account folders.** Group accounts into folders (for example *Farming* and *Boosting*): click the folder button next to *Accounts* in the Explorer. Each folder has a name, a color, and an icon; an account is in one folder or in *Ungrouped*.
- Move accounts by dragging them onto a folder (in the Explorer, on a folder chip, or from the grid), from an account's **⋯ → Move to folder**, from **Properties → Folder**, or for all selected accounts in **Account tools → Folder**. Add Account can put a new account straight into a folder.
- A folder's checkbox selects every account in it; **Launch folder** launches them. Folder chips above the account list show one folder at a time.
- **Resource saver preset per folder**: e.g. Farming = saver on, 10 FPS, 512 MB. It is applied to every account in the folder and to accounts moved in later; accounts can still be changed one by one, and Properties shows when one differs from its folder.
- Rename a folder in place (double-click or F2), reorder with Move up / Move down, and delete it without losing its accounts (they move to Ungrouped).
- The Explorer filter also matches folder names.

## 0.9.10 — 3 Nov 2026

- After an update is installed, Output says "Updated to …" once, so you know the update worked.

## 0.9.9 — 3 Nov 2026

- **One-click updates.** About → Updates now installs new versions: it downloads the installer from GitHub Releases, checks its digital signature, installs it, and reopens the app. Accounts and settings are kept.
- The app checks for a new version once after it opens and says so in Output.
- Install update is disabled while Roblox clients are running, because installing closes the app and would close them too.
- Updates work for the copy installed with the setup program; install this version with the setup program once.

## 0.9.8 — 3 Nov 2026

- New app ID (`com.chudai.accountmanager`). Accounts, saved servers, and settings are kept; only **Density** and the Servers page's **Auto-load regions** switch go back to their defaults once.

## 0.9.7 — 2 Nov 2026

- **Resource saver: 3 and 5 FPS.** Measured against 10 FPS (Violence District, two rounds): 3 FPS used about 20% less CPU and 70% less GPU, with the same RAM and no disconnects. 10 FPS stays the default.
- **RAM limit: 128 MB**, marked "more CPU". It saved about 200 MB more physical RAM per client than 512 MB, but CPU use roughly doubled because Windows keeps unpacking compressed memory. With 3 FPS the extra CPU was smaller (about +40%). 512 MB stays the default.

## 0.9.6 — 2 Nov 2026

- **Resource saver works again when Roblox switches versions.** Roblox sometimes hands a launch to another installed version and restarts the client there (seen during a staged Roblox update). The restarted client did not keep resource saver's RAM limit and low priority, so it used about 2.1 GB instead of about 0.5 GB. CAM now notices this after the account joins, says so in Output, and starts that version directly from the next launch, so the limits apply again (measured: 508 MB, low priority).

## 0.9.5 — 31 Oct 2026

- Multi-instance no longer fails with "Could not create ROBLOX_singletonEvent (code 6)" when another tool (for example an executor with its own multi-Roblox option) already holds that name. CAM now uses the name as it is and turns multi-instance on.

## 0.9.4 — 31 Oct 2026

- **Resource saver FPS can be chosen**: 10, 15, 20, 30, or 60 FPS. Pick it in Account tools → Resource saver (next to the RAM limit) for all selected accounts, or per account under Properties → Saver FPS. The default stays **10 FPS and a 512 MB RAM limit**.
- While resource saver is on, its FPS is used instead of the account's FPS limit; the FPS limit applies again when resource saver is turned off. Properties → FPS limit shows which one is in effect.
- Account tools → Resource saver shows each account's FPS next to its RAM limit.

## 0.9.3 — 31 Oct 2026

- **Launch target is remembered**: game, Job ID, private server link, Follow player, and Delay stay after closing the app, until you clear them.
- **Saved servers**: click the bookmark button in Properties → Launch target to save the current game + Job ID + private server. Use it again in one click from **Saved ▾** in Properties or from the new Saved servers list on the Servers page, where you can also rename and delete entries. Saving the same combination twice does not create a duplicate.
- Old installers are removed from the `rilis` folder on each release; only the newest one is kept.

## 0.9.2 — 31 Oct 2026

- Turning on resource saver now also sets a **512 MB RAM limit** (previously Off, so RAM stayed above 2 GB per client). You can still choose Off.
- Account tools → Resource saver has a RAM limit choice for all selected accounts.
- Account tools → Resource saver shows each selected account's status (On/Off, RAM limit, minimize), an "N of M on" summary, and the result of Turn on/off in the dialog — not only in Output.

## 0.9.1 — 31 Oct 2026

- **Log in with browser** in Add Account: sign in to Roblox in a private window and CAM captures the cookie, then closes the window without logging out. Logging out on roblox.com ends the session, which is why a cookie copied before logging out was rejected ("no user id returned").
- Signing in to an account that is already in the list renews its cookie and keeps its alias, resource saver, and history.
- User guide explains why copied cookies stop working after logging out.

## 0.9.0 — 31 Oct 2026

- **Resource saver** for AFK accounts: 10 FPS, low graphics, and low priority (CPU about −66%, GPU about −69% in testing), with optional window minimize and RAM limit (512 MB saved about 54% physical RAM).
- **FPS limit works again.** Roblox now rejects the FPS flag; the limit is applied through Roblox's own Maximum Frame Rate setting, and your own setting is restored for accounts without a limit.
- Live CPU, RAM, and GPU usage per running client on the Client versions page.
- Launching works with Roblox's new tray process: an idle tray process is closed before launching so settings apply, and joins handed to it are detected.
- The Roblox tray process is no longer reported as an unrecognised client.
- Two error messages with stray spacing fixed.

## 0.8.1 — 24 Oct 2026

- Toolbars, status bars, list rows, and the ribbon follow the Compact/Comfortable density.
- Launch behavior label shortened to **Delay (s)**.
- Appearance checks contrast for secondary, error, warning, success, and link text, the focus ring, selected rows, and disabled text.
- Midnight preset: the selection colour is slightly darker so white text on selected rows is readable.
- Explorer items are single buttons; the Accounts expand/collapse arrow is a separate control.
- Keyboard focus in lists stays on the last row you moved to.

## 0.8.0 — 24 Oct 2026

- About page with version, build date, documentation, changelog, and a manual update check.
- Density setting under Appearance: Compact or Comfortable.
- Properties reorganised: Game is a property row, Launch behavior has its own section, and Follow player dims the fields it overrides.
- Game search shows searching, no-result, and error states, and works with the keyboard.
- Theme saving shows Saving…, Saved, or an error, and warns when custom colours make text hard to read.
- Colours, button sizes, and status wording unified across the app.

## 0.7.1 — 24 Oct 2026

- Single-account and multi-account launches share one progress panel.
- Launch is locked as soon as it starts, so a double click cannot launch twice.
- **Stop waiting** for the last or only account.
- History, Client versions, Appearance presets, and server rows work with the keyboard.
- Secondary columns in the account list hide on narrow windows instead of overlapping.

## 0.7.0 — 24 Oct 2026

- Clear loading, error, and empty states; the app no longer shows a blank window when something fails.
- Clicking an account shows its details; ticking it selects it for Launch and Account tools.
- Launch progress per account with **Cancel remaining**.
- Cookie field hidden by default when adding an account.
- Account tools show how many accounts an action affects and ask before running it.

## 0.6.0 — 23 Oct 2026

- Custom title bar.
- Launch button restyled.

## 0.5.0 — 23 Oct 2026

- Fast Flags editor.
- Download a Roblox version from Roblox's CDN.

## 0.4.0 — 23 Oct 2026

- New interface in the style of Roblox Studio: Explorer, Properties, and Output.

## 0.2.0 — 22 Oct 2026

- Installer that adds a desktop shortcut.
- Multi-instance is always off when the app starts.
- Duplicate games in History fixed.
