'use client';

import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AddScheduleScreen() {
  // ✅ 채팅방에서 넘어온 roomId 받기 (없으면 메시지 전송은 생략)
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [status, setStatus] = useState('예정');
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();

  const isPast = date.getTime() < Date.now();

  const handleAdd = async () => {
    // ✅ 과거 날짜 방지
    if (date.getTime() <= Date.now()) {
      Alert.alert('과거 날짜는 등록할 수 없습니다', '현재 이후의 날짜/시간을 선택해주세요.');
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('사용자 정보를 불러올 수 없습니다');
      return;
    }

    // 1) Supabase에 일정 추가
    const { data: insertData, error: insertError } = await supabase
      .from('walk_schedules')
      .insert({
        user_id: user.id,
        dog_id: null,
        target_dog_id: null,
        memo: title,
        scheduled_at: date.toISOString(),
        status: status,
      })
      .select()
      .single();

    if (insertError || !insertData) {
      Alert.alert('일정 추가 실패', insertError?.message ?? '알 수 없는 오류');
      return;
    }

    // 2) 로컬 알림 예약 (20분 전) — 기존 동작 유지
    try {
      const walkDate = new Date(date);
      const notifyTime = new Date(walkDate.getTime() - 20 * 60 * 1000);
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🐾 산책 알림',
          body: `${title || '산책'} 시간이 20분 뒤에 시작돼요!`,
          sound: 'default',
        },
        // 그대로 유지
        trigger: notifyTime.getTime() as unknown as Notifications.NotificationTriggerInput,
      });

      await supabase
        .from('walk_schedules')
        .update({ notification_id: notificationId })
        .eq('id', insertData.id);
    } catch (err) {
      console.warn('알림 등록 실패:', err);
    }

    // 3) (카톡처럼) 채팅방으로 안내 메시지 전송 — roomId가 있을 때만
    try {
      if (roomId) {
        const pretty = dayjs(date).format('YYYY-MM-DD HH:mm');
        const content = `📅 일정 등록: ${pretty} — ${title || '산책'} (${status})`;
        await supabase.from('messages').insert({
          room_id: roomId,
          sender_id: user.id,
          content,
          is_read: false,
        });
      }
    } catch (err) {
      console.warn('채팅 안내 메시지 전송 실패:', err);
      // 실패해도 일정 등록 자체는 유지
    }

    Alert.alert('일정이 성공적으로 추가되었습니다');
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* ✅ 돌아가기 버튼 추가 */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 12, left: 12, padding: 6 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ color: '#81C784', fontWeight: '600' }}>← 돌아가기</Text>
      </TouchableOpacity>

      <Text style={styles.label}>메모</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="메모를 입력하세요"
      />

      <Text style={styles.label}>날짜 및 시간</Text>
      <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.pickerButton}>
        <Text>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          // ✅ 과거 선택 제한
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <Text style={styles.label}>상태</Text>
      <TextInput
        style={styles.input}
        value={status}
        onChangeText={setStatus}
        placeholder="예정 / 완료"
      />

      <TouchableOpacity
        onPress={handleAdd}
        style={[styles.button, isPast && { opacity: 0.6 }]}
        // 시각적 비활성화 (옵션) — 실제 방지는 handleAdd에서 수행
        disabled={false}
      >
        <Text style={styles.buttonText}>일정 추가하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF7F1', paddingTop: 90 },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  pickerButton: { padding: 12, backgroundColor: '#eee', borderRadius: 8, marginBottom: 16 },
  button: {
    backgroundColor: '#81C784',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
