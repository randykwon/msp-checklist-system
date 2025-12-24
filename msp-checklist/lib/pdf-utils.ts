// PDF 텍스트 추출 유틸리티 (클라이언트 사이드)

export async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    // 동적으로 pdfjs-dist 로드
    const pdfjsLib = await import('pdfjs-dist');
    
    // Worker 설정 - 설치된 버전과 일치하는 워커 사용
    if (typeof window !== 'undefined') {
      // 로컬 워커 파일 사용 (더 안정적)
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch (e) {
        // 폴백: CDN 사용
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
      }
    }
    
    // Base64를 Uint8Array로 변환
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // PDF 로드
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    let fullText = '';
    
    // 모든 페이지에서 텍스트 추출
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    // 텍스트 정리
    return fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
      
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return '';
  }
}

// PDF 파일인지 확인하는 유틸리티 함수
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

// 파일 크기를 읽기 쉬운 형태로 변환
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}