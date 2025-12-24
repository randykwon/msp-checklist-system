#!/usr/bin/env node

// 간단한 테스트 서버 (포트 3010, 3011)

const http = require('http');

// 메인 서버 (포트 3010)
const mainServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MSP Checklist - 메인 서버</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>🚀 MSP Checklist 메인 서버</h1>
            <p>포트 3010에서 실행 중입니다.</p>
            <p>현재 시간: ${new Date().toLocaleString('ko-KR')}</p>
            <p><a href="/admin">관리자 페이지로 이동</a></p>
            <hr>
            <p>Nginx 프록시 테스트 성공!</p>
        </body>
        </html>
    `);
});

// 관리자 서버 (포트 3011)
const adminServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MSP Checklist - 관리자 시스템</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>🔧 MSP Checklist 관리자 시스템</h1>
            <p>포트 3011에서 실행 중입니다.</p>
            <p>현재 시간: ${new Date().toLocaleString('ko-KR')}</p>
            <p><a href="/">메인 페이지로 이동</a></p>
            <hr>
            <p>Nginx 프록시 테스트 성공!</p>
        </body>
        </html>
    `);
});

// 서버 시작
mainServer.listen(3010, '0.0.0.0', () => {
    console.log('✅ 메인 서버가 포트 3010에서 시작되었습니다.');
});

adminServer.listen(3011, '0.0.0.0', () => {
    console.log('✅ 관리자 서버가 포트 3011에서 시작되었습니다.');
});

// 종료 처리
process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    mainServer.close();
    adminServer.close();
    process.exit(0);
});

console.log('MSP Checklist 테스트 서버 시작됨');
console.log('- 메인 서버: http://localhost:3010');
console.log('- 관리자 서버: http://localhost:3011');
console.log('종료하려면 Ctrl+C를 누르세요.');