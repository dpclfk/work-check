import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { buildTimezoneOptions, detectLocalTimezone } from '../utils/timezones';
import { useProfileQuery, useUpdateProfileMutation } from '../queries/profile';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function SettingsScreen() {
  const { data: profile, isLoading: loading } = useProfileQuery();
  const updateMutation = useUpdateProfileMutation();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [discordAlarm, setDiscordAlarm] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [showTimezoneList, setShowTimezoneList] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // 서버에서 프로필을 처음 받아온 시점(혹은 갱신된 시점)에 폼의 로컬 편집 state로 복사
  useEffect(() => {
    if (!profile) return;
    setWebhookUrl(profile.discordRoom ?? '');
    setDiscordAlarm(profile.discordAlarm);
    setTimezone(profile.timezone);
  }, [profile]);

  const handleSave = () => {
    setSavedMessage(null);
    updateMutation.mutate(
      {
        discordRoom: webhookUrl.trim() === '' ? null : webhookUrl.trim(),
        discordAlarm,
        timezone,
      },
      { onSuccess: () => setSavedMessage('저장했습니다.') },
    );
  };

  const handleRemoveWebhook = () => {
    setSavedMessage(null);
    updateMutation.mutate(
      { discordRoom: null, discordAlarm: false },
      {
        onSuccess: () => {
          setWebhookUrl('');
          setDiscordAlarm(false);
          setSavedMessage('웹훅을 제거했습니다.');
        },
      },
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f5f6f8]">
        <Text className="p-4 text-[#6b7280]">불러오는 중...</Text>
      </View>
    );
  }

  const saving = updateMutation.isPending;

  return (
    <View className="flex-1 bg-[#f5f6f8]">
      <ScrollView contentContainerClassName="p-4 pb-10">
        <Text className="mb-2 text-xl font-bold">설정</Text>

        {profile && <Text className="mb-3 text-[13px] text-[#6b7280]">{profile.email}</Text>}

        <Text className="mb-1.5 mt-4 text-[13px] font-semibold text-[#374151]">디스코드 웹훅 URL</Text>
        <TextInput
          className="rounded-lg border border-[#e5e7eb] bg-white p-3 text-sm"
          placeholder="https://discord.com/api/webhooks/..."
          autoCapitalize="none"
          autoCorrect={false}
          value={webhookUrl}
          onChangeText={setWebhookUrl}
        />
        {profile?.discordRoom && (
          <TouchableOpacity onPress={handleRemoveWebhook} disabled={saving}>
            <Text className="mt-1.5 text-[13px] text-red-600">웹훅 제거</Text>
          </TouchableOpacity>
        )}
        <Text className="mt-1 text-xs text-[#9ca3af]">
          디스코드 채널 설정 → 연동 → 웹후크 만들기에서 URL을 복사해 붙여넣으세요.
        </Text>

        <TouchableOpacity
          className="mt-3 flex-row items-center gap-2"
          onPress={() => setDiscordAlarm(!discordAlarm)}
        >
          <View
            className={`h-[18px] w-[18px] rounded border ${
              discordAlarm ? 'border-indigo-700 bg-indigo-700' : 'border-[#d1d5db] bg-white'
            }`}
          />
          <Text className="text-[13px] font-semibold text-[#374151]">디스코드 알림 받기</Text>
        </TouchableOpacity>
        <Text className="mt-1 text-xs text-[#9ca3af]">
          웹훅을 등록해뒀어도 이게 꺼져있으면 알림이 안 갑니다.
        </Text>

        <Text className="mb-1.5 mt-4 text-[13px] font-semibold text-[#374151]">타임존</Text>
        <TouchableOpacity
          className="rounded-lg border border-[#e5e7eb] bg-white p-3"
          onPress={() => setShowTimezoneList(!showTimezoneList)}
        >
          <Text>{timezone}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTimezone(detectLocalTimezone())}>
          <Text className="mt-1.5 text-[13px] text-indigo-700">내 기기 시간대로 설정</Text>
        </TouchableOpacity>

        {showTimezoneList && (
          <View className="mt-2 rounded-lg border border-[#e5e7eb] bg-white">
            {buildTimezoneOptions(profile?.timezone).map((tz) => (
              <TouchableOpacity
                key={tz.value}
                className="border-b border-[#f3f4f6] px-3 py-2.5"
                onPress={() => {
                  setTimezone(tz.value);
                  setShowTimezoneList(false);
                }}
              >
                <Text className={tz.value === timezone ? 'font-bold text-indigo-700' : undefined}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text className="mt-1 text-xs text-[#9ca3af]">할 일 마감/알림 시각을 이 타임존 기준으로 계산합니다.</Text>

        {updateMutation.isError && (
          <Text className="mt-3 text-[13px] text-red-600">
            {extractErrorMessage(updateMutation.error, '저장에 실패했습니다.')}
          </Text>
        )}
        {savedMessage && <Text className="mt-3 text-[13px] text-emerald-600">{savedMessage}</Text>}

        <TouchableOpacity
          className="mt-5 items-center rounded-lg bg-indigo-700 p-3.5"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-base font-semibold text-white">{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
