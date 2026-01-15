import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useParams and useRouter
const mockParams = { tripId: 'trip123' };
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock data
const mockTrip = {
  id: 'trip123',
  name: 'Bachelor Party Vegas',
  startDate: '2024-04-15',
  endDate: '2024-04-18',
  location: 'Steamboat, Colorado',
  settings: {
    groomExemptCategories: ['lodging', 'transport'],
    defaultInviteExpiration: 14,
  },
};

const mockCurrentUser = { id: 'att1', role: 'organizer' };

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/trips/') && !url.includes('/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTrip }),
      });
    }
    if (url.includes('/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import SettingsPage from '../page';

describe('SettingsPage', () => {
  describe('rendering', () => {
    it('should render the settings page', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });
    });

    it('should render page header', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('settings-loading')).toBeInTheDocument();
    });
  });

  describe('trip info section', () => {
    it('should display trip name', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bachelor Party Vegas')).toBeInTheDocument();
      });
    });

    it('should display trip location', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('Steamboat, Colorado')).toBeInTheDocument();
      });
    });

    it('should display trip dates', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('2024-04-15')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2024-04-18')).toBeInTheDocument();
      });
    });
  });

  describe('groom exemption', () => {
    it('should show groom exempt categories section', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/groom exempt/i)).toBeInTheDocument();
      });
    });

    it('should display exempt categories', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/lodging/i)).toBeInTheDocument();
        expect(screen.getByText(/transport/i)).toBeInTheDocument();
      });
    });
  });

  describe('invite settings', () => {
    it('should show default invite expiration', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByLabelText(/invite expiration/i)).toBeInTheDocument();
      });
    });

    it('should display current expiration value', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        const input = screen.getByLabelText(/invite expiration/i) as HTMLInputElement;
        expect(input.value).toBe('14');
      });
    });
  });

  describe('save changes', () => {
    it('should render save button', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('should call API on save', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockTrip }),
          });
        }
        if (url.includes('/api/trips/') && !url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockTrip }),
          });
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/trips/trip123'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });
  });

  describe('danger zone', () => {
    it('should show danger zone for organizer', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
      });
    });

    it('should show delete trip button', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete trip/i })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });
});
