import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  test('renders primary by default', () => {
    render(<Button>Click me</Button>);
    const el = screen.getByRole('button', { name: /click me/i });
    expect(el).toHaveClass('btn', 'btn--primary', 'btn--md');
  });

  test('applies variant and size classes', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>
    );
    const el = screen.getByRole('button', { name: /delete/i });
    expect(el).toHaveClass('btn--danger', 'btn--lg');
  });

  test('loading disables the button and sets aria-busy', () => {
    render(<Button loading>Saving</Button>);
    const el = screen.getByRole('button', { name: /saving/i });
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute('aria-busy', 'true');
  });

  test('disabled prop disables the button', () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole('button', { name: /off/i })).toBeDisabled();
  });

  test('onClick fires when clicked', () => {
    const fn = jest.fn();
    render(<Button onClick={fn}>Hit</Button>);
    userEvent.click(screen.getByRole('button', { name: /hit/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('iconLeft renders when not loading', () => {
    render(
      <Button iconLeft={<span data-testid="left" />}>With icon</Button>
    );
    expect(screen.getByTestId('left')).toBeInTheDocument();
  });

  test('fullWidth class applied', () => {
    render(<Button fullWidth>W</Button>);
    expect(screen.getByRole('button', { name: /w/i })).toHaveClass('btn--full');
  });
});
