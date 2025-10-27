import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main heading', () => {
  render(<App />);
  const heading = screen.getByText(/CYCL.v1.0/i);
  expect(heading).toBeInTheDocument();
});
