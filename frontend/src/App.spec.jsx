import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

// Mock the API services to prevent real network calls
vi.mock('./services/api', () => ({
  cvService: {
    listCVs: vi.fn().mockResolvedValue([]),
  },
  jdService: {
    listJDs: vi.fn().mockResolvedValue([]),
  },
  reportService: {
    listReports: vi.fn().mockResolvedValue([]),
  },
  ollamaService: {
    getModels: vi.fn().mockResolvedValue([]),
  }
}));

describe('App Component', () => {
  it('renders without crashing', async () => {
    render(<App />);

    // Use waitFor to handle the async state updates from useEffect
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /AiToS/i })).toBeInTheDocument();
    });
  });
});
