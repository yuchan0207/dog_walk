'use client';

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function ChatList() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chatRooms, setChatRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) fetchChatRooms();
  }, [userId]);

  // ✅ 상대 강아지 이름이 정확히 나오도록 로직 교체 (UI/구조 변경 없음)
  const fetchChatRooms = async () => {
    const { data: rooms, error: roomsErr } = await supabase
      .from('chat_rooms')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (roomsErr || !rooms) return;

    const enrichedRooms: any[] = [];

    for (const room of rooms) {
      // 마지막 메시지
      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!messages || messages.length === 0) continue;

      // 방의 상대 사용자
      const opponentId = room.user1_id === userId ? room.user2_id : room.user1_id;
      if (!opponentId) continue;

      // 상대 프로필
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', opponentId)
        .single();

      // ✅ 두 사용자 사이에서 'accepted' 최신 요청 1건만
      const { data: req } = await supabase
        .from('walk_requests')
        .select('id, from_user_id, to_user_id, dog_id, my_dog_id, status, created_at')
        .eq('status', 'accepted')
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${opponentId}),and(from_user_id.eq.${opponentId},to_user_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // ✅ 상대 강아지 id 계산 (요청 방향에 따라 다름)
      let opponentDogId: string | null = null;
      if (req) {
        // 내가 보낸 요청이면 상대 강아지는 dog_id
        // 상대가 보낸 요청이면 상대 강아지는 my_dog_id
        opponentDogId = req.from_user_id === userId ? req.dog_id : req.my_dog_id ?? null;
      }

      // ✅ 상대 강아지 이름 조회
      let dogName = '';
      if (opponentDogId) {
        const { data: dog } = await supabase
          .from('dog_profiles')
          .select('name')
          .eq('id', opponentDogId)
          .single();
        dogName = dog?.name ?? '';
      }

      if (profile?.name) {
        enrichedRooms.push({
          roomId: room.id,
          lastMessage: messages[0].content,
          timestamp: messages[0].created_at,
          opponentName: profile.name,
          dogName, // ← 리스트에 표시될 상대 강아지 이름
        });
      }
    }

    setChatRooms(enrichedRooms);
  };

  const confirmExitRoom = (roomId: string) => {
    Alert.alert('채팅방 나가기', '정말 이 채팅방에서 나가시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => exitChatRoom(roomId),
      },
    ]);
  };

  const exitChatRoom = async (roomId: string) => {
    if (!userId) return;

    // ✅ RLS에 막히지 않는 서버 함수 호출 (user_id는 손대지 않음)
    const { error: rpcErr } = await (supabase as any).rpc('leave_chat_room', {
      p_room_id: roomId,
    });

    if (rpcErr) {
      Alert.alert('나가기 실패', rpcErr.message ?? '오류가 발생했습니다.');
      return;
    }

    // ✅ 낙관적 제거 + 목록 새로고침 (원래 흐름 유지)
    setChatRooms((prev) => prev.filter((r) => r.roomId !== roomId));
    fetchChatRooms();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => router.push(`/chat-room/${item.roomId}`)}
      onLongPress={() => confirmExitRoom(item.roomId)} // 롱프레스 시 나가기 확인창
    >
      <View style={styles.header}>
        <Text style={styles.opponentName}>{item.opponentName}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.dogName}>🐶 {item.dogName}</Text>
      <Text style={styles.message} numberOfLines={1}>
        💬 {item.lastMessage}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 돌아가기 버튼 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← 돌아가기</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chatRooms}
        renderItem={renderItem}
        keyExtractor={(item) => item.roomId}
        contentContainerStyle={styles.container}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backText: {
    fontSize: 16,
    color: '#FF7043',
    fontWeight: '600',
  },
  container: {
    padding: 16,
    backgroundColor: '#FFFAF3',
    minHeight: '100%',
  },
  roomItem: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  dogName: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#444',
  },
});
