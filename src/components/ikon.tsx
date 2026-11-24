import { forwardRef, type ComponentType, type SVGProps } from 'react'
import * as C from '@carbon/icons-react'

export type IkonProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
}
export type LucideIcon = ComponentType<IkonProps>
export type Ikon = LucideIcon

type Carbon = typeof C.Add

function jadi(K: Carbon, nama: string): LucideIcon {
  const F = forwardRef<SVGSVGElement, IkonProps>(function Ikon({ strokeWidth: _s, absoluteStrokeWidth: _a, size = 16, ...p }, ref) {
    void _s
    void _a
    return <K ref={ref} size={size} aria-hidden={p['aria-label'] ? undefined : true} {...(p as object)} />
  })
  F.displayName = nama
  return F as unknown as LucideIcon
}

export const Loader2: LucideIcon = forwardRef<SVGSVGElement, IkonProps>(function Loader2({ strokeWidth = 2.25, absoluteStrokeWidth: _a, size = 16, ...p }, ref) {
  void _a
  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth={strokeWidth} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}) as unknown as LucideIcon

export const AlertTriangle = jadi(C.WarningAlt, 'AlertTriangle')
export const AppWindow = jadi(C.Application, 'AppWindow')
export const Archive = jadi(C.Archive, 'Archive')
export const ArchiveRestore = jadi(C.Undo, 'ArchiveRestore')
export const ArrowDown = jadi(C.ArrowDown, 'ArrowDown')
export const ArrowDownToLine = jadi(C.DownToBottom, 'ArrowDownToLine')
export const ArrowLeft = jadi(C.ArrowLeft, 'ArrowLeft')
export const ArrowRight = jadi(C.ArrowRight, 'ArrowRight')
export const ArrowUp = jadi(C.ArrowUp, 'ArrowUp')
export const ArrowUpCircle = jadi(C.Upgrade, 'ArrowUpCircle')
export const Ban = jadi(C.Error, 'Ban')
export const Bell = jadi(C.Notification, 'Bell')
export const BookOpen = jadi(C.Book, 'BookOpen')
export const Bookmark = jadi(C.Bookmark, 'Bookmark')
export const BookmarkCheck = jadi(C.BookmarkFilled, 'BookmarkCheck')
export const Bot = jadi(C.Bot, 'Bot')
export const Briefcase = jadi(C.Portfolio, 'Briefcase')
export const Check = jadi(C.Checkmark, 'Check')
export const CheckCircle2 = jadi(C.CheckmarkOutline, 'CheckCircle2')
export const CheckSquare = jadi(C.CheckboxChecked, 'CheckSquare')
export const ChevronDown = jadi(C.ChevronDown, 'ChevronDown')
export const ChevronLeft = jadi(C.ChevronLeft, 'ChevronLeft')
export const ChevronRight = jadi(C.ChevronRight, 'ChevronRight')
export const ChevronUp = jadi(C.ChevronUp, 'ChevronUp')
export const CircleCheck = jadi(C.CheckmarkFilled, 'CircleCheck')
export const CircleHelp = jadi(C.Help, 'CircleHelp')
export const ClipboardCopy = jadi(C.CopyToClipboard, 'ClipboardCopy')
export const ClipboardPaste = jadi(C.Paste, 'ClipboardPaste')
export const Clock = jadi(C.Time, 'Clock')
export const Coins = jadi(C.Money, 'Coins')
export const Columns = jadi(C.Column, 'Columns')
export const Compass = jadi(C.Compass, 'Compass')
export const Copy = jadi(C.Copy, 'Copy')
export const Crosshair = jadi(C.CenterCircle, 'Crosshair')
export const Crown = jadi(C.Trophy, 'Crown')
export const Download = jadi(C.Download, 'Download')
export const Eraser = jadi(C.Erase, 'Eraser')
export const Expand = jadi(C.ExpandScreen, 'Expand')
export const ExternalLink = jadi(C.Launch, 'ExternalLink')
export const Eye = jadi(C.View, 'Eye')
export const EyeOff = jadi(C.ViewOff, 'EyeOff')
export const FileArchive = jadi(C.DataBackup, 'FileArchive')
export const FileClock = jadi(C.RecentlyViewed, 'FileClock')
export const FileInput = jadi(C.DocumentImport, 'FileInput')
export const FileJson = jadi(C.Json, 'FileJson')
export const FileOutput = jadi(C.DocumentExport, 'FileOutput')
export const Flag = jadi(C.Flag, 'Flag')
export const Folder = jadi(C.Folder, 'Folder')
export const FolderCog = jadi(C.FolderDetails, 'FolderCog')
export const FolderOpen = jadi(C.FolderOpen, 'FolderOpen')
export const FolderPlus = jadi(C.FolderAdd, 'FolderPlus')
export const Gamepad2 = jadi(C.GameConsole, 'Gamepad2')
export const Gauge = jadi(C.Meter, 'Gauge')
export const Ghost = jadi(C.Asleep, 'Ghost')
export const Globe = jadi(C.Globe, 'Globe')
export const Grid2x2 = jadi(C.Grid, 'Grid2x2')
export const HardDriveDownload = jadi(C.Download, 'HardDriveDownload')
export const Heart = jadi(C.Favorite, 'Heart')
export const HelpCircle = jadi(C.Help, 'HelpCircle')
export const History = jadi(C.RecentlyViewed, 'History')
export const Info = jadi(C.Information, 'Info')
export const KeyRound = jadi(C.Password, 'KeyRound')
export const Keyboard = jadi(C.Keyboard, 'Keyboard')
export const Layers = jadi(C.Layers, 'Layers')
export const LayoutDashboard = jadi(C.Dashboard, 'LayoutDashboard')
export const LayoutGrid = jadi(C.Grid, 'LayoutGrid')
export const Lock = jadi(C.Locked, 'Lock')
export const LogIn = jadi(C.Login, 'LogIn')
export const MapPin = jadi(C.Location, 'MapPin')
export const Maximize2 = jadi(C.Maximize, 'Maximize2')
export const Minimize2 = jadi(C.Minimize, 'Minimize2')
export const Minus = jadi(C.Subtract, 'Minus')
export const Monitor = jadi(C.Screen, 'Monitor')
export const MonitorCog = jadi(C.SettingsView, 'MonitorCog')
export const MoreHorizontal = jadi(C.OverflowMenuHorizontal, 'MoreHorizontal')
export const MousePointer2 = jadi(C.Cursor_1, 'MousePointer2')
export const OctagonX = jadi(C.StopSign, 'OctagonX')
export const Palette = jadi(C.ColorPalette, 'Palette')
export const PanelLeft = jadi(C.SidePanelOpen, 'PanelLeft')
export const PanelLeftClose = jadi(C.SidePanelClose, 'PanelLeftClose')
export const PanelLeftOpen = jadi(C.SidePanelOpen, 'PanelLeftOpen')
export const Pencil = jadi(C.Edit, 'Pencil')
export const Play = jadi(C.Play, 'Play')
export const Plus = jadi(C.Add, 'Plus')
export const Power = jadi(C.Power, 'Power')
export const RefreshCw = jadi(C.Renew, 'RefreshCw')
export const RotateCcw = jadi(C.Reset, 'RotateCcw')
export const RotateCw = jadi(C.Restart, 'RotateCw')
export const Rows3 = jadi(C.List, 'Rows3')
export const Save = jadi(C.Save, 'Save')
export const ScrollText = jadi(C.Catalog, 'ScrollText')
export const Search = jadi(C.Search, 'Search')
export const Send = jadi(C.Send, 'Send')
export const Server = jadi(C.BareMetalServer, 'Server')
export const Settings = jadi(C.Settings, 'Settings')
export const Shield = jadi(C.Security, 'Shield')
export const ShieldCheck = jadi(C.Security, 'ShieldCheck')
export const ShieldOff = jadi(C.Unlocked, 'ShieldOff')
export const Shrink = jadi(C.ShrinkScreen, 'Shrink')
export const SlidersHorizontal = jadi(C.SettingsAdjust, 'SlidersHorizontal')
export const Sparkles = jadi(C.MagicWand, 'Sparkles')
export const Square = jadi(C.Checkbox, 'Square')
export const Star = jadi(C.Star, 'Star')
export const StarFilled = jadi(C.StarFilled, 'StarFilled')
export const Tag = jadi(C.Tag, 'Tag')
export const Terminal = jadi(C.Terminal, 'Terminal')
export const TerminalSquare = jadi(C.Terminal, 'TerminalSquare')
export const Trash2 = jadi(C.TrashCan, 'Trash2')
export const Upload = jadi(C.Upload, 'Upload')
export const UserPlus = jadi(C.UserFollow, 'UserPlus')
export const UserRound = jadi(C.UserAvatar, 'UserRound')
export const Users = jadi(C.UserMultiple, 'Users')
export const WrapText = jadi(C.TextWrap, 'WrapText')
export const Wrench = jadi(C.Tools, 'Wrench')
export const X = jadi(C.Close, 'X')
export const XCircle = jadi(C.MisuseOutline, 'XCircle')
export const Zap = jadi(C.Flash, 'Zap')

export const Activity = jadi(C.Activity, 'Activity')
export const UserMultipleIcon = Users
export const VersionIcon = jadi(C.Version, 'Version')
export const SettingsAdjust = SlidersHorizontal
export const Asleep = jadi(C.Asleep, 'Asleep')
export const Light = jadi(C.Light, 'Light')
export const StopSign = OctagonX
export const CloseAll = jadi(C.CloseOutline, 'CloseAll')
export const Chip = jadi(C.Chip, 'Chip')
export const Help = CircleHelp

export const ThumbsUp = jadi(C.ThumbsUp, 'ThumbsUp')
export const Trophy = jadi(C.Trophy, 'Trophy')
export const Fire = jadi(C.Fire, 'Fire')
export const Growth = jadi(C.Growth, 'Growth')
export const Earth = jadi(C.Earth, 'Earth')
