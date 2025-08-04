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

  const fetchChatRooms = async () => {
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!rooms) return;

    const enrichedRooms: any[] = [];

    for (const room of rooms) {
      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!messages || messages.length === 0) continue;

      const opponentId =
        room.user1_id === userId ? room.user2_id : room.user1_id;
      if (!opponentId) continue;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', opponentId)
        .single();

      const { data: request } = await supabase
        .from('walk_requests')
        .select('dog_id')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let dogName = '';
      if (request?.dog_id) {
        const { data: dog } = await supabase
          .from('dog_profiles')
          .select('name')
          .eq('id', request.dog_id)
          .single();
        dogName = dog?.name ?? '';
      }

      if (profile?.name) {
        enrichedRooms.push({
          roomId: room.id,
          lastMessage: messages[0].content,
          timestamp: messages[0].created_at,
          opponentName: profile.name,
          dogName: dogName,
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

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single();

    if (!room) return;

    const updates: any = {};
    if (room.user1_id === userId) updates.user1_id = null;
    else if (room.user2_id === userId) updates.user2_id = null;

    await supabase.from('chat_rooms').update(updates).eq('id', roomId);

    // 둘 다 나간 경우 완전 삭제
    const { data: updated } = await supabase
      .from('chat_rooms')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single();

    if (updated && !updated.user1_id && !updated.user2_id) {
      await supabase.from('chat_rooms').delete().eq('id', roomId);
      await supabase.from('messages').delete().eq('room_id', roomId);
    }


    fetchChatRooms(); // 목록 새로고침
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => router.push(`/chat-room/${item.roomId}`)}
      onLongPress={() => confirmExitRoom(item.roomId)} // ✅ 롱프레스 시 나가기 확인창
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
