# MSP 어드바이저 - 시스템 요구사항

## 📋 목차

1. [하드웨어 요구사항](#하드웨어-요구사항)
2. [소프트웨어 요구사항](#소프트웨어-요구사항)
3. [네트워크 요구사항](#네트워크-요구사항)
4. [AWS 서비스 요구사항](#aws-서비스-요구사항)
5. [권장 EC2 인스턴스](#권장-ec2-인스턴스)

---

## 하드웨어 요구사항

### 최소 사양
| 항목 | 사양 |
|------|------|
| CPU | 1 vCPU |
| 메모리 | 2GB RAM |
| 디스크 | 10GB SSD |

### 권장 사양
| 항목 | 사양 |
|------|------|
| CPU | 2 vCPU 이상 |
| 메모리 | 4GB RAM 이상 |
| 디스크 | 20GB SSD 이상 |

### 대규모 운영 (100+ 동시 사용자)
| 항목 | 사양 |
|------|------|
| CPU | 4 vCPU 이상 |
| 메모리 | 8GB RAM 이상 |
| 디스크 | 50GB SSD 이상 |

---

## 소프트웨어 요구사항

### 운영체제
| OS | 버전 | 지원 상태 |
|----|------|----------|
| Amazon Linux | 2023 | ✅ 권장 |
| Amazon Linux | 2 | ✅ 지원 |
| Ubuntu | 22.04 LTS | ✅ 지원 |
| Ubuntu | 20.04 LTS | ✅ 지원 |
| macOS | 12+ (Monterey) | ✅ 개발용 |
| Windows | WSL2 | ⚠️ 제한적 지원 |

### 런타임 환경
| 소프트웨어 | 버전 | 비고 |
|-----------|------|------|
| Node.js | 20.x | nvm으로 자동 설치 |
| npm | 10.x | Node.js와 함께 설치 |
| Git | 2.x+ | 소스 코드 관리 |

### 선택적 소프트웨어
| 소프트웨어 | 버전 | 용도 |
|-----------|------|------|
| Nginx | 1.24+ | 리버스 프록시, SSL |
| PM2 | 5.x | 프로세스 관리 (자동 설치) |
| Certbot | 최신 | SSL 인증서 (Let's Encrypt) |

---

## 네트워크 요구사항

### 필수 포트
| 포트 | 프로토콜 | 용도 | 접근 범위 |
|------|---------|------|----------|
| 3010 | TCP | 메인 앱 | 사용자 |
| 3011 | TCP | Admin 앱 | 관리자만 |
| 22 | TCP | SSH | 관리자만 |

### Nginx 사용 시
| 포트 | 프로토콜 | 용도 |
|------|---------|------|
| 80 | TCP | HTTP (HTTPS 리다이렉트) |
| 443 | TCP | HTTPS |

### 아웃바운드 연결
| 대상 | 포트 | 용도 |
|------|------|------|
| AWS Bedrock | 443 | LLM API |
| api.openai.com | 443 | OpenAI API (선택) |
| generativelanguage.googleapis.com | 443 | Gemini API (선택) |
| api.anthropic.com | 443 | Claude API (선택) |
| github.com | 443 | 소스 코드 다운로드 |
| registry.npmjs.org | 443 | npm 패키지 |

---

## AWS 서비스 요구사항

### 필수 서비스
| 서비스 | 용도 | 비용 |
|--------|------|------|
| EC2 | 애플리케이션 호스팅 | 인스턴스 비용 |
| Bedrock | LLM API (Claude) | 사용량 기반 |

### 선택적 서비스
| 서비스 | 용도 | 비용 |
|--------|------|------|
| Route 53 | 도메인 관리 | 호스팅 존 + 쿼리 |
| ACM | SSL 인증서 | 무료 |
| CloudWatch | 모니터링 | 로그/메트릭 |
| S3 | 백업 저장소 | 스토리지 |

### IAM 권한 (Bedrock 사용 시)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:ListInferenceProfiles",
        "bedrock:CreateInferenceProfile"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 권장 EC2 인스턴스

### 개발/테스트 환경
| 인스턴스 | vCPU | 메모리 | 월 비용 (서울) |
|---------|------|--------|---------------|
| t3.small | 2 | 2GB | ~$15 |
| t3.medium | 2 | 4GB | ~$30 |

### 프로덕션 환경
| 인스턴스 | vCPU | 메모리 | 월 비용 (서울) |
|---------|------|--------|---------------|
| t3.medium | 2 | 4GB | ~$30 |
| t3.large | 2 | 8GB | ~$60 |
| m6i.large | 2 | 8GB | ~$70 |

### 대규모 운영
| 인스턴스 | vCPU | 메모리 | 월 비용 (서울) |
|---------|------|--------|---------------|
| m6i.xlarge | 4 | 16GB | ~$140 |
| m6i.2xlarge | 8 | 32GB | ~$280 |

### 비용 절감 팁
- **Savings Plans**: 1년/3년 약정으로 최대 72% 절감
- **Spot Instances**: 개발/테스트 환경에서 최대 90% 절감
- **Reserved Instances**: 프로덕션 환경에서 최대 75% 절감

---

## 데이터베이스

### SQLite (기본)
- 별도 설치 불필요
- 파일 기반 데이터베이스
- 소규모~중규모 운영에 적합

### 데이터베이스 파일
| 파일 | 용도 | 위치 |
|------|------|------|
| msp-assessment.db | 사용자/평가 데이터 | msp-checklist/ |
| advice-cache.db | 조언 캐시 | msp-checklist/ |
| virtual-evidence-cache.db | 가상증빙 캐시 | msp-checklist/ |

### 백업 권장
```bash
# 수동 백업
cp msp-checklist/*.db /backup/

# 자동 백업 (cron)
0 2 * * * cp /opt/msp-advisor/msp-checklist/*.db /backup/$(date +\%Y\%m\%d)/
```

---

## 성능 최적화

### Node.js 메모리 설정
```bash
# 메모리 제한 증가 (4GB)
export NODE_OPTIONS="--max-old-space-size=4096"
```

### PM2 클러스터 모드
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'msp-main',
    script: 'npm',
    args: 'start',
    instances: 'max',  // CPU 코어 수만큼
    exec_mode: 'cluster'
  }]
};
```

### Nginx 캐싱
```nginx
# 정적 파일 캐싱
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
