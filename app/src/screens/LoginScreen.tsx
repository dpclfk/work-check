import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function LoginScreen() {
  const { loginMutation, registerMutation } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const activeMutation = mode === 'login' ? loginMutation : registerMutation;

  const handleSubmit = () => {
    activeMutation.mutate({ email, password });
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    loginMutation.reset();
    registerMutation.reset();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f5f6f8]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center gap-3 p-6"
      >
        <Text className="mb-2 text-center text-[28px] font-bold">Work Check</Text>
        <Text className="mb-6 text-center text-xl font-bold text-[#6a7282]">
          매일/매주/매달 해야할일을 까먹지않게
        </Text>

        <TextInput
          className="rounded-lg border border-[#e5e7eb] bg-white p-3.5 text-base"
          placeholder="이메일"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          maxLength={254}
        />
        <TextInput
          className="rounded-lg border border-[#e5e7eb] bg-white p-3.5 text-base"
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {mode === 'register' && (
          <Text className="-mt-1 text-xs text-[#9ca3af]">
            비밀번호는 최소 8자, 소문자·숫자·특수문자를 포함해야 합니다.
          </Text>
        )}

        {activeMutation.isError && (
          <Text className="text-[13px] text-red-600">
            {extractErrorMessage(
              activeMutation.error,
              mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.',
            )}
          </Text>
        )}

        <TouchableOpacity
          className="mt-2 items-center rounded-lg bg-indigo-700 p-3.5"
          onPress={handleSubmit}
          disabled={activeMutation.isPending}
        >
          <Text className="text-base font-semibold text-white">
            {activeMutation.isPending ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleMode}>
          <Text className="mt-2 text-center text-[13px] text-indigo-700">
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
