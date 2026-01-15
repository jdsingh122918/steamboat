import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, BottomSheet } from '../ui/modal';

describe('Modal', () => {
  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<Modal isOpen={false} onClose={() => {}}>Content</Modal>);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Modal content</Modal>);
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should render backdrop', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
    });
  });

  describe('closing', () => {
    it('should call onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not close on backdrop click when closeOnBackdropClick is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={false}>
          Content
        </Modal>
      );
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('should call onClose when escape is pressed', () => {
      const handleClose = vi.fn();
      render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not close on escape when closeOnEscape is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
          Content
        </Modal>
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      expect(screen.getByTestId('modal-dialog')).toHaveClass('modal-md');
    });

    it('should render small size', () => {
      render(<Modal isOpen={true} onClose={() => {}} size="sm">Content</Modal>);
      expect(screen.getByTestId('modal-dialog')).toHaveClass('modal-sm');
    });

    it('should render large size', () => {
      render(<Modal isOpen={true} onClose={() => {}} size="lg">Content</Modal>);
      expect(screen.getByTestId('modal-dialog')).toHaveClass('modal-lg');
    });

    it('should render full size', () => {
      render(<Modal isOpen={true} onClose={() => {}} size="full">Content</Modal>);
      expect(screen.getByTestId('modal-dialog')).toHaveClass('modal-full');
    });
  });

  describe('accessibility', () => {
    it('should have dialog role', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should support aria-labelledby', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} aria-labelledby="modal-title">
          <h2 id="modal-title">Title</h2>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });
});

describe('ModalContent', () => {
  it('should render children', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalContent>Content</ModalContent>
      </Modal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalContent className="custom-class">Content</ModalContent>
      </Modal>
    );
    expect(screen.getByTestId('modal-content')).toHaveClass('custom-class');
  });
});

describe('ModalHeader', () => {
  it('should render children', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalHeader>Header</ModalHeader>
      </Modal>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should render close button by default', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalHeader>Header</ModalHeader>
      </Modal>
    );
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('should hide close button when showClose is false', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalHeader showClose={false}>Header</ModalHeader>
      </Modal>
    );
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalHeader>Header</ModalHeader>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('ModalBody', () => {
  it('should render children', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalBody>Body content</ModalBody>
      </Modal>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalBody className="custom-class">Body</ModalBody>
      </Modal>
    );
    expect(screen.getByTestId('modal-body')).toHaveClass('custom-class');
  });
});

describe('ModalFooter', () => {
  it('should render children', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalFooter>Footer</ModalFooter>
      </Modal>
    );
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalFooter className="custom-class">Footer</ModalFooter>
      </Modal>
    );
    expect(screen.getByTestId('modal-footer')).toHaveClass('custom-class');
  });
});

describe('BottomSheet', () => {
  it('should not render when isOpen is false', () => {
    render(<BottomSheet isOpen={false} onClose={() => {}}>Content</BottomSheet>);
    expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<BottomSheet isOpen={true} onClose={() => {}}>Content</BottomSheet>);
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(<BottomSheet isOpen={true} onClose={() => {}}>Sheet content</BottomSheet>);
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('should render drag handle', () => {
    render(<BottomSheet isOpen={true} onClose={() => {}}>Content</BottomSheet>);
    expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
  });

  it('should call onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(<BottomSheet isOpen={true} onClose={handleClose}>Content</BottomSheet>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  describe('heights', () => {
    it('should render with auto height by default', () => {
      render(<BottomSheet isOpen={true} onClose={() => {}}>Content</BottomSheet>);
      expect(screen.getByTestId('bottom-sheet')).toHaveClass('bottom-sheet-auto');
    });

    it('should render with half height', () => {
      render(<BottomSheet isOpen={true} onClose={() => {}} height="half">Content</BottomSheet>);
      expect(screen.getByTestId('bottom-sheet')).toHaveClass('bottom-sheet-half');
    });

    it('should render with full height', () => {
      render(<BottomSheet isOpen={true} onClose={() => {}} height="full">Content</BottomSheet>);
      expect(screen.getByTestId('bottom-sheet')).toHaveClass('bottom-sheet-full');
    });
  });
});
