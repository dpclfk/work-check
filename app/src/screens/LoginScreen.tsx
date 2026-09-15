import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(
        extractErrorMessage(err, mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Work Check</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          maxLength={254}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {mode === 'register' && (
          <Text style={styles.hint}>비밀번호는 최소 8자, 소문자·숫자·특수문자를 포함해야 합니다.</Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitButtonText}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setError(null);
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          <Text style={styles.toggleText}>
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f6f8' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hint: { color: '#9ca3af', fontSize: 12, marginTop: -4 },
  error: { color: '#dc2626', fontSize: 13 },
  submitButton: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  toggleText: { color: '#4338ca', textAlign: 'center', marginTop: 8, fontSize: 13 },
});
