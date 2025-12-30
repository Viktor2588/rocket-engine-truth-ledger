import { Rocket, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useTruthSlider } from '@/context/TruthSliderContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Header() {
  const { truthMin, setTruthMin } = useTruthSlider();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 border-b bg-background">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Truth Ledger</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search entities..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Truth Slider */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-4 min-w-[200px]">
              <span className="text-sm font-medium whitespace-nowrap">
                Truth: {(truthMin * 100).toFixed(0)}%
              </span>
              <div className="w-32">
                <Slider
                  value={[truthMin]}
                  onValueChange={([value]) => setTruthMin(value)}
                  min={0}
                  max={1}
                  step={0.05}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filter facts by minimum truth score</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
