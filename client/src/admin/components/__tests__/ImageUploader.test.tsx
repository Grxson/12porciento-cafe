import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImageUploader from '../ImageUploader';

vi.mock('../../../api', () => ({
  uploadsApi: {
    upload: vi.fn().mockResolvedValue({ data: { data: { url: '/api/uploads/x.webp', thumbUrl: '/api/uploads/x_thumb.webp' } } }),
  },
}));

describe('ImageUploader', () => {
  it('shows current image when value provided', () => {
    render(<ImageUploader value="/api/uploads/existing.webp" onChange={() => {}} />);
    const img = screen.getByAltText('Vista previa') as HTMLImageElement;
    expect(img.src).toContain('existing.webp');
  });

  it('uploads a selected file and calls onChange with the url', async () => {
    const onChange = vi.fn();
    render(<ImageUploader value="" onChange={onChange} />);
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('image-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/api/uploads/x.webp'));
  });

  it('shows empty drop zone when no value', () => {
    render(<ImageUploader value="" onChange={() => {}} />);
    expect(screen.getByText(/Arrastra una imagen/i)).toBeInTheDocument();
  });
});
