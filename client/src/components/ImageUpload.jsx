import React, { useState, useRef } from 'react';
import '../styles/ImageUpload.css';

const ImageUpload = ({ onImageUpload, maxImages = 4 }) => {
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    const newImages = [];
    const remainingSlots = maxImages - images.length;
    
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = {
            id: Date.now() + i,
            file,
            url: e.target.result,
            name: file.name,
            size: file.size
          };
          
          setImages(prev => {
            const updated = [...prev, imageData];
            onImageUpload(updated);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelect(files);
  };

  const removeImage = (imageId) => {
    const updated = images.filter(img => img.id !== imageId);
    setImages(updated);
    onImageUpload(updated);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="image-upload-container">
      {images.length < maxImages && (
        <div
          className={`image-upload-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">📷</div>
          <div className="upload-text">
            <p>이미지를 드래그하거나 클릭하여 업로드</p>
            <span>JPG, PNG, GIF 지원 (최대 {maxImages}장)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {images.length > 0 && (
        <div className="uploaded-images">
          <div className="images-grid">
            {images.map((image) => (
              <div key={image.id} className="image-preview">
                <img src={image.url} alt={image.name} />
                <div className="image-overlay">
                  <button
                    className="remove-btn"
                    onClick={() => removeImage(image.id)}
                    title="이미지 제거"
                  >
                    ✕
                  </button>
                </div>
                <div className="image-info">
                  <span className="image-name">{image.name}</span>
                  <span className="image-size">{formatFileSize(image.size)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="images-summary">
            <span>{images.length}/{maxImages} 이미지 업로드됨</span>
            {images.length < maxImages && (
              <button 
                className="add-more-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                + 더 추가
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;