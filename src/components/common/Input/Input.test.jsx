import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';
import { FormField } from './FormField';

describe('Input', () => {
  test('renders and accepts typing', () => {
    render(<Input placeholder="Email" aria-label="email-input" />);
    const el = screen.getByLabelText('email-input');
    userEvent.type(el, 'foo@bar.com');
    expect(el).toHaveValue('foo@bar.com');
  });

  test('invalid sets aria-invalid', () => {
    render(<Input invalid aria-label="e" />);
    expect(screen.getByLabelText('e')).toHaveAttribute('aria-invalid', 'true');
  });

  test('prefix and suffix render', () => {
    render(
      <Input
        aria-label="x"
        prefix={<span data-testid="prefix">$</span>}
        suffix={<span data-testid="suffix">.com</span>}
      />
    );
    expect(screen.getByTestId('prefix')).toBeInTheDocument();
    expect(screen.getByTestId('suffix')).toBeInTheDocument();
  });
});

describe('FormField', () => {
  test('connects label to input and shows error with aria-describedby', () => {
    render(
      <FormField label="Email" error="Required" required>
        <Input />
      </FormField>
    );
    const input = screen.getByLabelText(/Email/);
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Required');
    expect(input.getAttribute('aria-describedby')).toContain(errorEl.id);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('helper renders when no error', () => {
    render(
      <FormField label="Email" helper="We will not share it">
        <Input />
      </FormField>
    );
    expect(screen.getByText(/We will not share it/)).toBeInTheDocument();
  });
});
