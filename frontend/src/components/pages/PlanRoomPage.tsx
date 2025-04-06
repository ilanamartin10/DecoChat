import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import BackButton from '../BackButton';

const API_URL = process.env.BACKEND_URL || 'http://localhost:8000';

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

const ContentContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  margin-top: 20px;
`;

const Sidebar = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const RoomCanvas = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
`;

const CanvasGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(to right, #f0f0f0 1px, transparent 1px),
    linear-gradient(to bottom, #f0f0f0 1px, transparent 1px);
  background-size: 20px 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const Button = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
  margin-bottom: 10px;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const FurnitureList = styled.div`
  margin-top: 20px;
`;

const FurnitureItem = styled.div`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: move;
  background: white;

  &:hover {
    background: #f5f5f5;
  }
`;

const FurniturePreview = styled.div<{ width: number; height: number }>`
  position: absolute;
  background: rgba(0, 123, 255, 0.2);
  border: 2px solid #007bff;
  width: ${props => props.width}px;
  height: ${props => props.height}px;
  cursor: move;
`;

const SaveButton = styled(Button)`
  background: #28a745;
  margin-top: 20px;

  &:hover {
    background: #218838;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 20px;
`;

const FurnitureName = styled.div`
  font-weight: 500;
  margin-bottom: 5px;
`;

const FurnitureDetails = styled.div`
  font-size: 12px;
  color: #666;
`;

const FurnitureDescription = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 5px;
`;

const PlanRoomPage: React.FC = () => {
  const [roomWidth, setRoomWidth] = useState<number>(400);
  const [roomHeight, setRoomHeight] = useState<number>(300);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [furnitureItems, setFurnitureItems] = useState<Array<{
    name: string;
    width: number;
    height: number;
    depth: number;
    description: string;
  }>>([]);
  const [furniture, setFurniture] = useState<Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
  }>>([]);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch categories when component mounts
    fetch(`${API_URL}/api/furniture-categories`)
      .then(response => response.json())
      .then(data => {
        if (data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(error => console.error('Error fetching categories:', error));
  }, []);

  useEffect(() => {
    // Fetch furniture items when category changes
    if (selectedCategory) {
      fetch(`${API_URL}/api/furniture-items/${encodeURIComponent(selectedCategory)}`)
        .then(response => response.json())
        .then(data => {
          if (data.items) {
            setFurnitureItems(data.items);
          }
        })
        .catch(error => console.error('Error fetching furniture items:', error));
    }
  }, [selectedCategory]);

  const handleDragStart = (e: React.DragEvent, item: {
    name: string;
    width: number;
    height: number;
  }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const droppedFurniture = JSON.parse(e.dataTransfer.getData('text/plain'));
    const newFurniture = {
      id: Date.now().toString(),
      ...droppedFurniture,
      x,
      y,
    };

    setFurniture(prevFurniture => [...prevFurniture, newFurniture]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFurnitureClick = (id: string) => {
    setSelectedFurniture(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedFurniture && (e.key === 'Delete' || e.key === 'Backspace')) {
      setFurniture(furniture.filter(item => item.id !== selectedFurniture));
      setSelectedFurniture(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as any);
    return () => {
      window.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [selectedFurniture]);

  return (
    <PageContainer>
      <BackButton />
      <Title>📐 Plan Your Room</Title>
      
      <ContentContainer>
        <Sidebar>
          <FormGroup>
            <Label>Room Width (cm)</Label>
            <Input
              type="number"
              value={roomWidth}
              onChange={(e) => setRoomWidth(Number(e.target.value))}
              min="100"
              max="1000"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Room Height (cm)</Label>
            <Input
              type="number"
              value={roomHeight}
              onChange={(e) => setRoomHeight(Number(e.target.value))}
              min="100"
              max="1000"
            />
          </FormGroup>

          <Button onClick={() => setFurniture([])}>Clear Room</Button>
          <SaveButton>Save Room Plan</SaveButton>

          <FurnitureList>
            <h3>Furniture Items</h3>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </Select>

            {furnitureItems.map((item, index) => (
              <FurnitureItem
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
              >
                <FurnitureName>{item.name}</FurnitureName>
                <FurnitureDetails>
                  {item.width}cm × {item.height}cm × {item.depth}cm
                </FurnitureDetails>
                <FurnitureDescription>{item.description}</FurnitureDescription>
              </FurnitureItem>
            ))}
          </FurnitureList>
        </Sidebar>

        <RoomCanvas
          ref={canvasRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ width: roomWidth, height: roomHeight }}
        >
          <CanvasGrid />
          {furniture.map((item) => (
            <FurniturePreview
              key={item.id}
              width={item.width}
              height={item.height}
              style={{
                left: item.x,
                top: item.y,
                backgroundColor: selectedFurniture === item.id ? 'rgba(0, 123, 255, 0.4)' : 'rgba(0, 123, 255, 0.2)',
              }}
              onClick={() => handleFurnitureClick(item.id)}
            />
          ))}
        </RoomCanvas>
      </ContentContainer>
    </PageContainer>
  );
};

export default PlanRoomPage; 