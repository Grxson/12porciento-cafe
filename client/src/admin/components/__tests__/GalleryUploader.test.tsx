import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import GalleryUploader from '../GalleryUploader';

vi.mock('../../../api', () => ({
  uploadsApi: {
    upload: vi.fn().mockResolvedValue({ data: { data: { url: '/api/uploads/new.webp', thumbUrl: '/api/uploads/new_thumb.webp' } } }),
  },
}));

describe('GalleryUploader', () => {
  it('renders existing gallery images', () => {
    render(<GalleryUploader value={['/api/uploads/a.webp', '/api/uploads/b.webp']} onChange={() => {}} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('uploads a new image and appends it via onChange', async () => {
    const onChange = vi.fn();
    render(<GalleryUploader value={[]} onChange={onChange} />);
    const file = new File(['x'], 'bean.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('gallery-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['/api/uploads/new.webp']));
  });

  it('removes an image via onChange', () => {
    const onChange = vi.fn();
    render(<GalleryUploader value={['/api/uploads/a.webp', '/api/uploads/b.webp']} onChange={onChange} />);
    fireEvent.click(screen.getAllByLabelText(/quitar/i)[0]);
    expect(onChange).toHaveBeenCalledWith(['/api/uploads/b.webp']);
  });

  it('hides the add button when at the max (8)', () => {
    const eight = Array.from({ length: 8 }, (_, i) => `/api/uploads/${i}.webp`);
    render(<GalleryUploader value={eight} onChange={() => {}} />);
    expect(screen.queryByTestId('gallery-file-input')).toBeNull();
  });
});
