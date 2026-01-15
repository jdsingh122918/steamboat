import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Avatar, AvatarGroup } from '../ui/avatar';

describe('Avatar', () => {
  describe('rendering', () => {
    it('should render with image when src is provided', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);
      expect(screen.getByRole('img')).toHaveAttribute('src', '/avatar.jpg');
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'User');
    });

    it('should apply custom className', () => {
      render(<Avatar className="custom-class" />);
      expect(screen.getByTestId('avatar')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Avatar ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('fallback', () => {
    it('should show initials when no src is provided', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should show single initial for single name', () => {
      render(<Avatar name="John" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should show fallback icon when no name or src', () => {
      render(<Avatar />);
      expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
    });

    it('should show initials on image error', async () => {
      render(<Avatar src="/broken.jpg" name="John Doe" />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('should allow custom fallback', () => {
      render(<Avatar fallback={<span data-testid="custom-fallback">?</span>} />);
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Avatar />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-md');
    });

    it('should render xs size', () => {
      render(<Avatar size="xs" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-xs');
    });

    it('should render sm size', () => {
      render(<Avatar size="sm" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-sm');
    });

    it('should render lg size', () => {
      render(<Avatar size="lg" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-lg');
    });

    it('should render xl size', () => {
      render(<Avatar size="xl" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-xl');
    });
  });

  describe('shape', () => {
    it('should render circle shape by default', () => {
      render(<Avatar />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-circle');
    });

    it('should render square shape', () => {
      render(<Avatar shape="square" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-square');
    });
  });

  describe('status indicator', () => {
    it('should show online status', () => {
      render(<Avatar status="online" />);
      expect(screen.getByTestId('avatar-status')).toHaveClass('status-online');
    });

    it('should show offline status', () => {
      render(<Avatar status="offline" />);
      expect(screen.getByTestId('avatar-status')).toHaveClass('status-offline');
    });

    it('should show away status', () => {
      render(<Avatar status="away" />);
      expect(screen.getByTestId('avatar-status')).toHaveClass('status-away');
    });

    it('should show busy status', () => {
      render(<Avatar status="busy" />);
      expect(screen.getByTestId('avatar-status')).toHaveClass('status-busy');
    });

    it('should not show status when not provided', () => {
      render(<Avatar />);
      expect(screen.queryByTestId('avatar-status')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper alt text for image', () => {
      render(<Avatar src="/avatar.jpg" alt="John Doe's avatar" />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', "John Doe's avatar");
    });

    it('should use name as alt text when alt not provided', () => {
      render(<Avatar src="/avatar.jpg" name="John Doe" />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'John Doe');
    });
  });
});

describe('AvatarGroup', () => {
  it('should render multiple avatars', () => {
    render(
      <AvatarGroup>
        <Avatar name="John" />
        <Avatar name="Jane" />
        <Avatar name="Bob" />
      </AvatarGroup>
    );
    // Two 'J' initials for John and Jane
    expect(screen.getAllByText('J')).toHaveLength(2);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('should limit visible avatars with max prop', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="John" />
        <Avatar name="Jane" />
        <Avatar name="Bob" />
        <Avatar name="Alice" />
      </AvatarGroup>
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <AvatarGroup className="custom-class">
        <Avatar name="John" />
      </AvatarGroup>
    );
    expect(screen.getByTestId('avatar-group')).toHaveClass('custom-class');
  });

  it('should stack avatars with overlap', () => {
    render(
      <AvatarGroup>
        <Avatar name="John" />
        <Avatar name="Jane" />
      </AvatarGroup>
    );
    expect(screen.getByTestId('avatar-group')).toHaveClass('avatar-group-stacked');
  });

  it('should pass size to all avatars', () => {
    render(
      <AvatarGroup size="lg">
        <Avatar name="John" />
        <Avatar name="Jane" />
      </AvatarGroup>
    );
    const avatars = screen.getAllByTestId('avatar');
    avatars.forEach(avatar => {
      expect(avatar).toHaveClass('avatar-lg');
    });
  });
});
