import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    <div className="auth-page">
      <h1>Work Check</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {mode === 'register' && (
          <p className="auth-hint">비밀번호는 최소 8자, 소문자·숫자·특수문자를 포함해야 합니다.</p>
        )}
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
      <button
        type="button"
        className="auth-toggle"
        onClick={() => {
          setError(null);
          setMode(mode === 'login' ? 'register' : 'login');
        }}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  );
}
