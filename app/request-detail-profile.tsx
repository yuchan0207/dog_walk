'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function RequestDetailProfileScreen() {
  const { userId, requestId } = useLocalSearchParams<{ userId: string; requestId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
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
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>👤 신청자 프로필</Text>

      <Text style={styles.label}>이름: {profile?.name ?? '없음'}</Text>
      <Text style={styles.label}>나이: {profile?.age ?? '없음'}</Text>
      <Text style={styles.label}>성별: {profile?.gender ?? '없음'}</Text>

      <Text style={styles.title}>🐶 등록된 강아지</Text>

      {dogs.length === 0 ? (
        <Text>등록된 강아지가 없습니다.</Text>
      ) : (
        dogs.map((dog) => (
          <TouchableOpacity
            key={dog.id}
            style={styles.dogBox}
            onPress={() => router.push({ pathname: '/request-dog-view', params: { dogId: dog.id, requestId } })}
          >
            <Text style={styles.dogName}>{dog.name}</Text>
            <Text>{dog.breed} / {dog.age}살</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  dogBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  dogName: {
    fontSize: 18,
    fontWeight: '600',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});