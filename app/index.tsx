// app/index.tsx
'use client';

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // 앱 시작 시 로그인 여부 확인
    const checkLogin = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (data?.user) {
        // 로그인된 경우 -> 바로 홈으로 이동
        router.replace('./home');
      }
    };

    checkLogin();
  }, []);

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>멍친소</Text>

      <TouchableOpacity style={styles.button} onPress={goToLogin}>
        <Text style={styles.buttonText}>시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  button: {
    backgroundColor: '#FF8A65',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
});
