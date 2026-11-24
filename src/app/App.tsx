import { HashRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { AppRoutes } from './router'

export function App() {
  return (
    <HashRouter>
      <TooltipProvider delayDuration={350} skipDelayDuration={200}>
        <AppRoutes />
      </TooltipProvider>
    </HashRouter>
  )
}

export default App
