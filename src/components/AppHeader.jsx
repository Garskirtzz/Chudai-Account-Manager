import {
  UserPlus, RefreshCw, KeyRound, Check, Eye, EyeOff, Copy, Wrench,
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownSeparator, cx } from "./Primitives";

export default function AppHeader({
  multiAktif,
  onToggleMulti,
  onSegarkanSemua,
  sedangSegarkan,
  autoRefresh,
  onToggleAutoRefresh,
  onPerbaruiSemua,
  sembunyikanUsername,
  onToggleSembunyikan,
  onTambah,
  jumlahDipilih,
  onAlat,
}) {
  return (
    <header className="flex flex-none items-stretch bg-app-side px-1">
      <Kelompok nama="Accounts" pertama>
        <button type="button" onClick={onTambah} className="ribbon-btn">
          <UserPlus size={20} className="text-dim" />
          Add Account
        </button>
        <button
          type="button"
          onClick={onSegarkanSemua}
          disabled={sedangSegarkan}
          className="ribbon-btn"
          title="Re-read name, Robux, avatar and cookie health for every account"
        >
          <RefreshCw size={20} className={cx("text-dim", sedangSegarkan && "animate-spin")} />
          Refresh
        </button>
        <button
          type="button"
          onClick={onAlat}
          disabled={jumlahDipilih === 0}
          className="ribbon-btn"
          title={jumlahDipilih === 0 ? "Select accounts first" : "Block, friend or rename on every selected account"}
        >
          <Wrench size={20} className="text-dim" />
          Account tools
        </button>
      </Kelompok>

      <Kelompok nama="Cookies">
        <Dropdown
          align="left"
          trigger={
            <button type="button" className="ribbon-btn relative">
              <KeyRound size={20} className="text-dim" />
              Cookie refresh
              {autoRefresh && (
                <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-link" title="Auto-refresh is on" />
              )}
            </button>
          }
        >
          <DropdownItem icon={Copy} onClick={onPerbaruiSemua}>
            Refresh all cookies now
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={autoRefresh ? Check : undefined} onClick={onToggleAutoRefresh}>
            Auto-refresh idle cookies on startup
          </DropdownItem>
        </Dropdown>
        <button
          type="button"
          onClick={onToggleSembunyikan}
          className={cx("ribbon-btn", sembunyikanUsername && "ribbon-on")}
          aria-pressed={sembunyikanUsername}
          title="Mask Roblox usernames for recordings and screenshots. Aliases and avatars stay visible."
        >
          {sembunyikanUsername ? (
            <EyeOff size={20} className="text-link" />
          ) : (
            <Eye size={20} className="text-dim" />
          )}
          Hide usernames
        </button>
      </Kelompok>

      <Kelompok nama="Clients">
        <button
          type="button"
          role="switch"
          aria-checked={multiAktif}
          onClick={onToggleMulti}
          className={cx("ribbon-btn min-w-[112px]", multiAktif && "ribbon-on")}
          title={
            multiAktif
              ? "Multi-instance is on — more than one Roblox client can open"
              : "Multi-instance is off (always off when the app starts)"
          }
        >
          <span className="relative">
            <span className="grid h-5 w-5 place-items-center">
              <span className="absolute top-0 left-0 h-3.5 w-3.5 rounded-[2px] border-2 border-dim" />
              <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-[2px] border-2 border-dim bg-app-side" />
            </span>
            <span
              className={cx(
                "absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full border border-app-side",
                multiAktif ? "bg-ok" : "bg-control-border-hi"
              )}
            />
          </span>
          Multi-instance: {multiAktif ? "On" : "Off"}
        </button>
      </Kelompok>
    </header>
  );
}

function Kelompok({ nama, children, pertama }) {
  return (
    <div className={"flex flex-col px-1 py-(--density-ribbon-pad) " + (pertama ? "" : "border-l border-line")}>
      <div className="flex flex-1 items-start gap-0.5">{children}</div>
      <div className="text-center text-cap text-faint">{nama}</div>
    </div>
  );
}
