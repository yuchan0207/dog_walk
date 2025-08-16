// app/index.tsx
'use client';

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkLoginAndHomeLocation = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user) {
        const { data: homeLocation, error: locationError } = await supabase
          .from('user_home_locations')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (homeLocation) {
          // 집 위치가 등록되어 있으면 홈으로
          router.replace('/home');
        } else {
          // 등록 안 되어 있으면 집 위치 설정 페이지로
          router.replace('/set_home');
        }
      }
    };

    checkLoginAndHomeLocation();
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
