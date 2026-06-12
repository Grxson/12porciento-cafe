import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import RatingSlider from '../RatingSlider';

describe('RatingSlider', () => {
  it('renders with unset state when value is undefined', () => {
    render(<RatingSlider value={undefined} onChange={vi.fn()} />);
    expect(screen.getByText(/calificar/i)).toBeInTheDocument();
  });

  it('shows current value when set', () => {
    render(<RatingSlider value={7} onChange={vi.fn()} />);
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    const onChange = vi.fn();
    render(<RatingSlider value={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('renders fire emoji at high rating', () => {
    render(<RatingSlider value={10} onChange={vi.fn()} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});
