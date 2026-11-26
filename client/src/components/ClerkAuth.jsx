import { SignIn, SignUp } from '@clerk/react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { Page } from './ui.jsx';
import { Logo } from './Navbar.jsx';

function safeNext(params) {
  const next = params.get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function useClerkAppearance() {
  const { theme } = useStore();
  const dark = theme !== 'light';
  return {
    variables: {
      colorPrimary: '#FF6B5B',
      colorBackground: dark ? '#1B2C4F' : '#FFFFFF',
      colorText: dark ? '#F4EDE0' : '#14213D',
      colorTextSecondary: dark ? 'rgba(244,237,224,.7)' : 'rgba(20,33,61,.7)',
      colorInputBackground: dark ? '#14213D' : '#FFFFFF',
      colorInputText: dark ? '#F4EDE0' : '#14213D',
      colorNeutral: dark ? '#F4EDE0' : '#14213D',
      colorDanger: '#FF6B5B',
      colorSuccess: '#7FD8A4',
      borderRadius: '14px'
    }
  };
}

export function ClerkLogin() {
  const [params] = useSearchParams();
  const next = safeNext(params);
  const appearance = useClerkAppearance();
  return (
    <Page className="clerk-auth-page">
      <div className="clerk-auth-wrap">
        <Logo size={34} />
        <SignIn
          routing="path"
          path="/login"
          signUpUrl={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          forceRedirectUrl={next}
          fallbackRedirectUrl={next}
          appearance={appearance}
        />
        <p className="clerk-auth-note">Accounts and sign-in are secured by Clerk.</p>
      </div>
    </Page>
  );
}

export function ClerkSignup() {
  const [params] = useSearchParams();
  const next = safeNext(params);
  const appearance = useClerkAppearance();
  return (
    <Page className="clerk-auth-page">
      <div className="clerk-auth-wrap">
        <Logo size={34} />
        <SignUp
          routing="path"
          path="/signup"
          signInUrl={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          forceRedirectUrl={next}
          fallbackRedirectUrl={next}
          appearance={appearance}
        />
        <p className="clerk-auth-note">Accounts and sign-in are secured by Clerk.</p>
      </div>
    </Page>
  );
}
