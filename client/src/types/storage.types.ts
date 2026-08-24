export interface FileUploadResult {
  downloadUrl: string;
  fullPath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  contentType?: string;
  uploadedBy?: string;
}
