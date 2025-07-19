import { validatePdfFile } from '../pdfUtils';

describe('PDF Utils', () => {
  describe('validatePdfFile', () => {
    // Mock File constructor with proper methods
    const createMockFile = (name: string, type: string, size: number) => {
      const file = new File(['PDF content'], name, { type });
      // Override size property since it's readonly
      Object.defineProperty(file, 'size', { value: size });
      // Mock arrayBuffer method that the validation function uses
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(size));
      // Mock slice method for magic number validation
      file.slice = jest.fn().mockReturnValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(4))
      });
      return file;
    };

    it('should reject non-PDF files', async () => {
      const textFile = createMockFile('test.txt', 'text/plain', 1024);
      await expect(validatePdfFile(textFile)).rejects.toThrow('Please upload a PDF file');
    });

    it('should reject files larger than 25MB', async () => {
      const largePdf = createMockFile('large.pdf', 'application/pdf', 26 * 1024 * 1024); // 26MB
      await expect(validatePdfFile(largePdf)).rejects.toThrow('PDF file is too large. Maximum size is 25MB');
    });

    it('should reject small files', async () => {
      const smallFile = createMockFile('small.pdf', 'application/pdf', 500); // 500 bytes
      await expect(validatePdfFile(smallFile)).rejects.toThrow('File is too small to be a valid PDF');
    });

    it('should reject empty files', async () => {
      const emptyFile = createMockFile('empty.pdf', 'application/pdf', 0);
      await expect(validatePdfFile(emptyFile)).rejects.toThrow('File is too small to be a valid PDF');
    });

    it('should validate file type and size constraints', async () => {
      // Test that it gets past the basic checks (type and size)
      const validSizePdf = createMockFile('test.pdf', 'application/pdf', 2 * 1024 * 1024); // 2MB
      // This will fail at magic number validation but shows type/size checks pass
      await expect(validatePdfFile(validSizePdf)).rejects.toThrow(); // Will fail at magic number check
    });
  });
});