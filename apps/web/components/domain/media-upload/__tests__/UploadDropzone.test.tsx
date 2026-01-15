import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadDropzone } from '../UploadDropzone';

function createMockDataTransfer(files: File[]): DataTransfer {
  const dataTransfer = {
    files: {
      length: files.length,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file;
        }
      },
    } as unknown as FileList,
    dropEffect: 'none',
    effectAllowed: 'all',
  };
  files.forEach((file, index) => {
    (dataTransfer.files as Record<number, File>)[index] = file;
  });
  return dataTransfer as unknown as DataTransfer;
}

describe('UploadDropzone', () => {
  const mockOnFilesAdded = vi.fn();
  const mockSetIsDragging = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dropzone', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
    });

    it('should render file input', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      expect(screen.getByTestId('upload-file-input')).toBeInTheDocument();
    });

    it('should render default message when not dragging', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      expect(
        screen.getByText(/drag & drop files here or click to browse/i)
      ).toBeInTheDocument();
    });

    it('should render drag message when dragging', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={true}
          setIsDragging={mockSetIsDragging}
        />
      );

      expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    });

    it('should render supported formats hint', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      expect(
        screen.getByText(/supports jpeg, png, gif, webp, heic, mp4, mov, webm/i)
      ).toBeInTheDocument();
    });
  });

  describe('css classes', () => {
    it('should have active class when dragging', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={true}
          setIsDragging={mockSetIsDragging}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).toHaveClass('upload-dropzone-active');
    });

    it('should not have active class when not dragging', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).not.toHaveClass('upload-dropzone-active');
    });

    it('should have compact class when compact prop is true', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
          compact={true}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).toHaveClass('upload-dropzone-compact');
    });

    it('should not have compact class by default', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).not.toHaveClass('upload-dropzone-compact');
    });
  });

  describe('drag events', () => {
    it('should call setIsDragging(true) on drag enter', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.dragEnter(dropzone);

      expect(mockSetIsDragging).toHaveBeenCalledWith(true);
    });

    it('should call setIsDragging(false) on drag leave', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={true}
          setIsDragging={mockSetIsDragging}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.dragLeave(dropzone);

      expect(mockSetIsDragging).toHaveBeenCalledWith(false);
    });

    it('should prevent default on drag over', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      const event = fireEvent.dragOver(dropzone);

      expect(event).toBe(false); // Event was prevented
    });

    it('should call onFilesAdded on drop', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={true}
          setIsDragging={mockSetIsDragging}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dataTransfer = createMockDataTransfer([file]);

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.drop(dropzone, { dataTransfer });

      expect(mockOnFilesAdded).toHaveBeenCalled();
    });

    it('should call setIsDragging(false) on drop', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={true}
          setIsDragging={mockSetIsDragging}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dataTransfer = createMockDataTransfer([file]);

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.drop(dropzone, { dataTransfer });

      expect(mockSetIsDragging).toHaveBeenCalledWith(false);
    });
  });

  describe('click interaction', () => {
    it('should open file picker on click', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const fileInput = screen.getByTestId('upload-file-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.click(dropzone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should call onFilesAdded when files are selected', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('upload-file-input');

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(fileInput);

      expect(mockOnFilesAdded).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not trigger file picker when disabled', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
          disabled={true}
        />
      );

      const fileInput = screen.getByTestId('upload-file-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.click(dropzone);

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should not call setIsDragging when disabled on drag enter', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
          disabled={true}
        />
      );

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.dragEnter(dropzone);

      expect(mockSetIsDragging).not.toHaveBeenCalled();
    });

    it('should not call onFilesAdded when disabled on drop', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
          disabled={true}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dataTransfer = createMockDataTransfer([file]);

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.drop(dropzone, { dataTransfer });

      expect(mockOnFilesAdded).not.toHaveBeenCalled();
    });

    it('should disable file input when disabled', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
          disabled={true}
        />
      );

      const fileInput = screen.getByTestId('upload-file-input');
      expect(fileInput).toBeDisabled();
    });
  });

  describe('file input attributes', () => {
    it('should accept multiple files', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const fileInput = screen.getByTestId('upload-file-input');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should accept image and video files', () => {
      render(
        <UploadDropzone
          onFilesAdded={mockOnFilesAdded}
          isDragging={false}
          setIsDragging={mockSetIsDragging}
        />
      );

      const fileInput = screen.getByTestId('upload-file-input');
      expect(fileInput).toHaveAttribute('accept', 'image/*,video/*');
    });
  });
});
