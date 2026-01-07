import { NextRequest } from 'next/server';
import { getProgress, addProgressListener } from '@/lib/generation-progress';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'advice' | 'virtual-evidence' || 'virtual-evidence';

  // SSE 스트림 생성
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 현재 상태 즉시 전송
      const currentProgress = getProgress(type);
      const data = `data: ${JSON.stringify(currentProgress)}\n\n`;
      controller.enqueue(encoder.encode(data));

      // 진행 상태 변경 리스너 등록
      const unsubscribe = addProgressListener(type, (progress) => {
        try {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          // 연결이 끊어진 경우
          unsubscribe();
        }
      });

      // 연결 종료 시 리스너 제거
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
