import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  test.each([
    ['neutral', 'badge--neutral'],
    ['primary', 'badge--primary'],
    ['success', 'badge--success'],
    ['warning', 'badge--warning'],
    ['danger', 'badge--danger'],
    ['info', 'badge--info'],
  ])('tone %s applies class %s', (tone, cls) => {
    render(<Badge tone={tone}>x</Badge>);
    expect(screen.getByText('x')).toHaveClass('badge', cls);
  });

  test('renders children', () => {
    render(<Badge>hello</Badge>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
