import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  test('onChange fires with the picked value', () => {
    const fn = jest.fn();
    render(
      <Select aria-label="lang" onChange={fn} defaultValue="en">
        <option value="en">English</option>
        <option value="ru">Russian</option>
      </Select>
    );
    userEvent.selectOptions(screen.getByLabelText('lang'), 'ru');
    expect(fn).toHaveBeenCalled();
    expect(screen.getByLabelText('lang')).toHaveValue('ru');
  });

  test('invalid marks the element aria-invalid', () => {
    render(
      <Select aria-label="x" invalid>
        <option>a</option>
      </Select>
    );
    expect(screen.getByLabelText('x')).toHaveAttribute('aria-invalid', 'true');
  });
});
