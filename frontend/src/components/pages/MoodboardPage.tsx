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
  border: 2px dashed #ccc;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
`;

const UploadButton = styled.button`
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;

  &:hover {
    background-color: #0056b3;
  }
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 400px;
  margin: 20px 0;
  border-radius: 8px;
`;

const ResultsContainer = styled.div`
  margin-top: 40px;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const VibeDescription = styled.div`
  background-color: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 30px;
  border-left: 4px solid #007bff;

  h2 {
    color: #007bff;
    margin-bottom: 15px;
    font-size: 24px;
  }

  p {
    font-size: 18px;
    line-height: 1.6;
    color: #495057;
  }
`;

const RecommendationsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
  margin-top: 30px;
`;

const RecommendationCard = styled.div`
  background-color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
  }

  h3 {
    color: #212529;
    font-size: 20px;
    margin-bottom: 15px;
  }

  p {
    color: #6c757d;
    line-height: 1.6;
    margin-bottom: 15px;
  }
`;

const RecommendationLink = styled.a`
  color: #007bff;
  text-decoration: none;
  display: inline-block;
  margin-top: 15px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #e7f1ff;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #007bff;
    color: white;
    text-decoration: none;
  }
`;

const SectionTitle = styled.h2`
  color: #212529;
  font-size: 28px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
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
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
  font-size: 16px;
`;

const MoodboardPage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResults(null);
      setError(null);
    }
  };

  const handleUploadClick = () => {
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('http://localhost:8000/api/analyze-moodboard', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image. Please try again.');
      console.error('Error analyzing image:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <BackButton />
      <Title>🎨 Room Analyzer</Title>
      
      <UploadContainer>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="image-upload"
        />
        <UploadButton onClick={handleUploadClick}>
          Upload Room Image
        </UploadButton>
        {previewUrl && (
          <>
            <ImagePreview src={previewUrl} alt="Preview" />
            <UploadButton onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Room'}
            </UploadButton>
          </>
        )}
      </UploadContainer>

      {loading && <LoadingSpinner />}

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      {results && (
        <ResultsContainer>
          <VibeDescription>
            <h2>Room Vibe</h2>
            <p>{results.vibe}</p>
          </VibeDescription>

          <SectionTitle>Recommended Furniture</SectionTitle>
          <RecommendationsList>
            {results.recommendations.map((item: any, index: number) => (
              <RecommendationCard key={index}>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {item.link && (
                  <RecommendationLink href={item.link} target="_blank" rel="noopener noreferrer">
                    View Product
                  </RecommendationLink>
                )}
              </RecommendationCard>
            ))}
          </RecommendationsList>
        </ResultsContainer>
      )}
    </PageContainer>
  );
};

export default MoodboardPage; 