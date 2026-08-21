import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AppRouter } from '@/router'
import { useAuth } from '@/hooks/useAuth'
import { LevelUpOverlay } from '@/components/common/LevelUpOverlay'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppContent() {
  // Initialize auth listener at app root
  useAuth()
  return (
    <>
      <AppRouter />
      <LevelUpOverlay />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#131829',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#131829' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#131829' },
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
