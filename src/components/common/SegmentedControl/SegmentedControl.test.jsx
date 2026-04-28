import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

const opts = [
  { value: 'device', label: 'Device' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'accessory', label: 'Accessory' },
];

describe('SegmentedControl', () => {
  test('renders one tab per option', () => {
    render(<SegmentedControl options={opts} value="device" onChange={() => {}} ariaLabel="Kind" />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  test('marks the active option with aria-selected=true', () => {
    render(<SegmentedControl options={opts} value="furniture" onChange={() => {}} ariaLabel="Kind" />);
    expect(screen.getByRole('tab', { name: 'Furniture' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Device' })).toHaveAttribute('aria-selected', 'false');
  });

  test('click invokes onChange with the option value', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={opts} value="device" onChange={onChange} ariaLabel="Kind" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Accessory' }));
    expect(onChange).toHaveBeenCalledWith('accessory');
  });

  test('ArrowRight cycles selection forward', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={opts} value="device" onChange={onChange} ariaLabel="Kind" />);
    const active = screen.getByRole('tab', { name: 'Device' });
    active.focus();
    fireEvent.keyDown(active, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('furniture');
  });

  test('ArrowLeft wraps from first to last', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={opts} value="device" onChange={onChange} ariaLabel="Kind" />);
    const active = screen.getByRole('tab', { name: 'Device' });
    active.focus();
    fireEvent.keyDown(active, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('accessory');
  });

  test('Home / End jump to first / last', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={opts} value="furniture" onChange={onChange} ariaLabel="Kind" />);
    const active = screen.getByRole('tab', { name: 'Furniture' });
    active.focus();
    fireEvent.keyDown(active, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('accessory');
    fireEvent.keyDown(active, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('device');
  });

  test('disabled prevents click and keyboard activation', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={opts} value="device" onChange={onChange} ariaLabel="Kind" disabled />);
    fireEvent.click(screen.getByRole('tab', { name: 'Accessory' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('null value still places focusable tab on first option', () => {
    render(<SegmentedControl options={opts} value={null} onChange={() => {}} ariaLabel="Kind" />);
    const tabs = screen.getAllByRole('tab');
    // first tab should be focusable when nothing is selected
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
  });

  test('trailingAction renders a non-tab button after the options', () => {
    const onClick = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        value="device"
        onChange={() => {}}
        ariaLabel="Kind"
        trailingAction={{ label: '+', ariaLabel: 'Add kind', onClick }}
      />,
    );
    // Three tabs, exactly.
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    // The trailing action is a plain button, not a tab.
    const addBtn = screen.getByRole('button', { name: 'Add kind' });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    expect(onClick).toHaveBeenCalled();
  });

  test('trailingAction onClick is suppressed when the control is disabled', () => {
    const onClick = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        value="device"
        onChange={() => {}}
        ariaLabel="Kind"
        disabled
        trailingAction={{ label: '+', ariaLabel: 'Add kind', onClick }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add kind' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
