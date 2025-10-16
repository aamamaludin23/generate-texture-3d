
import React, { useState, useRef, useCallback } from 'react';
import UploadIcon from './icons/UploadIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileSelect]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative w-full max-w-lg border-2 border-dashed rounded-lg p-10 text-center transition-colors duration-300 ${
          isDragging ? 'border-cyan-400 bg-gray-700' : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <div className="flex flex-col items-center">
          <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
          <p className="mb-2 text-gray-300">
            <span className="font-semibold">Drag and drop</span> your FBX file here
          </p>
          <p className="text-xs text-gray-500">or</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".fbx"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={onButtonClick}
            className="mt-4 px-6 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all"
          >
            Browse File
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
