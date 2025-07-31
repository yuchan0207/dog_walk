'use client';

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

  const renderItem = ({ item }: { item: WalkRequest }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        router.push({
          pathname: '/request-detail-profile',
          params: {
            requestId: item.id,
            dogId: item.dog_id,
            userId: item.from_user_id,
          },
        });
      }}
    >
      <Text style={styles.title}>{item.requester_profile?.username || '사용자'}</Text>
      <Text style={styles.subtext}>이름: {item.requester_profile?.name || '-'}</Text>
      <Text style={styles.subtext}>나이: {item.requester_profile?.age ?? '-'}</Text>
      <Text style={styles.subtext}>성별: {item.requester_profile?.gender || '-'}</Text>
      <Text style={styles.subtext}>요청 시간: {new Date(item.created_at).toLocaleString()}</Text>
      <Text style={styles.subtext}>상태: {item.status}</Text>
    </TouchableOpacity>
  );

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
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#FF7043',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: '#555',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
