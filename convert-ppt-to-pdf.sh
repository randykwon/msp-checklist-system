#!/bin/bash

# PowerPoint 파일을 PDF로 변환하는 스크립트
# 사용법: ./convert-ppt-to-pdf.sh [파일명.pptx]
# 파일명을 지정하지 않으면 모든 .pptx 파일을 변환합니다.

echo "🔄 PowerPoint to PDF Converter"
echo "================================"

# 작업 디렉토리 (스크립트가 실행되는 위치)
WORK_DIR=$(pwd)

# 인자로 파일명이 주어진 경우
if [ $# -eq 1 ]; then
  FILES=("$1")
  echo "📄 Single file mode: $1"
else
  # 모든 .pptx 파일 찾기
  FILES=($(ls *.pptx 2>/dev/null))

  if [ ${#FILES[@]} -eq 0 ]; then
    echo "❌ No .pptx files found in current directory"
    exit 1
  fi

  echo "📄 Processing ${#FILES[@]} file(s)"
fi

# LibreOffice 확인 (macOS)
LIBREOFFICE=""
if [ -d "/Applications/LibreOffice.app" ]; then
  LIBREOFFICE="/Applications/LibreOffice.app/Contents/MacOS/soffice"
  echo "✅ Using LibreOffice for conversion"
elif command -v soffice &> /dev/null; then
  LIBREOFFICE="soffice"
  echo "✅ Using LibreOffice (system)"
else
  echo "⚠️  LibreOffice not found, using AppleScript with PowerPoint"
  LIBREOFFICE=""
fi

echo ""

for FILE in "${FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    continue
  fi

  echo "📄 Converting: $FILE"

  # 출력 파일명
  OUTPUT_FILE="${FILE%.pptx}.pdf"
  OUTPUT_FILE="${OUTPUT_FILE%.ppt}.pdf"

  # LibreOffice를 사용한 변환 (권장)
  if [ -n "$LIBREOFFICE" ]; then
    "$LIBREOFFICE" --headless --convert-to pdf --outdir "$WORK_DIR" "$FILE" 2>&1

    if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
      echo "✅ Created: $OUTPUT_FILE ($(ls -lh "$OUTPUT_FILE" | awk '{print $5}'))"
    else
      echo "❌ Failed to convert: $FILE"
    fi

  # AppleScript를 사용한 변환 (PowerPoint 필요)
  else
    osascript <<EOF 2>&1
      try
        tell application "Microsoft PowerPoint"
          set thePresentation to open POSIX file "$WORK_DIR/$FILE"
          save thePresentation in POSIX file "$WORK_DIR/$OUTPUT_FILE" as save as PDF
          close thePresentation saving no
        end tell
        return "success"
      on error errMsg
        return "error: " & errMsg
      end try
EOF

    if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
      echo "✅ Created: $OUTPUT_FILE ($(ls -lh "$OUTPUT_FILE" | awk '{print $5}'))"
    else
      echo "❌ Failed to convert: $FILE"
      echo "💡 Try installing LibreOffice: brew install --cask libreoffice"
    fi
  fi

  echo ""
done

echo "================================"
echo "🎉 Conversion completed!"

# PDF 파일 목록 표시
if ls *.pdf 1> /dev/null 2>&1; then
  echo ""
  echo "📋 PDF files in current directory:"
  ls -lh *.pdf | awk '{print "   " $9 " (" $5 ")"}'
fi
