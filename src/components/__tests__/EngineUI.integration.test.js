import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EngineUI from '../../EngineUI'

// Integration-ish test: open Start Screen -> Quick Start -> expect engine to start
test('Quick Start opens StartScreen and starts a game (log contains Started game)', async () => {
  render(<EngineUI />)

  // Open the start screen dialog
  const openBtn = screen.getByText(/Open Start Screen/i)
  fireEvent.click(openBtn)

  // Quick Start button should appear inside StartScreen
  const quickBtn = await screen.findByText(/Quick Start/i)
  fireEvent.click(quickBtn)

  // Wait for engine to initialize and log to contain 'Started game:'
  await waitFor(() => expect(screen.getByText(/Started game:/i)).toBeInTheDocument(), { timeout: 3000 })
})
