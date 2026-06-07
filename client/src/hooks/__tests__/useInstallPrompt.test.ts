import { renderHook, act, waitFor } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

describe('useInstallPrompt', () => {
  it('captures beforeinstallprompt and exposes canInstall', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);

    const evt: any = new Event('beforeinstallprompt');
    evt.prompt = vi.fn().mockResolvedValue(undefined);
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => { window.dispatchEvent(evt); });
    await waitFor(() => expect(result.current.canInstall).toBe(true));
  });

  it('promptInstall calls the captured event prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const promptFn = vi.fn().mockResolvedValue(undefined);
    const evt: any = new Event('beforeinstallprompt');
    evt.prompt = promptFn;
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });
    act(() => { window.dispatchEvent(evt); });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    await act(async () => { await result.current.promptInstall(); });
    expect(promptFn).toHaveBeenCalled();
    await waitFor(() => expect(result.current.canInstall).toBe(false));
  });

  it('reports isIOS based on user agent', () => {
    const orig = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(true);
    Object.defineProperty(navigator, 'userAgent', { value: orig, configurable: true });
  });
});
