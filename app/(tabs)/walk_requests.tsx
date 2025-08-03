'use client';

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type WalkRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  dog_id: string;
  status: string;
  created_at: string;
  requester_profile?: {
    username: string;
    name?: string;
    age?: number;
    gender?: string;
  };
  dog?: {
    name: string;
    breed: string;
    age: number;
    image_url: string;
  };
};

export default function WalkRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<WalkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('로그인 필요', '로그인이 필요합니다.');
      return;
    }

    const { data, error } = await supabase
      .from('walk_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        dog_id,
        status,
        created_at,
        requester_profile:from_user_id (
          username,
          name,
          age,
          gender
        ),
        dog:dog_id (
          name,
          breed,
          age,
          image_url
        )
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('불러오기 실패', error.message);
      setLoading(false);
      return;
    }

    setRequests(data as WalkRequest[]);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const renderItem = ({ item }: { item: WalkRequest }) => {
    const dog = item.dog;
    if (!dog) return null;

    return (
      <TouchableOpacity
        style={styles.dogItem}
        onPress={() =>
          router.push({
            pathname: '/request-detail-profile',
            params: {
              requestId: item.id,
              dogId: item.dog_id,
              userId: item.from_user_id,
            },
          })
        }
      >
        <Image source={{ uri: dog.image_url }} style={styles.dogImage} />
        <View style={{ flex: 1 }}>
          <Text style={styles.dogName}>{dog.name}</Text>
          <Text>{dog.breed} / {dog.age}살</Text>
          <Text style={styles.subtext}>신청자: {item.requester_profile?.username || '사용자'}</Text>
          <Text style={styles.link}>상세 보기 →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF7043" />
        <Text style={{ marginTop: 10 }}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← 돌아가기</Text>
      </TouchableOpacity>

      <Text style={styles.header}>받은 산책 신청</Text>

      {requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ marginTop: 20, fontSize: 16, color: '#777' }}>
            아직 신청이 없어요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flex: 1,
    backgroundColor: '#FFF8F2',
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF7043',
    fontWeight: '600',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF7043',
    marginBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dogItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fff',
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
  subtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
  },
  link: {
    marginTop: 4,
    color: '#FF7043',
    fontWeight: '600',
  },
});
