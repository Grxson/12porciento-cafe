import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReiconIcon from '../ReiconIcon';

describe('ReiconIcon', () => {
  it('does not expose unknown icon identifiers as text', () => {
    render(<ReiconIcon icon="unknown-achievement" />);
    expect(screen.queryByText('unknown-achievement')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Logro')).toBeInTheDocument();
  });

  it('renders a safe icon for an empty value', () => {
    const { container } = render(<ReiconIcon icon="" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
