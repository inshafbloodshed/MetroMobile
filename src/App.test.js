import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the worker login screen on the default route', () => {
  render(<App />);
  expect(screen.getByText(/worker login/i)).toBeInTheDocument();
});
