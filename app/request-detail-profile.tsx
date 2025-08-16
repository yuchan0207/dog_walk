'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    padding: 24,
    backgroundColor: '#fff',
    paddingBottom: 0
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 16,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
  },
  valueBox: {
    backgroundColor: '#f2f2f2',
    color: '#888',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#FF7043',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dogItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
  },
  dogImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  dogName: {
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    marginTop: 4,
    color: '#FF7043',
    fontWeight: '600',
  },
});

type Profile = Database['public']['Tables']['profiles']['Row'];
type DogProfile = Database['public']['Tables']['dog_profiles']['Row'];

export default function RequestDetailProfile() {
  // ✅ explore에서 오면 dogId만 들어오고, 요청 플로우에선 requestId가 들어옴
  const { userId, requestId, dogId } = useLocalSearchParams<{
    userId?: string;
    requestId?: string;
    dogId?: string;
  }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isRequestFlow = !!requestId; // 요청 수락/거절 플로우 여부

  useEffect(() => {
    (async () => {
      if (!userId || typeof userId !== 'string') {
        Alert.alert('잘못된 접근입니다.');
        setLoading(false);
        return;
      }

      // 1) 상대 프로필
      const { data: profileData, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (pErr) {
        Alert.alert('유저 정보를 불러올 수 없습니다.');
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // 2) 강아지 정보 로딩 경로 분기
      if (isRequestFlow && typeof requestId === 'string') {
        // 기존: walk_requests에서 my_dog_id를 얻어 신청자가 보낸 강아지 로드
        const { data: req, error: rErr } = await supabase
          .from('walk_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (rErr || !req) {
          Alert.alert('신청 정보를 불러올 수 없습니다.');
          setLoading(false);
          return;
        }
        if (!req.my_dog_id) {
          Alert.alert('강아지 정보가 올바르지 않습니다.');
          setLoading(false);
          return;
        }

        const { data: dogData, error: dErr } = await supabase
          .from('dog_profiles')
          .select('*')
          .eq('id', req.my_dog_id)
          .single();

        if (dErr) {
          Alert.alert('강아지 정보를 불러올 수 없습니다.');
          setLoading(false);
          return;
        }
        setDog(dogData);
        setLoading(false);
      } else if (dogId && typeof dogId === 'string') {
        // ✅ explore → 프로필 보기: 넘겨받은 dogId로 바로 로드
        const { data: dogData, error: dErr } = await supabase
          .from('dog_profiles')
          .select('*')
          .eq('id', dogId)
          .single();

        if (dErr) {
          Alert.alert('강아지 정보를 불러올 수 없습니다.');
          setLoading(false);
          return;
        }
        setDog(dogData);
        setLoading(false);
      } else {
        // dogId도 requestId도 없음
        setLoading(false);
      }
    })();
  }, [userId, requestId, dogId, isRequestFlow]);

  const handleAccept = async () => {
    if (!requestId || typeof requestId !== 'string') return;

    const { error } = await supabase
      .from('walk_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      Alert.alert('수락 처리 실패', error.message);
      return;
    }

    const { data: request } = await supabase
      .from('walk_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (request) {
      const { data: roomData, error: insertError } = await supabase
        .from('chat_rooms')
        .insert({
          user1_id: request.from_user_id,
          user2_id: request.to_user_id,
        })
        .select()
        .single();

      if (insertError) {
        Alert.alert('채팅방 생성에 실패했습니다.');
        return;
      }

      Alert.alert('산책 신청이 수락되었고, 채팅방이 생성되었습니다!');
      router.replace(`/chat-room/${roomData.id}`);
    }
  };

  const handleReject = async () => {
    if (!requestId || typeof requestId !== 'string') return;
    await supabase.from('walk_requests').delete().eq('id', requestId);
    Alert.alert('신청이 거절되었습니다.');
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) return <Text>유저 정보를 불러올 수 없습니다.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 돌아가기 */}
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
        <Text style={{ color: '#FF7043', fontWeight: '600' }}>← 돌아가기</Text>
      </TouchableOpacity>

      <Text style={styles.title}>👤 상대방 정보</Text>
      <View style={styles.section}>
        <Text style={styles.label}>이름</Text>
        <Text style={styles.valueBox}>{profile.name}</Text>

        <Text style={styles.label}>나이</Text>
        <Text style={styles.valueBox}>{profile.age}세</Text>

        <Text style={styles.label}>성별</Text>
        <Text style={styles.valueBox}>{profile.gender}</Text>
      </View>

      <Text style={styles.title}>
        {isRequestFlow ? '🐶 신청자가 보낸 강아지' : '🐶 상대방의 강아지'}
      </Text>

      {dog && (
        <View style={styles.dogItem}>
          <Image source={{ uri: dog.image_url ?? undefined }} style={styles.dogImage} />

          <View style={{ flex: 1 }}>
            <Text style={styles.dogName}>{dog.name}</Text>
            <Text>
              {dog.breed} / {dog.age}살
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/view',
                  // ✅ requestId는 있을 때만 전달 → Explore에서 온 경우에는 전달되지 않음
                  params: { dogId: dog.id, ...(isRequestFlow ? { requestId } : {}) },
                })
              }
            >
              <Text style={styles.link}>강아지 보기 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ✅ 요청 플로우에서만 수락/거절 노출 */}
      {isRequestFlow ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleAccept}>
            <Text style={styles.buttonText}>수락하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#ccc' }]}
            onPress={handleReject}
          >
            <Text style={[styles.buttonText, { color: '#333' }]}>거절하기</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}
