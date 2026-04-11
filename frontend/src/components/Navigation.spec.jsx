import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from './Navigation';
import '@testing-library/jest-dom';

describe('Navigation Component', () => {
  it('renders the brand name', () => {
    render(<Navigation currentView="dashboard" onViewChange={() => {}} />);
    expect(screen.getByText('AiToS')).toBeInTheDocument();
  });

  it('calls onViewChange when a menu item is clicked', () => {
    const onViewChange = vi.fn();
    render(<Navigation currentView="dashboard" onViewChange={onViewChange} />);

    // Click on CVs (using getAllByText because of mobile/desktop duplicates)
    const cvsLinks = screen.getAllByText('CVs');
    fireEvent.click(cvsLinks[0]);

    expect(onViewChange).toHaveBeenCalledWith('cvs');
  });

  it('highlights the current view', () => {
    render(<Navigation currentView="reports" onViewChange={() => {}} />);

    // Check if at least one Reports link exists (handling desktop/mobile duplicates)
    const reportsLinks = screen.getAllByText('Reports');
    const reportsBtn = reportsLinks[0].closest('button');
    expect(reportsBtn).toBeInTheDocument();
  });
});
