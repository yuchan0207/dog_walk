'use client';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications'; // ✅ 추가
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function EditScheduleScreen() {
  const { id } = useLocalSearchParams();
  const idString = Array.isArray(id) ? id[0] : id;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [status, setStatus] = useState('예정');
  const [showPicker, setShowPicker] = useState(false);
  const [oldNotificationId, setOldNotificationId] = useState<string | null>(null); // ✅ 기존 알림 ID 저장

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from('walk_schedules')
      .select('*')
      .eq('id', idString)
      .single();

    if (error || !data) {
      Alert.alert('일정 불러오기 실패', error?.message || '데이터 없음');
    } else {
      setTitle(data.memo || '');
      setDate(new Date(data.scheduled_at));
      setStatus(data.status);
      setOldNotificationId(data.notification_id ?? null); // ✅ 기존 알림 ID 저장
    }
  };

  useEffect(() => {
    if (idString) fetchSchedule();
  }, [idString]);

  const handleUpdate = async () => {
    // ✅ 1. 기존 알림 취소
    if (oldNotificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(oldNotificationId);
      } catch (err) {
        console.warn('기존 알림 취소 실패:', err);
      }
    }

    // ✅ 2. 새 알림 예약
    let newNotificationId: string | null = null;
    try {
      const notifyTime = new Date(date.getTime() - 20 * 60 * 1000); // 20분 전
      newNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🐾 산책 알림',
          body: `${title || '산책'} 시간이 20분 뒤에 시작돼요!`,
          sound: 'default',
        },
        trigger: notifyTime.getTime() as unknown as Notifications.NotificationTriggerInput,
      });
    } catch (err) {
      console.warn('새 알림 예약 실패:', err);
    }

    // ✅ 3. Supabase에 수정 반영 + 새 알림 ID 저장
    const { error } = await supabase
      .from('walk_schedules')
      .update({
        memo: title,
        scheduled_at: date.toISOString(),
        status,
        notification_id: newNotificationId,
      })
      .eq('id', idString);

    if (error) {
      Alert.alert('수정 실패', error.message);
    } else {
      Alert.alert('수정 완료');
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>메모</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="메모를 입력하세요"
      />

      <Text style={styles.label}>날짜 및 시간</Text>
      <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.pickerButton}>
        <Text>{date.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
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

      <TouchableOpacity onPress={handleUpdate} style={styles.button}>
        <Text style={styles.buttonText}>일정 수정하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF7F1',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  pickerButton: {
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4FC3F7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
