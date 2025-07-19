'use client';

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type ChatRoom = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user_name?: string;
  other_user_id?: string;
};

export default function ChatListScreen() {
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return;

    const currentUserId = user.id;
    setUserId(currentUserId);

    const { data: rooms, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

    if (roomError || !rooms) return;

    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        const otherId = room.user1_id === currentUserId ? room.user2_id : room.user1_id;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', otherId)
          .single();

        return {
          ...room,
          other_user_id: otherId,
          other_user_name: otherProfile?.name || '알 수 없음',
        };
      })
    );

    setChatRooms(enrichedRooms);
    setLoading(false);
  };

  const handleEnterRoom = (roomId: string, otherUserId: string) => {
    router.push({
      pathname: '/chat-room',
      params: { roomId, partnerId: otherUserId },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💬 채팅 목록</Text>
      {chatRooms.length === 0 ? (
        <Text style={styles.noChat}>채팅방이 없습니다.</Text>
      ) : (
        <FlatList
          data={chatRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => handleEnterRoom(item.id, item.other_user_id!)}
            >
              <Text style={styles.chatName}>{item.other_user_name}</Text>
              <Text style={styles.chatId}>채팅방 ID: {item.id.slice(0, 8)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  noChat: {
    fontSize: 16,
    color: '#777',
  },
  chatItem: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatId: {
    fontSize: 12,
    color: '#999',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
