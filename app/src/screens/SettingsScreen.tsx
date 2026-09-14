import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { authApi, UserProfile } from '../api/auth';
import { buildTimezoneOptions, detectLocalTimezone } from '../utils/timezones';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [discordAlarm, setDiscordAlarm] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [showTimezoneList, setShowTimezoneList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .getMe()
      .then((data) => {
        setProfile(data);
        setWebhookUrl(data.discordRoom ?? '');
        setDiscordAlarm(data.discordAlarm);
        setTimezone(data.timezone);
      })
      .catch((err) => setError(extractErrorMessage(err, '설정을 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSavedMessage(null);
    setSaving(true);
    try {
      const updated = await authApi.updateMe({
        discordRoom: webhookUrl.trim() === '' ? null : webhookUrl.trim(),
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
      setWebhookUrl('');
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
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>설정</Text>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← 할 일로</Text>
          </TouchableOpacity>
        </View>

        {profile && <Text style={styles.email}>{profile.email}</Text>}

        <Text style={styles.label}>디스코드 웹훅 URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://discord.com/api/webhooks/..."
          autoCapitalize="none"
          autoCorrect={false}
          value={webhookUrl}
          onChangeText={setWebhookUrl}
        />
        {profile?.discordRoom && (
          <TouchableOpacity onPress={handleRemoveWebhook} disabled={saving}>
            <Text style={styles.removeText}>웹훅 제거</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.hint}>
          디스코드 채널 설정 → 연동 → 웹후크 만들기에서 URL을 복사해 붙여넣으세요.
        </Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setDiscordAlarm(!discordAlarm)}
        >
          <View style={[styles.checkbox, discordAlarm && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>디스코드 알림 받기</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>웹훅을 등록해뒀어도 이게 꺼져있으면 알림이 안 갑니다.</Text>

        <Text style={styles.label}>타임존</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowTimezoneList(!showTimezoneList)}
        >
          <Text>{timezone}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTimezone(detectLocalTimezone())}>
          <Text style={styles.detectText}>내 기기 시간대로 설정</Text>
        </TouchableOpacity>

        {showTimezoneList && (
          <View style={styles.timezoneList}>
            {buildTimezoneOptions(profile?.timezone).map((tz) => (
              <TouchableOpacity
                key={tz.value}
                style={styles.timezoneItem}
                onPress={() => {
                  setTimezone(tz.value);
                  setShowTimezoneList(false);
                }}
              >
                <Text style={tz.value === timezone ? styles.timezoneItemActive : undefined}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.hint}>할 일 마감/알림 시각을 이 타임존 기준으로 계산합니다.</Text>

        {error && <Text style={styles.error}>{error}</Text>}
        {savedMessage && <Text style={styles.saved}>{savedMessage}</Text>}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f6f8' },
  container: { padding: 16, paddingBottom: 40 },
  loadingText: { padding: 16, color: '#6b7280' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700' },
  backText: { color: '#4338ca', fontSize: 13, fontWeight: '600' },
  email: { color: '#6b7280', fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  removeText: { color: '#dc2626', fontSize: 13, marginTop: 6 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#4338ca',
    borderColor: '#4338ca',
  },
  checkboxLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  picker: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detectText: { color: '#4338ca', fontSize: 13, marginTop: 6 },
  timezoneList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  timezoneItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timezoneItemActive: { color: '#4338ca', fontWeight: '700' },
  error: { color: '#dc2626', fontSize: 13, marginTop: 12 },
  saved: { color: '#059669', fontSize: 13, marginTop: 12 },
  saveButton: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
