import { FormEvent, useEffect, useState } from 'react';
import { buildTimezoneOptions, detectLocalTimezone } from '../utils/timezones';
import { PageContainer } from '../components/PageContainer';
import { useProfileQuery, useUpdateProfileMutation } from '../queries/profile';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function SettingsPage() {
  const { data: profile, isLoading: loading } = useProfileQuery();
  const updateMutation = useUpdateProfileMutation();

  const [discordRoom, setDiscordRoom] = useState('');
  const [discordAlarm, setDiscordAlarm] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // 서버에서 프로필을 처음 받아온 시점(혹은 갱신된 시점)에 폼의 로컬 편집 state로 복사
  useEffect(() => {
    if (!profile) return;
    setDiscordRoom(profile.discordRoom ?? '');
    setDiscordAlarm(profile.discordAlarm);
    setTimezone(profile.timezone);
  }, [profile]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSavedMessage(null);
    updateMutation.mutate(
      {
        discordRoom: discordRoom.trim() === '' ? null : discordRoom.trim(),
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
          setDiscordRoom('');
          setDiscordAlarm(false);
          setSavedMessage('웹훅을 제거했습니다.');
        },
      },
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <p>불러오는 중...</p>
      </PageContainer>
    );
  }

  const inputClass = 'flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
  const hintClass = 'text-xs font-normal text-gray-400';
  const saving = updateMutation.isPending;

  return (
    <PageContainer>
      <h1 className="mb-4 text-2xl font-bold">설정</h1>

      {profile && <p className="-mt-2 mb-5 text-xs text-gray-500">{profile.email}</p>}

      <form onSubmit={handleSave} className="flex w-full flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-700">
          디스코드 웹훅 URL
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={discordRoom}
              onChange={(e) => setDiscordRoom(e.target.value)}
              className={inputClass}
            />
            {profile?.discordRoom && (
              <button
                type="button"
                onClick={handleRemoveWebhook}
                disabled={saving}
                className="whitespace-nowrap border border-gray-300 bg-transparent px-2"
              >
                제거
              </button>
            )}
          </div>
          <span className={hintClass}>
            디스코드 채널 설정 → 연동 → 웹후크 만들기에서 URL을 복사해 붙여넣으세요.
          </span>
        </label>

        <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={discordAlarm}
            onChange={(e) => setDiscordAlarm(e.target.checked)}
          />
          디스코드 알림 받기
          <span className={`basis-full ${hintClass}`}>
            웹훅을 등록해뒀어도 이게 꺼져있으면 알림이 안 갑니다.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-700">
          타임존
          <div className="flex gap-2">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              {buildTimezoneOptions(profile?.timezone).map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setTimezone(detectLocalTimezone())}
              className="whitespace-nowrap border border-gray-300 bg-transparent px-2"
            >
              내 기기 시간대로
            </button>
          </div>
          <span className={hintClass}>할 일 마감/알림 시각을 이 타임존 기준으로 계산합니다.</span>
        </label>

        {updateMutation.isError && (
          <p className="m-0 text-sm text-red-600">
            {extractErrorMessage(updateMutation.error, '저장에 실패했습니다.')}
          </p>
        )}
        {savedMessage && <p className="m-0 text-xs text-emerald-600">{savedMessage}</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white disabled:cursor-default disabled:opacity-60"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </PageContainer>
  );
}
