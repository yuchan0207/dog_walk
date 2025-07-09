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

type DogProfile = {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  hobbies: string;
  personality: string;
  image_url: string;
  created_at: string;
};

export default function ViewScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dogId) fetchDogInfo();
  }, [dogId]);

  const fetchDogInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('dog_profiles')
        .select('*')
        .eq('id', dogId)
        .single<DogProfile>();

      if (error || !data) {
        Alert.alert('불러오기 실패', '강아지 정보를 찾을 수 없습니다.');
        router.back();
        return;
      }

      setDog(data);
    } catch (err) {
      Alert.alert('오류', '알 수 없는 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const requestWalk = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    const { error } = await supabase.from('walk_requests').insert({
      from_user_id: user.id,
      to_user_id: dog?.owner_id,
      dog_id: dogId,
      status: 'pending',
    });

    if (error) {
      Alert.alert('신청 실패', error.message);
    } else {
      Alert.alert('신청 완료', '산책 신청을 보냈어요!');
      router.push('/home');
    }
  };

  if (loading || !dog) {
    return (
      <View style={styles.center}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🐶 {dog.name}</Text>
      <Image source={{ uri: dog.image_url }} style={styles.image} />

      <View style={styles.section}>
        <InfoItem label="🐾 견종" value={dog.breed} />
        <InfoItem label="🎂 나이" value={`${dog.age}살`} />
        <InfoItem label="🚻 성별" value={dog.gender} />
        <InfoItem label="🎮 취미" value={dog.hobbies} />
        <InfoItem label="💖 성격" value={dog.personality} />
      </View>

      <TouchableOpacity style={styles.button} onPress={requestWalk}>
        <Text style={styles.buttonText}>산책 신청하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop:65,
    padding: 24,
    backgroundColor: '#FFF8F2',
    flexGrow: 1,
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
    height: 220,
    borderRadius: 20,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
    paddingBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    fontSize: 16,
    color: '#555',
    width: '40%',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    width: '55%',
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#FF7043',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
