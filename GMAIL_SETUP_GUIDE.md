# Gmail 이메일 인증 설정 가이드

## 1. Gmail 2단계 인증 활성화

1. [Google 계정 설정](https://myaccount.google.com/)에 접속
2. "보안" 탭 클릭
3. "2단계 인증" 활성화

## 2. 앱 비밀번호 생성

1. [앱 비밀번호 페이지](https://myaccount.google.com/apppasswords)로 이동
2. "앱 선택" 드롭다운에서 "기타(맞춤 이름)" 선택
3. 앱 이름을 "mini area"로 입력
4. "생성" 버튼 클릭
5. 생성된 16자리 앱 비밀번호를 복사 (예: `abcd efgh ijkl mnop`)

## 3. 환경변수 설정

`.env` 파일에 다음 설정을 추가하세요:

```env
# Gmail 이메일 설정
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password

# Postfix 비활성화
USE_POSTFIX=false
```

## 4. 서버 재시작

```bash
npm run server
```

## 5. 테스트

1. 브라우저에서 `https://localhost:5173` 접속
2. 회원가입 진행
3. Gmail에서 인증 이메일 확인
4. 인증 링크 클릭하여 계정 활성화
5. 로그인 테스트

## 주의사항

- 앱 비밀번호는 안전하게 보관하세요
- `.env` 파일을 Git에 커밋하지 마세요
- Gmail 계정의 보안 설정을 정기적으로 확인하세요

## 문제 해결

### 이메일이 전송되지 않는 경우
1. Gmail 2단계 인증이 활성화되어 있는지 확인
2. 앱 비밀번호가 정확한지 확인
3. Gmail 계정의 보안 설정 확인

### 인증 링크가 작동하지 않는 경우
1. 서버가 실행 중인지 확인
2. 포트 7000이 열려있는지 확인
3. HTTPS 인증서가 유효한지 확인
