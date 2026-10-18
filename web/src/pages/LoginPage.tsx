import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function LoginPage() {
  const { loginMutation, registerMutation } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const activeMutation = mode === 'login' ? loginMutation : registerMutation;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    activeMutation.mutate({ email, password });
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    loginMutation.reset();
    registerMutation.reset();
  };

  return (
    <div className="mx-auto max-w-[360px] px-4 py-20 text-center">
      <h1 className="mb-6 text-2xl font-bold">Work Check</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          required
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
        />
        {mode === 'register' && (
          <p className="-mt-1 text-left text-xs text-gray-400">
            비밀번호는 최소 8자, 소문자·숫자·특수문자를 포함해야 합니다.
          </p>
        )}
        {activeMutation.isError && (
          <p className="m-0 text-sm text-red-600">
            {extractErrorMessage(
              activeMutation.error,
              mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.',
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={activeMutation.isPending}
          className="rounded-lg bg-indigo-700 py-2.5 font-semibold text-white disabled:cursor-default disabled:opacity-60"
        >
          {activeMutation.isPending ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
      <button type="button" className="mt-4 bg-transparent text-sm text-indigo-700" onClick={toggleMode}>
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  );
}
