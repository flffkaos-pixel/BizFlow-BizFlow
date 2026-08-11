# Oracle Cloud 무료 서버 재설정 + BizFlow 배포 가이드

BizFlow CRM 웹 서비스(server.js + public/)를 Oracle Cloud Always Free 인스턴스에 올리는 가이드.
Node.js 웹 서비스 하나만 올리므로 docker-compose 하나면 충분하다.

## 1. 인스턴스 생성 (Oracle Cloud Console)

1. https://cloud.oracle.com 접속 → Compute → Instances → **Create instance**
2. 이름: `bizflow` (원하는 대로)
3. **Image**: Ubuntu 22.04 (Minimal 아님)
4. **Shape**: `VM.Standard.A1.Flex` (ARM) 또는 `VM.Standard.E2.1.Micro` (AMD 무료)
   - ARM: OCPU 4 / RAM 24GB까지 항상 무료
5. **SSH keys**: 새 키 쌍 생성 → **Save Private Key** (.pem) 받기
6. **Boot volume**: 기본 (50GB Always Free)
7. **Create** 클릭 → 대기 → **Public IP** 기록

> 주의: ARM 인스턴스는 항상 무료지만 신규 계정에서는 할당량 초과로 실패할 수 있음.
> 그 경우 E2.1.Micro(AMD 1코어/1GB)로 생성하면 무료. 1GB RAM으로도 이 Node 앱은 충분히 동작.

## 2. 보안 목록(방화벽) 열기

OCI 콘솔 → 인스턴스 → VNIC → **Subnet** → Security List → Add Ingress Rule:

| 방향 | 소스 | 프로토콜/포트 | 용도 |
|------|------|---------------|------|
| Ingress | 0.0.0.0/0 | TCP 22 | SSH |
| Ingress | 0.0.0.0/0 | TCP 8787 | BizFlow 앱 |
| Ingress | 0.0.0.0/0 | TCP 80 | (선택) 리버스 프록시 |

> 8787 포트를 바로 열면 `http://<IP>:8787`로 접속된다.
> 도메인+HTTPS가 필요하면 Cloudflare Tunnel 또는 nginx + Let's Encrypt 사용.

## 3. SSH 접속

Windows PowerShell에서 (.pem 경로로 교체):

```powershell
ssh -i C:\경로\bizflow-key.pem ubuntu@<SERVER_IP>
```

> Ubuntu 이미지는 사용자가 `ubuntu`, Oracle Linux는 `opc`. ssh 권한 문제 시:
> `chmod 400` 필요 (Git Bash) 또는 `icacls`로 권한 제한.

## 4. 서버 초기 설정

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
# 재접속해야 docker 권한 적용
exit
```

## 5. 저장소 클론 + master 브랜치 체크아웃

```bash
cd /opt
sudo git clone https://github.com/사용자명/bizflow-crm-i18n.git bizflow
sudo chown -R ubuntu:ubuntu /opt/bizflow
cd /opt/bizflow
git checkout master
```

> BizFlow 앱(server.js + public/)은 **master** 브랜치에 있다. main에는 랜딩 페이지가 있다.

## 6. 빌드 + 실행

```bash
cd /opt/bizflow
docker compose up -d --build
docker compose ps        # 상태 확인
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787   # 200 확인
```

## 7. 접속 확인

- 브라우저에서 `http://<SERVER_IP>:8787`
- 로그인: 데모 계정 `demo@bizflow.dev` / `demo1234`
  (배포 후 시딩이 필요하면 브라우저에서 앱 로그인 후 자동화 탭에서 "카페 데모 시작" 클릭)

## 8. 부팅 시 자동 시작

`restart: unless-stopped` 가 적용되어 있어 재부팅 시 docker가 자동으로 컨테이너를 살린다.
단, docker 데몬이 먼저 떠야 하므로 Docker 서비스는 이미 4번에서 enable 했다.

## 9. 도메인/HTTPS (선택)

도메인을 갖고 있으면 nginx 리버스 프록시 + Let's Encrypt 권장:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
# /etc/nginx/sites-available/bizflow  에 server_name 도메인 + proxy_pass http://127.0.0.1:8787
sudo certbot --nginx -d yourdomain.com
```

## 10. 업데이트 (소스 변경 시)

```bash
cd /opt/bizflow
git checkout master && git pull origin master
docker compose up -d --build
```
