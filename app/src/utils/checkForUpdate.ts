import Constants from 'expo-constants';

const REPO = 'dpclfk/work-check';

export interface UpdateInfo {
  available: boolean;
  latestVersion?: string;
  releaseUrl?: string;
}

/** 깃허브 릴리즈 중 "app-v*" 태그(APK 릴리즈 — .github/workflows/deploy.yml의
 * build_apk job 참고)를 찾아서 지금 설치된 앱 버전(app.json의 expo.version,
 * expo-constants로 읽음)과 비교. 더 높은 버전이 있으면 알림 대상으로 반환.
 * 네트워크 실패 등은 조용히 무시(업데이트 체크가 앱 사용을 막아선 안 됨) */
export async function checkForAppUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases`);
    if (!res.ok) return { available: false };

    const releases: { tag_name: string; html_url: string }[] = await res.json();
    const appRelease = releases.find((r) => r.tag_name.startsWith('app-v'));
    if (!appRelease) return { available: false };

    const latestVersion = appRelease.tag_name.replace(/^app-v/, '');
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

    if (isNewerVersion(latestVersion, currentVersion)) {
      return { available: true, latestVersion, releaseUrl: appRelease.html_url };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

/** 단순 semver(x.y.z) 비교 — 둘 다 이 형식이라고 가정(app.json의 version 관례) */
function isNewerVersion(remote: string, current: string): boolean {
  const a = remote.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}
