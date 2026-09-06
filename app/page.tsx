import { AuthProvider } from '@/lib/firebase/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { AppShell } from '@/components/AppShell';

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
