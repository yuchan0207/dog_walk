'use client';

import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AddScheduleScreen() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [status, setStatus] = useState('예정');
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();

  const handleAdd = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('사용자 정보를 불러올 수 없습니다');
      return;
    }

    const { error } = await supabase.from('walk_schedules').insert({
      user_id: user.id,
      dog_id: null, // 오류 방지
      target_dog_id: null, // 오류 방지
      memo: title,
      scheduled_at: date.toISOString(), // ISO 문자열로 저장
      status: status,
    });

    if (error) {
      Alert.alert('일정 추가 실패', error.message);
    } else {
      Alert.alert('일정이 성공적으로 추가되었습니다');
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
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={styles.pickerButton}
      >
        <Text>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
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

      <TouchableOpacity onPress={handleAdd} style={styles.button}>
        <Text style={styles.buttonText}>일정 추가하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF7F1',
    paddingTop: 50,
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
    backgroundColor: '#81C784',
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
