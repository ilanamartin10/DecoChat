import React, { useState } from 'react';
import styled from 'styled-components';
import BackButton from '../BackButton';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
  margin-bottom: 20px;
`;

const UploadContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
`;

const UploadArea = styled.div`
  border: 2px dashed #007bff;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f8f9fa;
  }
`;

const UploadInput = styled.input`
  display: none;
`;

const UploadText = styled.p`
  font-size: 18px;
  color: #666;
  margin: 10px 0;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  margin-top: 20px;
`;

const ResultsContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Section = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  color: #007bff;
  margin-bottom: 15px;
`;

const SectionContent = styled.div`
  color: #333;
  line-height: 1.6;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: center;
`;

interface CareGuide {
  materials: string;
  cleaningTips: string;
  maintenanceSchedule: string;
}

const CareGuidePage: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [careGuide, setCareGuide] = useState<CareGuide | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setCareGuide(null);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImage(previewUrl);
    setIsLoading(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        try {
          // Send to backend for processing
          const response = await fetch('http://localhost:8000/api/analyze-furniture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Image.split(',')[1], // Remove the data URL prefix
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze image');
          }

          const data = await response.json();
          setCareGuide(data);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'An error occurred');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Failed to process image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <BackButton />
      <Title>📚 Care Guide</Title>
      
      <UploadContainer>
        <UploadArea onClick={() => document.getElementById('image-upload')?.click()}>
          <UploadInput
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <UploadText>Click to upload a photo of your furniture</UploadText>
          <UploadText>or drag and drop an image here</UploadText>
        </UploadArea>
        {image && <PreviewImage src={image} alt="Preview" />}
      </UploadContainer>

      {isLoading && <LoadingSpinner />}

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      {careGuide && (
        <ResultsContainer>
          <Section>
            <SectionTitle>Materials</SectionTitle>
            <SectionContent>{careGuide.materials}</SectionContent>
          </Section>
          
          <Section>
            <SectionTitle>Cleaning Tips</SectionTitle>
            <SectionContent>{careGuide.cleaningTips}</SectionContent>
          </Section>
          
          <Section>
            <SectionTitle>Maintenance Schedule</SectionTitle>
            <SectionContent>{careGuide.maintenanceSchedule}</SectionContent>
          </Section>
        </ResultsContainer>
      )}
    </PageContainer>
  );
};

export default CareGuidePage; 