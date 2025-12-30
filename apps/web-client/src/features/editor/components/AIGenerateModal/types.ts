/**
 * Types for AI Generate Modal Components
 */

/**
 * Tab identifiers for the modal
 */
export type AIGenerateTab = 'file' | 'text';

/**
 * File input types supported
 */
export type FileInputType = 'image' | 'pdf' | 'docx';

/**
 * Request data to be sent to API
 */
export interface GenerateRequest {
  /**
   * Content type for API
   * Note: 'docx' files are converted to text before sending
   */
  contentType: 'image' | 'pdf' | 'text';

  /**
   * Content: base64 for image/pdf, text for text/docx
   */
  content: string;

  /**
   * MIME type (required for image/pdf)
   */
  mimeType?: string;
}

/**
 * Props for main AI Generate Modal
 */
export interface AIGenerateModalProps {
  /**
   * Whether modal is open
   */
  open: boolean;

  /**
   * Callback to change open state
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback when user initiates generation
   */
  onGenerate: (request: GenerateRequest) => Promise<void>;

  /**
   * Whether generation is currently in progress
   */
  isGenerating: boolean;

  /**
   * External error from the generation hook
   */
  externalError?: string | null;
}

/**
 * Props for File Upload Tab
 */
export interface FileUploadTabProps {
  /**
   * Callback when file is selected and ready
   */
  onFileReady: (file: File) => void;

  /**
   * Currently selected file
   */
  selectedFile: File | null;
}

/**
 * Props for Text Description Tab
 */
export interface TextDescriptionTabProps {
  /**
   * Callback when text changes
   */
  onTextChange: (text: string) => void;

  /**
   * Current text value
   */
  text: string;
}
