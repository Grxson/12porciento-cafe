import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import NotesCapture from '../NotesCapture';

// SpeechRecognition not in jsdom — component should handle missing API gracefully
describe('NotesCapture', () => {
  it('renders template buttons', () => {
    render(<NotesCapture value="" onChange={vi.fn()} />);
    expect(screen.getByText('Muy caliente')).toBeInTheDocument();
    expect(screen.getByText('Amargo')).toBeInTheDocument();
    expect(screen.getByText('Perfecto')).toBeInTheDocument();
  });

  it('clicking template appends to notes', () => {
    const onChange = vi.fn();
    render(<NotesCapture value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('Perfecto'));
    expect(onChange).toHaveBeenCalledWith('Perfecto');
  });

  it('clicking template when notes already set appends with separator', () => {
    const onChange = vi.fn();
    render(<NotesCapture value="Muy caliente" onChange={onChange} />);
    fireEvent.click(screen.getByText('Amargo'));
    expect(onChange).toHaveBeenCalledWith('Muy caliente · Amargo');
  });

  it('free text input updates notes', () => {
    const onChange = vi.fn();
    render(<NotesCapture value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/escribe/i);
    fireEvent.change(input, { target: { value: 'ajustar molienda' } });
    expect(onChange).toHaveBeenCalledWith('ajustar molienda');
  });

  it('does not render voice button when SpeechRecognition unavailable', () => {
    // jsdom has no SpeechRecognition by default
    render(<NotesCapture value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /grabar/i })).toBeNull();
  });
});
