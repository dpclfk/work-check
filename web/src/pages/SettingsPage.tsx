import { FormEvent, useEffect, useState } from 'react';
import { authApi, UserProfile } from '../api/auth';
import { buildTimezoneOptions, detectLocalTimezone } from '../utils/timezones';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [discordRoom, setDiscordRoom] = useState('');
  const [discordAlarm, setDiscordAlarm] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .getMe()
      .then((data) => {
        setProfile(data);
        setDiscordRoom(data.discordRoom ?? '');
        setDiscordAlarm(data.discordAlarm);
        setTimezone(data.timezone);
      })
      .catch((err) => setError(extractErrorMessage(err, '설정을 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);
    setSaving(true);
    try {
      const updated = await authApi.updateMe({
        discordRoom: discordRoom.trim() === '' ? null : discordRoom.trim(),
        discordAlarm,
        timezone,
      });
      setProfile(updated);
      setSavedMessage('저장했습니다.');
    } catch (err) {
      setError(extractErrorMessage(err, '저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWebhook = async () => {
    setError(null);
    setSavedMessage(null);
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ discordRoom: null, discordAlarm: false });
      setProfile(updated);
      setDiscordRoom('');
      setDiscordAlarm(false);
      setSavedMessage('웹훅을 제거했습니다.');
    } catch (err) {
      setError(extractErrorMessage(err, '제거에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>설정</h1>
        <button type="button" className="logout-button" onClick={onBack}>
          ← 할 일로
        </button>
      </div>

      {profile && <p className="settings-email">{profile.email}</p>}

      <form onSubmit={handleSave} className="settings-form">
        <label className="settings-label">
          디스코드 웹훅 URL
          <div className="settings-input-row">
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={discordRoom}
              onChange={(e) => setDiscordRoom(e.target.value)}
            />
            {profile?.discordRoom && (
              <button type="button" onClick={handleRemoveWebhook} disabled={saving}>
                제거
              </button>
            )}
          </div>
          <span className="settings-hint">
            디스코드 채널 설정 → 연동 → 웹후크 만들기에서 URL을 복사해 붙여넣으세요.
          </span>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={discordAlarm}
            onChange={(e) => setDiscordAlarm(e.target.checked)}
          />
          디스코드 알림 받기
          <span className="settings-hint">웹훅을 등록해뒀어도 이게 꺼져있으면 알림이 안 갑니다.</span>
        </label>

        <label className="settings-label">
          타임존
          <div className="settings-input-row">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {buildTimezoneOptions(profile?.timezone).map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setTimezone(detectLocalTimezone())}>
              내 기기 시간대로
            </button>
          </div>
          <span className="settings-hint">
            할 일 마감/알림 시각을 이 타임존 기준으로 계산합니다.
          </span>
        </label>

        {error && <p className="auth-error">{error}</p>}
        {savedMessage && <p className="settings-saved">{savedMessage}</p>}

        <button type="submit" className="settings-save-button" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
