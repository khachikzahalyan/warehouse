// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CRA 5 runs tests against an older jsdom that does not expose TextEncoder /
// TextDecoder / structuredClone globals. The firebase v10 SDK (via undici)
// fails to load without them. Polyfill from Node's `util` so any test that
// transitively pulls firebase code through AuthContext / repositories works.
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore — Node's TextDecoder is assignable to the DOM TextDecoder for tests.
  global.TextDecoder = TextDecoder;
}
