import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from './SearchableSelect';

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

test('opens, filters, and selects', () => {
  const onChange = jest.fn();
  render(
    <SearchableSelect
      options={OPTIONS}
      value={null}
      onChange={onChange}
      placeholder="Pick fruit"
    />,
  );

  const input = screen.getByRole('combobox');
  userEvent.click(input);
  userEvent.type(input, 'Ban');
  userEvent.click(screen.getByRole('option', { name: 'Banana' }));
  expect(onChange).toHaveBeenCalledWith('b');
});

test('shows current value label when value is set', () => {
  render(
    <SearchableSelect options={OPTIONS} value="c" onChange={() => {}} placeholder="Pick" />,
  );
  expect(screen.getByRole('combobox')).toHaveValue('Cherry');
});

test('renders empty-state message when no matches', () => {
  render(
    <SearchableSelect
      options={OPTIONS}
      value={null}
      onChange={() => {}}
      placeholder="Pick"
      emptyLabel="Nothing"
    />,
  );
  const input = screen.getByRole('combobox');
  userEvent.click(input);
  userEvent.type(input, 'zzz');
  expect(screen.getByText('Nothing')).toBeInTheDocument();
});

test('disabled input does not open dropdown', () => {
  const onChange = jest.fn();
  render(
    <SearchableSelect
      options={OPTIONS}
      value={null}
      onChange={onChange}
      disabled
      emptyMessage="Not available"
    />,
  );
  const input = screen.getByRole('combobox');
  expect(input).toBeDisabled();
  userEvent.click(input);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('keyboard arrow + enter selects an option', () => {
  const onChange = jest.fn();
  render(
    <SearchableSelect options={OPTIONS} value={null} onChange={onChange} placeholder="Pick" />,
  );
  const input = screen.getByRole('combobox');
  userEvent.click(input);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('a');
});

test('Escape closes the dropdown', () => {
  render(
    <SearchableSelect options={OPTIONS} value={null} onChange={() => {}} placeholder="Pick" />,
  );
  const input = screen.getByRole('combobox');
  userEvent.click(input);
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
