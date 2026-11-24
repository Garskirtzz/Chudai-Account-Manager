import { Keyboard, MousePointer2 } from '@/components/ikon'
import { useUIStore } from '@/stores/uiStore'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Kbd } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const groups = [
  {
    title: 'Anywhere',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Search accounts, pages and commands' },
      { keys: ['Ctrl', 'N'], label: 'Add an account' },
      { keys: ['Ctrl', 'Enter'], label: 'Launch the ticked accounts, or the selected one' },
      { keys: ['Ctrl', 'F'], label: 'Filter accounts' },
      { keys: ['Ctrl', '1…6'], label: 'Go to Accounts, Servers, History, Monitor, Client versions, Fast Flags' },
      { keys: ['Ctrl', '7'], label: 'Appearance settings' },
      { keys: ['Ctrl', '8'], label: 'About' },
      { keys: ['Ctrl', '9'], label: 'Dashboard' },
      { keys: ['Ctrl', ','], label: 'Settings' },
      { keys: ['Ctrl', 'J'], label: 'Show or hide Output' },
      { keys: ['Ctrl', 'B'], label: 'Collapse or expand the sidebar' },
      { keys: ['F11'], label: 'Full screen without borders; press again to go back to the window' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Account list',
    items: [
      { keys: ['↑', '↓'], label: 'Move between accounts' },
      { keys: ['Space'], label: 'Tick or untick the account' },
      { keys: ['Enter'], label: 'Open the account in the side panel' },
      { keys: ['Alt', '↑ ↓'], label: 'Move the account up or down (Custom order)' },
      { keys: ['F2'], label: 'Rename the focused folder' },
    ],
  },
  {
    title: 'Dialogs and panels',
    items: [
      { keys: ['Esc'], label: 'Close a dialog or menu' },
      { keys: ['Ctrl', 'Enter'], label: 'Save notes' },
      { keys: ['← →', '↑ ↓'], label: 'Resize a focused panel divider' },
      { keys: ['Shift'], label: 'Hold to resize in larger steps' },
      { keys: ['Double-click'], label: 'Reset a divider to its default size' },
    ],
  },
]

export function ShortcutsDialog() {
  const open = useUIStore((s) => s.shortcutsOpen)
  const setOpen = useUIStore((s) => s.setShortcutsOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-2 text-content-secondary">
              <Keyboard className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Keyboard shortcuts</DialogTitle>
              <DialogDescription>Most shortcuts wait while a dialog is open or while you type in a field.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-content-muted">{group.title}</h3>
              <div className="overflow-hidden rounded-md border border-line-subtle">
                {group.items.map((item, index) => (
                  <div
                    key={item.label + item.keys.join()}
                    className={`flex items-center justify-between gap-4 px-3 py-2 ${index !== 0 ? 'border-t border-line-subtle' : ''}`}
                  >
                    <span className="text-xs text-content-secondary">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key) => (
                        <Kbd key={key} className="h-5 min-w-5 px-1.5 text-xs">{key}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-md border border-line-subtle bg-app/40 px-3 py-2.5">
            <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted" />
            <p className="text-xs leading-relaxed text-content-muted">
              Panel dividers can be dragged: the navigation, the folder list, the account side panel, the client details and Output.
              Their sizes are remembered on this PC.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
