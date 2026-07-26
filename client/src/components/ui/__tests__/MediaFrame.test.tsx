import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MediaFrame from '../MediaFrame';

describe('MediaFrame', () => {
  it('renders an image with an accessible alt text', () => {
    render(<MediaFrame src="/coffee.jpg" alt="Bag of washed coffee" />);

    expect(screen.getByRole('img', { name: 'Bag of washed coffee' })).toBeInTheDocument();
  });

  it('switches to the fallback after an image error', () => {
    render(
      <MediaFrame
        src="/broken.jpg"
        alt="Bag of washed coffee"
        fallback={<div>Image unavailable</div>}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Bag of washed coffee' }));

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bag of washed coffee' })).toBeInTheDocument();
  });

  it('keeps the alt accessible when no source is provided', () => {
    render(
      <MediaFrame src={null} alt="Bag of washed coffee" fallback={<div>Image unavailable</div>} />,
    );

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bag of washed coffee' })).toBeInTheDocument();
  });

  it('preserves compact dimensions supplied by drawer and avatar layouts', () => {
    const { container } = render(
      <MediaFrame src="/coffee.jpg" alt="Compact coffee image" className="!h-16 !w-16" />,
    );

    expect(container.firstElementChild).toHaveClass('!h-16', '!w-16');
    expect(container.firstElementChild).not.toHaveClass('w-full');
  });
});
