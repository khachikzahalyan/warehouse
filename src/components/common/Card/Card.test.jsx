import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  test('renders children', () => {
    render(<Card>hello</Card>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  test('supports `as` prop', () => {
    const { container } = render(<Card as="section">x</Card>);
    expect(container.querySelector('section.card')).toBeInTheDocument();
  });

  test('applies padding and tone classes', () => {
    const { container } = render(
      <Card padding="lg" tone="warning">
        x
      </Card>
    );
    const el = container.querySelector('.card');
    expect(el).toHaveClass('card--pad-lg', 'card--tone-warning');
  });
});
