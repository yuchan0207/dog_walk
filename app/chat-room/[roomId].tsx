'use client';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul'); // ✅ KST

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (roomId) fetchMessages();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [...prev, newMsg]);

          if (newMsg.sender_id !== userId) {
            setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, is_read: true } : m)));
            const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
            if (error) console.log('mark read on INSERT error:', error);
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as any;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data ?? []);
      markMessagesAsRead(data ?? []);
    }
    setLoading(false);
  };

  const markMessagesAsRead = async (msgs: any[]) => {
    if (!userId) return;
    const unreadIds = msgs.filter((m) => m.sender_id !== userId && !m.is_read).map((m) => m.id);
    if (unreadIds.length > 0) {
      setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)));
      const { error } = await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      if (error) console.log('markMessagesAsRead error:', error);
    }
  };

  useEffect(() => {
    if (userId && messages.length) {
      markMessagesAsRead(messages);
    }
  }, [userId]);

  const sendMessage = async () => {
    if (!userId || !newMessage.trim()) return;
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: newMessage.trim(),
      is_read: false,
    });
    setNewMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMine = item.sender_id === userId;
    const timestamp = dayjs(item.created_at)
      .tz('Asia/Seoul')
      .add(1, 'day')
      .subtract(15, 'hour') // 시간에서 15시간 빼기
      .format('YYYY-MM-DD HH:mm');
    return (
      <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <View style={styles.messageMeta}>
          <Text style={styles.metaText}>{timestamp}</Text>
          {isMine && <Text style={[styles.metaText, { marginLeft: 6 }]}>{item.is_read ? '읽음' : '안읽음'}</Text>}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF7043" />
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← 돌아가기</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        {/* ✅ 새 일정 버튼 (자연스럽게, 카톡 느낌의 보조 버튼) */}
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => router.push({ pathname: '/add-schedule', params: { roomId } })}
        >
          <Text style={styles.scheduleText}>일정+</Text>
        </TouchableOpacity>

        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="메시지를 입력하세요"
          style={styles.input}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F2', padding: 6 },
  header: {
    paddingHorizontal: 12, paddingTop: 60, paddingBottom: 12,
    borderBottomWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  backText: { fontSize: 16, color: '#FF7043', fontWeight: '600' },
  messagesContainer: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 90 },
  messageBubble: { padding: 10, borderRadius: 10, marginBottom: 10, maxWidth: '80%' },
  myMessage: { backgroundColor: '#FF7043', alignSelf: 'flex-end' },
  theirMessage: { backgroundColor: '#E0E0E0', alignSelf: 'flex-start' },
  messageText: { color: '#000', fontSize: 16 },
  messageMeta: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  metaText: { fontSize: 12, color: '#444' },
  inputContainer: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
    alignItems: 'center',
  },
  // ✅ 추가된 스타일 (기존 레이아웃을 깨지 않도록 최소 사이즈)
  scheduleButton: {
    paddingVertical: 8, paddingHorizontal: 10, marginRight: 8,
    backgroundColor: '#F2E7FE', borderRadius: 16,
  },
  scheduleText: { color: '#5E35B1', fontWeight: '700', fontSize: 12 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20,
    paddingHorizontal: 14, fontSize: 16, marginRight: 10, backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#FF7043', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
