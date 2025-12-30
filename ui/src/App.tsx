import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TruthSliderProvider } from '@/context/TruthSliderContext';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Entities } from '@/pages/Entities';
import { EntityDetail } from '@/pages/EntityDetail';
import { Conflicts } from '@/pages/Conflicts';
import { ConflictDetail } from '@/pages/ConflictDetail';
import { ReviewQueue } from '@/pages/ReviewQueue';
import { Pipeline } from '@/pages/Pipeline';
import { Sources } from '@/pages/Sources';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TruthSliderProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="entities" element={<Entities />} />
                <Route path="entities/:id" element={<EntityDetail />} />
                <Route path="conflicts" element={<Conflicts />} />
                <Route path="conflicts/:id" element={<ConflictDetail />} />
                <Route path="review" element={<ReviewQueue />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="sources" element={<Sources />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TruthSliderProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
