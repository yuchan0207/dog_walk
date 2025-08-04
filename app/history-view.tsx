'use client';

import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';

export default function HistoryViewScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isMine, setIsMine] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMemo, setEditMemo] = useState('');
  const [editHashtags, setEditHashtags] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (dogId && myUserId) {
      fetchDiaries();
      checkIfMine();
    }
  }, [dogId, myUserId]);

  const fetchDiaries = async () => {
    const { data, error } = await supabase
      .from('dog_histories')
      .select('*')
      .eq('dog_id', dogId)
      .order('date', { ascending: false });
    if (!error && data) setDiaries(data);
  };

  const checkIfMine = async () => {
    const { data: dog } = await supabase
      .from('dog_profiles')
      .select('owner_id')
      .eq('id', dogId)
      .single();
    if (dog?.owner_id === myUserId) {
      setIsMine(true);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('dog_histories').delete().eq('id', id);
    Alert.alert('삭제 완료', '일지가 삭제되었습니다');
    fetchDiaries();
  };

  const handleEdit = (diary: any) => {
    setEditingId(diary.id);
    setEditMemo(diary.memo || '');
    setEditHashtags((diary.hashtags || []).join(' '));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await supabase
      .from('dog_histories')
      .update({
        memo: editMemo,
        hashtags: editHashtags.split(/[#\s]+/).filter(Boolean),
      })
      .eq('id', editingId);

    setEditingId(null);
    setEditMemo('');
    setEditHashtags('');
    fetchDiaries();
    Alert.alert('수정 완료', '일지가 수정되었습니다');
  };

  const filteredDiaries = diaries.filter((d) => d.date === selectedDate);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← 돌아가기</Text>
            </TouchableOpacity>

            <Text style={styles.title}>🐾 강아지 일지 보기</Text>

            <TouchableOpacity onPress={() => setCalendarOpen(!calendarOpen)} style={styles.calendarToggle}>
              <Text style={styles.calendarToggleText}>
                📅 {selectedDate} {calendarOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {calendarOpen && (
              <Calendar
                markedDates={{ [selectedDate]: { selected: true, marked: true, selectedColor: '#FFA726' } }}
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setCalendarOpen(false);
                }}
                theme={{
                  backgroundColor: '#FFF8F0',
                  calendarBackground: '#FFF8F0',
                  todayTextColor: '#FF7043',
                  dayTextColor: '#333',
                  textDayFontWeight: '500',
                  textMonthFontWeight: 'bold',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  selectedDayBackgroundColor: '#FFA726',
                  selectedDayTextColor: '#fff',
                }}
                style={styles.calendar}
              />
            )}

            {filteredDiaries.length === 0 ? (
              <Text style={styles.noData}>이 날의 일지가 없어요 🐶</Text>
            ) : (
              filteredDiaries.map((d) => (
                <View key={d.id} style={styles.card}>
                  <FlatList
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={d.image_urls}
                    keyExtractor={(u) => u}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedImage(item);
                          setModalVisible(true);
                        }}
                      >
                        <Image source={{ uri: item }} style={styles.thumbnail} />
                      </TouchableOpacity>
                    )}
                  />
                  {editingId === d.id ? (
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        value={editHashtags}
                        onChangeText={setEditHashtags}
                        placeholder="#산책 #귀여움"
                        style={[styles.memo, {
                          color: '#1E88E5',
                          backgroundColor: '#fff',
                          padding: 10,
                          borderRadius: 10,
                        }]}
                      />
                      <TextInput
                        value={editMemo}
                        onChangeText={setEditMemo}
                        placeholder="메모를 입력하세요"
                        style={[styles.memo, {
                          backgroundColor: '#fff',
                          padding: 10,
                          borderRadius: 10,
                          marginTop: 8,
                        }]}
                        multiline
                        textAlignVertical="top"
                      />
                      <TouchableOpacity onPress={handleSaveEdit} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>💾 저장하기</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.hashtags}>#{(d.hashtags || []).join(' #')}</Text>
                      <Text style={styles.memo}>{d.memo}</Text>
                    </View>
                  )}
                  {isMine && editingId !== d.id && (
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => handleEdit(d)}>
                        <Text style={{ color: '#42A5F5' }}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(d.id)}>
                        <Text style={{ color: 'red' }}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}

            <Modal visible={modalVisible} transparent>
              <View style={styles.modalContainer}>
                <Image source={{ uri: selectedImage ?? '' }} style={styles.fullImage} resizeMode="contain" />
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          </ScrollView>
        </TouchableWithoutFeedback>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#FF7043',
    fontWeight: '600',
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  calendarToggle: {
    backgroundColor: '#FFE0B2',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarToggleText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  calendar: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  noData: {
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
    elevation: 2,
  },
  thumbnail: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginRight: 10,
  },
  hashtags: {
    marginTop: 8,
    fontWeight: '600',
    color: '#1E88E5',
  },
  memo: {
    marginTop: 4,
    color: '#444',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  closeText: {
    fontWeight: 'bold',
    color: '#000',
  },
  saveButton: {
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: '#C8E6C9',
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#00796B',
    fontWeight: 'bold',
  },
});
