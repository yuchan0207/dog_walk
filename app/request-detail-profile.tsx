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
  const { userId, requestId } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!userId || typeof userId !== 'string') return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: dogList } = await supabase
        .from('dog_profiles')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      setProfile(profileData);
      setDogs(dogList ?? []);
      setLoading(false);
    })();
  }, [userId]);

  const handleAccept = async () => {
    if (!requestId || typeof requestId !== 'string') return;

    const { error } = await supabase
      .from('walk_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
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
          .single(); // ← room_id를 바로 받기 위해 필요

        if (insertError) {
          Alert.alert('채팅방 생성에 실패했습니다.');
          return;
        }

        Alert.alert('산책 신청이 수락되었고, 채팅방이 생성되었습니다!');
        router.replace(`/chat-room/${roomData.id}`);
      }
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
      <Text style={styles.title}>👤 상대방 정보</Text>
      <View style={styles.section}>
        <Text style={styles.label}>이름</Text>
        <Text style={styles.valueBox}>{profile.name}</Text>

        <Text style={styles.label}>나이</Text>
        <Text style={styles.valueBox}>{profile.age}세</Text>

        <Text style={styles.label}>성별</Text>
        <Text style={styles.valueBox}>{profile.gender}</Text>
      </View>

      <Text style={styles.title}>🐶 등록한 강아지</Text>
      {dogs.map((dog) => (
        <View key={dog.id} style={styles.dogItem}>
          <Image source={{ uri: dog.image_url ?? undefined }} style={styles.dogImage} />

          <View style={{ flex: 1 }}>
            <Text style={styles.dogName}>{dog.name}</Text>
            <Text>{dog.breed} / {dog.age}살</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/request-dog-view', params: { dogId: dog.id, requestId } })
              }
            >
              <Text style={styles.link}>강아지 보기 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleAccept}>
          <Text style={styles.buttonText}>수락하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#ccc' }]} onPress={handleReject}>
          <Text style={[styles.buttonText, { color: '#333' }]}>거절하기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
