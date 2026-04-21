import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  test('renders nothing when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Asset detail">
        <p>body</p>
      </Drawer>
    );
    expect(screen.queryByText('body')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders title and children when open', () => {
    render(
      <Drawer open onClose={() => {}} title="Asset detail">
        <p>body</p>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Asset detail')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  test('Escape key calls onClose', () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} title="Hi">
        <p>x</p>
      </Drawer>
    );
    // user-event v13 has no keyboard() helper; fire the event on document directly
    // (same pattern as Modal.test.jsx).
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(onClose).toHaveBeenCalled();
  });

  test('backdrop click calls onClose when dismissOnBackdrop is default', () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} title="Hi">
        <p>x</p>
      </Drawer>
    );
    // Backdrop is the role="presentation" wrapper around the dialog.
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    // Dispatch mousedown on the backdrop itself (not bubbling from the panel),
    // which is how Modal / Drawer detect an outside-click.
    const event = new MouseEvent('mousedown', { bubbles: true });
    backdrop.dispatchEvent(event);
    expect(onClose).toHaveBeenCalled();
  });

  test('backdrop click does NOT call onClose when dismissOnBackdrop={false}', () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} title="Hi" dismissOnBackdrop={false}>
        <p>x</p>
      </Drawer>
    );
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    const event = new MouseEvent('mousedown', { bubbles: true });
    backdrop.dispatchEvent(event);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('close button calls onClose', () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} title="Hi">
        <p>x</p>
      </Drawer>
    );
    userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  test('moves focus inside the panel on open', () => {
    render(
      <Drawer open onClose={() => {}} title="Focus test">
        <button type="button">first</button>
        <button type="button">second</button>
      </Drawer>
    );
    // First focusable inside the drawer is the header close button.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /close/i })
    );
  });

  test('Tab on the last focusable element loops back to the first (focus trap)', () => {
    render(
      <Drawer open onClose={() => {}} title="Trap">
        <button type="button">first</button>
        <button type="button">last</button>
      </Drawer>
    );
    const closeBtn = screen.getByRole('button', { name: /close/i });
    const lastBtn = screen.getByRole('button', { name: 'last' });

    // Move focus to the last focusable element and press Tab — the trap
    // should send focus back to the first focusable (the close button).
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    // The keydown handler cancels the default and calls focus() on the first.
    expect(document.activeElement).toBe(closeBtn);
  });
});
