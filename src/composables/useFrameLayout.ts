import type { Photo } from '@/types';

export type FrameTemplateType = 'grid' | 'masonry' | 'collage' | 'timeline' | 'gallery' | 'magazine';

export function useFrameLayout(template: FrameTemplateType) {
  const getLayout = (photos: Photo[]) => {
    switch (template) {
      case 'grid':
        return calculateGridLayout(photos);
      case 'masonry':
        return calculateMasonryLayout(photos);
      case 'collage':
        return calculateCollageLayout(photos);
      case 'timeline':
        return calculateTimelineLayout(photos);
      case 'gallery':
        return calculateGalleryLayout(photos);
      case 'magazine':
        return calculateMagazineLayout(photos);
      default:
        return calculateGridLayout(photos);
    }
  };

  const calculateGridLayout = (photos: Photo[]) => {
    const cols = 3;
    
    return photos.map((photo, index) => ({
      photo,
      style: {
        gridColumn: (index % cols) + 1,
        gridRow: Math.floor(index / cols) + 1,
      },
    }));
  };

  const calculateMasonryLayout = (photos: Photo[]) => {
    const columns = 3;
    const columnHeights = new Array(columns).fill(0);
    
    return photos.map((photo) => {
      const colIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      columnHeights[colIndex] += photo.aspectRatio > 1 ? 150 : 200;
      
      return {
        photo,
        style: {
          gridColumn: colIndex + 1,
          transform: `scale(${photo.aspectRatio > 1 ? 1 : 0.9})`,
        },
      };
    });
  };

  const calculateCollageLayout = (photos: Photo[]) => {
    const items: Array<{
      photo: Photo;
      style: { left: string; top: string; width: string; height: string };
    }> = [];

    let currentX = 0;
    let currentY = 0;

    photos.forEach((photo) => {
      const width = '48%';
      const height = '48%';
      
      items.push({
        photo,
        style: {
          left: `${currentX}%`,
          top: `${currentY}%`,
          width,
          height,
        },
      });

      currentX += 50;
      if (currentX >= 50) {
        currentX = 0;
        currentY += 50;
      }
    });

    return items;
  };

  const calculateTimelineLayout = (photos: Photo[]) => {
    const sorted = [...photos].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    return sorted.map((photo, index) => ({
      photo,
      style: {
        gridColumn: String((index % 3) + 1),
        gridRow: String(Math.floor(index / 3) + 1),
      },
    }));
  };

  const calculateGalleryLayout = (photos: Photo[]) => {
    if (photos.length === 0) return [];
    
    const [mainPhoto, ...rest] = photos;
    
    return [
      {
        photo: mainPhoto,
        style: {
          gridColumn: '1 / -1',
          gridRow: '1 / -1',
        },
      },
      ...rest.map((photo, index) => ({
        photo,
        style: {
          gridColumn: (index % 3) + 1,
          gridRow: Math.floor(index / 3) + 1,
        },
      })),
    ];
  };

  const calculateMagazineLayout = (photos: Photo[]) => {
    const items: Array<{
      photo: Photo;
      style: { gridColumn?: string; gridRow?: string; width?: string; height?: string };
    }> = [];

    photos.forEach((photo, index) => {
      if (index === 0) {
        items.push({
          photo,
          style: { gridColumn: '1 / 3', gridRow: '1 / 3' },
        });
      } else if (index === 1) {
        items.push({
          photo,
          style: { gridColumn: '3', gridRow: '1' },
        });
      } else {
        const col = String((index % 2) + 2);
        const row = String(Math.floor((index - 2) / 2) + 2);
        items.push({
          photo,
          style: { gridColumn: col, gridRow: row },
        });
      }
    });

    return items;
  };

  return {
    getLayout,
  };
}
