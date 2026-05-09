/**
 * PasswordInput component — show/hide password toggle.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordInput from '@/components/ui/PasswordInput';

describe('PasswordInput', () => {
  it('renders with type=password by default', () => {
    render(<PasswordInput placeholder="pwd" />);
    const input = screen.getByPlaceholderText('pwd') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('toggles to type=text when the eye button is clicked', () => {
    render(<PasswordInput placeholder="pwd" />);
    const input = screen.getByPlaceholderText('pwd') as HTMLInputElement;
    const button = screen.getByRole('button', { name: /mostra password/i });

    expect(input.type).toBe('password');
    fireEvent.click(button);
    expect(input.type).toBe('text');
  });

  it('toggles back to type=password on second click', () => {
    render(<PasswordInput placeholder="pwd" />);
    const input = screen.getByPlaceholderText('pwd') as HTMLInputElement;
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(input.type).toBe('text');
    fireEvent.click(button);
    expect(input.type).toBe('password');
  });

  it('updates aria-pressed and aria-label as state toggles', () => {
    render(<PasswordInput placeholder="pwd" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-label', 'Mostra password');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-label', 'Nascondi password');
  });

  it('button has type=button and does not submit a parent form', () => {
    let submitted = false;
    render(
      <form onSubmit={() => (submitted = true)}>
        <PasswordInput placeholder="pwd" />
      </form>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(submitted).toBe(false);
  });
});
