'use client';

import { decode } from 'base64-arraybuffer';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';

export default function HistoryScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [imageAssets, setImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [memo, setMemo] = useState('');
  const [hashtags, setHashtags] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) setImageAssets(result.assets);
  };

  const uploadDiary = async () => {
    if (imageAssets.length === 0) return Alert.alert('이미지를 올려주세요');
    try {
      setUploading(true);
      const urls: string[] = [];

      for (const image of imageAssets) {
        const fileName = `${Date.now()}_${Math.random()}.jpg`;
        const { error } = await supabase.storage.from('dog-images').upload(`${dogId}/${fileName}`, decode(image.base64!), {
          contentType: 'image/jpeg',
        });
        if (error) throw error;

        const { data } = supabase.storage.from('dog-images').getPublicUrl(`${dogId}/${fileName}`);
        urls.push(data.publicUrl);
      }

      const payload = {
        date: selectedDate,
        image_urls: urls,
        hashtags: hashtags.split(/[#\s]+/).filter(Boolean),
        memo,
      };

      if (editingId) {
        await supabase.from('dog_histories').update(payload).eq('id', editingId);
        setEditingId(null);
      } else {
        await supabase.from('dog_histories').insert({ dog_id: dogId, ...payload });
      }

      Alert.alert('성공', '일지가 저장되었습니다');
      setImageAssets([]);
      setMemo('');
      setHashtags('');
      fetchDiaries();
    } catch (e) {
      console.error(e);
      Alert.alert('업로드 실패', '다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  const fetchDiaries = async () => {
    const { data, error } = await supabase
      .from('dog_histories')
      .select('*')
      .eq('dog_id', dogId)
      .order('date', { ascending: false });
    if (!error && data) setDiaries(data);
  };

  const handleEdit = (diary: any) => {
    setEditingId(diary.id);
    setSelectedDate(diary.date);
    setMemo(diary.memo);
    setHashtags((diary.hashtags || []).join(' '));
    setImageAssets((diary.image_urls || []).map((url: string) => ({ uri: url })));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('dog_histories').delete().eq('id', id);
    Alert.alert('삭제 완료', '일지가 삭제되었습니다');
    fetchDiaries();
  };

  useEffect(() => {
    fetchDiaries();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFF8F0', padding: 20 }}>
      <Text style={styles.title}>🐶 강아지 일지</Text>

      <Calendar
        markedDates={{ [selectedDate]: { selected: true, marked: true, selectedColor: '#FFA726' } }}
        onDayPress={(day) => setSelectedDate(day.dateString)}
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
        style={{
          borderRadius: 12,
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          marginBottom: 20,
        }}
      />

      <Text style={styles.label}>📸 사진</Text>
      <TouchableOpacity onPress={pickImage} style={styles.pickButton}>
        <Text>사진 선택</Text>
      </TouchableOpacity>
      <FlatList
        data={imageAssets}
        horizontal
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={styles.thumbnail} />
        )}
        style={{ marginVertical: 10 }}
      />

      <Text style={styles.label}>🏷 해시태그</Text>
      <TextInput
        value={hashtags}
        onChangeText={setHashtags}
        placeholder="#산책 #귀여움"
        style={styles.input}
      />

      <Text style={styles.label}>📝 메모</Text>
      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="짧은 글을 남겨보세요"
        style={styles.input}
        multiline
      />

      <TouchableOpacity onPress={uploadDiary} disabled={uploading} style={[styles.submitBtn, uploading && { opacity: 0.5 }]}>
        <Text style={styles.submitText}>{uploading ? '업로드 중...' : editingId ? '수정하기' : '저장하기'}</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { marginTop: 30 }]}>📖 기록들</Text>

      {/* 👀 일지 구경용 버튼 추가 */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/history-view', params: { dogId } })}
        style={styles.viewOnlyButton}
      >
        <Text style={styles.viewOnlyText}>👀 내 일지 모아보기</Text>
      </TouchableOpacity>

      {diaries.map((d) => (
        <View key={d.id} style={styles.card}>
          <Text style={{ fontWeight: 'bold' }}>{d.date}</Text>
          <FlatList
            horizontal
            data={d.image_urls}
            keyExtractor={(u) => u}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.thumbnail} />
            )}
          />
          <Text style={{ marginTop: 6 }}>#{(d.hashtags || []).join(' #')}</Text>
          <Text>{d.memo}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => handleEdit(d)}>
              <Text style={{ color: '#42A5F5' }}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(d.id)}>
              <Text style={{ color: 'red' }}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontWeight: '600', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  pickButton: {
    backgroundColor: '#FFD180',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#FFA726',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: { color: '#fff', fontWeight: '700' },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    elevation: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  viewOnlyButton: {
    backgroundColor: '#E0F2F1',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewOnlyText: {
    color: '#00796B',
    fontWeight: '600',
  },
});
