# ============================================================
# Oracle Cloud Free Tier 설정 가이드
# 항상 무료 (Always Free) 인스턴스 하나로 24시간 상시 서비스 운영
# ============================================================

## 1. Oracle Cloud 무료 서버 만들기

1. https://www.oracle.com/cloud/free/ 에서 계정 생성 (신용카드 인증 1회, 결제 안 됨)
2. **Create a VM instance** 클릭
3. 이미지: **Ubuntu 22.04** (arm64 권장)
4. Shape: **VM.Standard.A1.Flex** — ARM 4코어 / 24GB RAM (항상 무료)
5. SSH 키 생성/업로드
6. 생성 완료 후 공인 IP 확인

> 무료 한도 (Always Free):
> - AMD: VM.Standard.E2.1.Micro 1대 (1코어 1GB)
> - ARM: 총 4 OCPU / 24GB RAM (원하는 만큼 분할)
> - ARM 인스턴스는 신규 계정에서 할당량 초과 시도가 필요할 수 있음

## 2. 방화벽 (보안 목록) 열기

OCI 콘솔 → 인스턴스 → VCN → Security List → Ingress Rules:

| 프로토콜 | 포트 | 용도 |
|----------|------|------|
| TCP | 22 | SSH |
| TCP | 80 | HTTP |
| TCP | 443 | HTTPS |
| TCP | 5678 | n8n (선택) |

> 443은 Cloudflare Tunnel을 쓰면 안 열어도 됨 (아래 4번)

## 3. 인스턴스 초기 설정 (SSH 접속 후)

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

## 4. Cloudflare Tunnel (무료 HTTPS 도메인)

상시 서버에서 SSL/도메인을 무료로 받는 방법.

1. Cloudflare 가입 → 도메인 네임서버 연결 (무료)
2. Zero Trust → Networks → Tunnels → Create
3. 토큰 생성 후 서버에서 실행:

```bash
# cloudflared 설치
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# 터널 시작 (토큰 교체)
cloudflared service install <TUNNEL_TOKEN>
```

## 5. 클론 + 자동 시작

```bash
cd /opt
sudo git clone https://github.com/사용자명/compwatch-auto.git
cd compwatch-auto/oracle
sudo cp .env.example .env   # 환경변수 입력
sudo docker compose up -d
```

## 6. 부팅 시 자동 재시작

```yaml
# 모든 서비스에 이미 restart: unless-stopped 가 적용됨
# 추가로 cron 등록 (옵션)
sudo crontab -e
# 매일 새벽 4시 모든 서비스 재시작 + 업데이트
# 0 4 * * * cd /opt/compwatch-auto/oracle && docker compose pull && docker compose up -d
```
