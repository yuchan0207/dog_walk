'use client';

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { supabase } from '../lib/supabase'; // supabase 클라이언트 경로에 맞게 수정

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('로그인 실패', error.message);
    } else {
      router.replace('/home');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Text style={styles.title}>로그인</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#aaa"
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#aaa"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>로그인</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Alert.alert('아직 구현되지 않았어요')}>
        <Text style={styles.linkText}>비밀번호를 잊으셨나요?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('./signup')}>
        <Text style={styles.signupText}>처음 오셨나요? 회원가입하기</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 40,
    color: '#FF7043',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    borderColor: '#FFAB91',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#FF7043',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 16,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  linkText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 12,
  },
  signupText: {
    color: '#FF7043',
    fontSize: 15,
    fontWeight: '500',
  },
});
