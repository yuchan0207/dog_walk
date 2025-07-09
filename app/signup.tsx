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
import { supabase } from '../lib/supabase'; // 너가 설정한 supabase client 경로에 따라 조정!

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('회원가입 실패', error.message);
    } else {
      Alert.alert('회원가입 완료', '이메일을 확인해 주세요.');
      router.replace('./login'); // 회원가입 후 로그인 화면으로
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Text style={styles.title}>회원가입</Text>

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

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>가입하기</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('./login')}>
        <Text style={styles.linkText}>이미 계정이 있나요? 로그인하기</Text>
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
    color: '#FF7043',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
