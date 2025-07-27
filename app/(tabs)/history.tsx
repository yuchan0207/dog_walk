// app/history.tsx
'use client';

import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';


const categoryOptions = [
  '자는 모습',
  '먹는 모습',
  '산책하는 모습',
  '가장 귀여운 순간',
  '노는 모습',
];

type Diary = {
  id: string;
  dog_id: string;
  date: string;
  category: string;
  memo: string;
  image_url: string;
};

export default function HistoryScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const [category, setCategory] = useState(categoryOptions[0]);
  const [memo, setMemo] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const handleDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
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

  useEffect(() => {
    fetchDiaries();
  }, [refreshFlag]);

  const uploadDiary = async () => {
    if (!image || !dogId) {
      Alert.alert('입력 오류', '사진과 dogId가 필요합니다.');
      return;
    }

    try {
      setUploading(true);
      const fileExt = image.uri.split('.').pop();
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${dogId}/${fileName}`; // ✅ dogId가 실제 값이면 정상


      const { error: uploadError } = await supabase.storage
        .from('dog-images')
        .upload(filePath, decode(image.base64!), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dog-images')
        .getPublicUrl(filePath);

      if (editingId) {
        await supabase
          .from('dog_histories')
          .update({ date: format(selectedDate, 'yyyy-MM-dd'), category, memo, image_url: publicUrl })
          .eq('id', editingId);
        setEditingId(null);
      } else {
        await supabase.from('dog_histories').insert({
          dog_id: dogId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          category,
          memo,
          image_url: publicUrl,
        });
      }

      Alert.alert('성공', '일지를 저장했습니다.');
      setImage(null);
      setMemo('');
      setCategory(categoryOptions[0]);
      setRefreshFlag(!refreshFlag);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '업로드 중 문제가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (diary: Diary) => {
    setEditingId(diary.id);
    setSelectedDate(new Date(diary.date));
    setCategory(diary.category);
    setMemo(diary.memo);
    setImage({ uri: diary.image_url } as any);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('dog_histories').delete().eq('id', id);
    Alert.alert('삭제 완료', '일지를 삭제했습니다.');
    setRefreshFlag(!refreshFlag);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🐶 강아지 일지</Text>

      <Text style={styles.label}>📅 날짜</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputBox}>
        <Text>{format(selectedDate, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Text style={styles.label}>📂 카테고리</Text>
      <View style={styles.categoryContainer}>
        {categoryOptions.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.category, category === opt && styles.selectedCategory]}
            onPress={() => setCategory(opt)}
          >
            <Text>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>📝 메모</Text>
      <TextInput
        style={styles.textArea}
        value={memo}
        onChangeText={setMemo}
        multiline
        numberOfLines={4}
        placeholder="메모를 입력하세요"
      />

      <Text style={styles.label}>📸 사진</Text>
      <View style={styles.imageRow}>
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Text>갤러리</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
          <Text>카메라</Text>
        </TouchableOpacity>
      </View>
      {image && (
        <Image source={{ uri: image.uri }} style={styles.previewImage} />
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={uploadDiary} disabled={uploading}>
        <Text style={styles.submitText}>{uploading ? '업로드 중...' : editingId ? '수정하기' : '저장하기'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>📖 등록된 일지</Text>
      {diaries.map((diary) => (
        <View key={diary.id} style={styles.diaryCard}>
          <Image source={{ uri: diary.image_url }} style={styles.diaryImage} />
          <Text style={styles.diaryText}>{diary.date} · {diary.category}</Text>
          <Text style={styles.diaryText}>{diary.memo}</Text>
          <View style={styles.diaryActions}>
            <TouchableOpacity onPress={() => handleEdit(diary)}>
              <Text style={styles.diaryActionText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(diary.id)}>
              <Text style={[styles.diaryActionText, { color: 'red' }]}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    padding: 20,
    paddingBottom: 60,
    backgroundColor: '#FFF8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  inputBox: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 6,
  },
  category: {
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectedCategory: {
    backgroundColor: '#FFDDC1',
  },
  textArea: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    height: 100,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  imageBtn: {
    backgroundColor: '#FFE0B2',
    padding: 10,
    borderRadius: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 10,
  },
  submitBtn: {
    backgroundColor: '#FFA726',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  diaryImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  diaryText: {
    marginTop: 6,
  },
  diaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  diaryActionText: {
    fontWeight: 'bold',
  },
});
