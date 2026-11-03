# Changelog

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
