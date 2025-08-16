'use client';

import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState<ScheduleWithExtras[]>([]);
  const [loading, setLoading] = useState(true);

  interface ScheduleWithExtras {
    id: string;
    user_id: string;
    dog_id: string | null;
    target_dog_id: string | null;
    date: string;
    title: string;
    status: string;
    memo: string;
    created_at: string;
    notification_id?: string | null; // ✅ 추가됨
  }

  useEffect(() => {
    const registerForPushNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림 권한이 필요합니다!');
      }
    };
    registerForPushNotifications();
  }, []);

  const schedulePushNotification = async (schedule: ScheduleWithExtras) => {
    const walkDate = new Date(schedule.date);
    const notifyTime = new Date(walkDate.getTime() - 20 * 60 * 1000); // 20분 전

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐾 산책 알림',
        body: `${schedule.title || '산책'} 시간이 20분 뒤에 시작돼요!`,
        sound: 'default',
      },
      trigger: notifyTime.getTime() as unknown as Notifications.NotificationTriggerInput,
    });

    // ✅ 알림 ID를 Supabase에 저장
    await supabase
      .from('walk_schedules')
      .update({ notification_id: notificationId })
      .eq('id', schedule.id);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    await supabase
      .from('walk_schedules')
      .update({ status: '완료' })
      .lt('scheduled_at', new Date().toISOString())
      .eq('status', '예정');
    const { data, error } = await supabase
      .from('walk_schedules')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (error) {
      Alert.alert('불러오기 실패', error.message);
    } else {
      const mapped = (data ?? []).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        dog_id: item.dog_id,
        target_dog_id: item.target_dog_id,
        date: item.scheduled_at,
        title: item.memo ?? '',
        status: item.status,
        memo: item.memo ?? '',
        created_at: item.created_at ?? '',
        notification_id: item.notification_id ?? '', // ✅ 포함
      }));
      setSchedules(mapped);
      mapped.forEach(schedulePushNotification);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    // ✅ 삭제 전 notification_id 먼저 조회
    const { data, error: fetchError } = await supabase
      .from('walk_schedules')
      .select('notification_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      Alert.alert('삭제 실패', fetchError.message);
      return;
    }

    // ✅ 알림 예약이 되어있다면 취소
    if (data?.notification_id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(data.notification_id);
      } catch (e) {
        console.warn('알림 취소 중 오류:', e);
      }
    }

    // ✅ Supabase에서 삭제
    const { error } = await supabase.from('walk_schedules').delete().eq('id', id);
    if (error) {
      Alert.alert('삭제 실패', error.message);
    } else {
      fetchSchedules();
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>내 산책 일정</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-schedule')}
        >
          <Text style={styles.addButtonText}>+ 새 일정 추가</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="gray" />
        ) : schedules.length === 0 ? (
          <Text style={styles.emptyText}>예정된 일정이 없습니다.</Text>
        ) : (
          schedules.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.date}>📅 {format(new Date(item.date), 'PPPp')}</Text>
              <Text style={styles.memo}>📝 {item.title || '메모 없음'}</Text>
              <Text style={styles.status}>상태: {item.status}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({ pathname: '/edit-schedule', params: { id: item.id } })
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F1',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  addButton: {
    backgroundColor: '#4DB6AC',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFE0B2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#5D4037',
  },
  memo: {
    fontSize: 14,
    marginBottom: 4,
    color: '#6D4C41',
  },
  status: {
    fontSize: 14,
    marginBottom: 8,
    color: '#8D6E63',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#4FC3F7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#EF5350',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
