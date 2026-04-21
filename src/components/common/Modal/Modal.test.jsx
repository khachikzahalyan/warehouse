import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  test('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hello">
        <p>body</p>
      </Modal>
    );
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  test('renders title and children when open', () => {
    render(
      <Modal open onClose={() => {}} title="Hello">
        <p>body</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  test('Escape key calls onClose', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Hi">
        <p>x</p>
      </Modal>
    );
    // user-event v13 has no keyboard() helper; fire the event on document directly.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalled();
  });

  test('Close button calls onClose', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Hi">
        <p>x</p>
      </Modal>
    );
    userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
