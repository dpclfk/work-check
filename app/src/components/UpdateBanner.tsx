import { Linking, Text, TouchableOpacity, View } from 'react-native';

interface UpdateBannerProps {
  latestVersion: string;
  releaseUrl: string;
  onDismiss: () => void;
}

/** 새 APK 릴리즈가 나왔을 때 Gnb 위에 뜨는 배너. 눌러서 깃허브 릴리즈 페이지를
 * 열면(APK는 Play스토어 밖 배포라 수동 다운로드+설치 필요) 거기서 받으면 됨 */
export function UpdateBanner({ latestVersion, releaseUrl, onDismiss }: UpdateBannerProps) {
  return (
    <View className="flex-row items-center justify-between bg-indigo-700 px-4 py-2">
      <Text className="flex-1 text-[13px] text-white">새 버전 {latestVersion}이 나왔어요</Text>
      <TouchableOpacity onPress={() => Linking.openURL(releaseUrl)} className="ml-2 px-1 py-1">
        <Text className="text-[13px] font-semibold text-white underline">다운로드</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} className="ml-3 px-1 py-1">
        <Text className="text-[15px] text-white">✕</Text>
      </TouchableOpacity>
    </View>
  );
}
