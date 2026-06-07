import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import InstallPrompt from '../InstallPrompt';

const mockHook = { canInstall: false, isStandalone: false, isIOS: false, promptInstall: vi.fn() };
vi.mock('../../hooks/useInstallPrompt', () => ({ useInstallPrompt: () => mockHook }));

describe('InstallPrompt', () => {
  beforeEach(() => { localStorage.clear(); Object.assign(mockHook, { canInstall: false, isStandalone: false, isIOS: false }); });

  it('renders nothing when not installable and not iOS', () => {
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when already installed', () => {
    Object.assign(mockHook, { canInstall: true, isStandalone: true });
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows install banner when canInstall', () => {
    Object.assign(mockHook, { canInstall: true });
    render(<InstallPrompt />);
    expect(screen.getByRole('button', { name: /instalar/i })).toBeInTheDocument();
  });

  it('dismiss hides the banner and persists', () => {
    Object.assign(mockHook, { canInstall: true });
    render(<InstallPrompt />);
    fireEvent.click(screen.getByLabelText(/cerrar/i));
    expect(localStorage.getItem('pwa-install-dismissed')).not.toBeNull();
  });
});
