import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  test('renders title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  test('renders subtitle when provided', () => {
    render(<PageHeader title="T" subtitle="Sub" />);
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  test('renders actions slot', () => {
    render(
      <PageHeader
        title="T"
        actions={<button data-testid="cta">New</button>}
      />
    );
    expect(screen.getByTestId('cta')).toBeInTheDocument();
  });
});
