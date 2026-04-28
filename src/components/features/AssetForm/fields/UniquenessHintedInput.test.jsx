import { render, screen } from '@testing-library/react';
import { UniquenessHintedInput } from './UniquenessHintedInput';

// i18next mock — returns fallback string so assertions work without locale files.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, fallback, opts) => {
      if (typeof fallback !== 'string') return _key;
      if (opts && typeof opts === 'object') {
        return Object.entries(opts).reduce(
          (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
          fallback,
        );
      }
      return fallback;
    },
    i18n: { changeLanguage: () => {} },
  }),
}));

test('shows checking spinner', () => {
  render(<UniquenessHintedInput value="A" onChange={() => {}} status="checking" />);
  expect(screen.getByLabelText(/checking/i)).toBeInTheDocument();
});

test('shows unique check', () => {
  render(<UniquenessHintedInput value="A" onChange={() => {}} status="unique" />);
  expect(screen.getByLabelText(/free/i)).toBeInTheDocument();
});

test('shows conflict with name', () => {
  render(
    <UniquenessHintedInput value="A" onChange={() => {}} status="conflict" conflictName="Old laptop" />,
  );
  expect(screen.getByText(/Old laptop/)).toBeInTheDocument();
});

test('idle state shows no hint', () => {
  render(<UniquenessHintedInput value="" onChange={() => {}} status="idle" />);
  expect(screen.queryByLabelText(/checking/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/free/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/conflict/i)).not.toBeInTheDocument();
});
