'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function RequestDogView() {
  const { dogId, requestId } = useLocalSearchParams<{ dogId: string; requestId: string }>();
  const router = useRouter();
  const [dog, setDog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dogId) fetchDogInfo();
  }, [dogId]);

  const fetchDogInfo = async () => {
    const { data, error } = await supabase
      .from('dog_profiles')
      .select('*')
      .eq('id', dogId)
      .single();

    if (error || !data) {
      Alert.alert('불러오기 실패', '강아지 정보를 찾을 수 없습니다.');
      router.back();
      return;
    }

    setDog(data);
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!requestId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('오류', '로그인 정보가 없습니다.');
      return;
    }

    const { error: updateError } = await supabase
      .from('walk_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      Alert.alert('처리 실패', updateError.message);
      return;
    }

    const { data: request } = await supabase
      .from('walk_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    const { error: insertError } = await supabase
      .from('chat_rooms')
      .insert({
        walk_request_id: requestId,
        user1_id: request.from_user_id,
        user2_id: user.id,
        dog_id: dogId,
      });

    if (insertError) {
      Alert.alert('채팅방 생성 실패', insertError.message);
      return;
    }

    Alert.alert('요청 수락', '채팅방이 생성되었습니다.');
    router.push({ pathname: '/chat-room', params: { requestId } });
  };

  const handleReject = async () => {
    if (!requestId) return;

    const { error } = await supabase
      .from('walk_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      Alert.alert('처리 실패', error.message);
    } else {
      Alert.alert('요청 거절', '요청이 거절되었습니다.');
      router.back();
    }
  };

  if (loading || !dog) {
    return (
      <View style={styles.center}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← 돌아가기</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{dog.name}</Text>

      <Image source={{ uri: dog.image_url }} style={styles.image} />

      <View style={styles.section}>
        <Text style={styles.label}>견종</Text>
        <Text style={styles.value}>{dog.breed}</Text>

        <Text style={styles.label}>나이</Text>
        <Text style={styles.value}>{dog.age}살</Text>

        <Text style={styles.label}>성별</Text>
        <Text style={styles.value}>{dog.gender}</Text>

        <Text style={styles.label}>취미</Text>
        <Text style={styles.value}>
          {Array.isArray(dog.hobbies) ? dog.hobbies.join(', ') : dog.hobbies}
        </Text>

        <Text style={styles.label}>성격</Text>
        <Text style={styles.value}>
          {Array.isArray(dog.personality) ? dog.personality.join(', ') : dog.personality}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4CAF50' }]}
        onPress={handleAccept}
      >
        <Text style={styles.buttonText}>수락하고 채팅 시작하기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#F44336' }]}
        onPress={handleReject}
      >
        <Text style={styles.buttonText}>거절하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: '#FFF8F2',
    flexGrow: 1,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#FF7043',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FF7043',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
