# 프론트엔드 개발 서버(vite)를 세션과 무관하게 계속 띄워두고,
# 크래시가 나면 자동으로 재시작하는 감시 스크립트.
$ErrorActionPreference = 'Continue'
chcp 65001 | Out-Null
$root = 'C:\Users\lsh34\Web\pople\animalCommunity\frontend'
$log = 'C:\Users\lsh34\Web\pople\animalCommunity\.claude\logs\frontend.log'

Set-Location $root

while ($true) {
    "`n----- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') 프론트엔드 시작 -----" | Out-File -FilePath $log -Append -Encoding utf8
    npm run dev *>> $log
    "`n----- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') 프론트엔드 종료됨 (2초 후 재시작) -----" | Out-File -FilePath $log -Append -Encoding utf8
    Start-Sleep -Seconds 2
}
