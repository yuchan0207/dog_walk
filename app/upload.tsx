// app/upload.tsx
'use client';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const initialBreeds = [
  '골든리트리버', '래브라도 리트리버', '푸들', '포메라니안', '불독', '말티즈', '치와와',
  '비글', '요크셔테리어', '시베리안 허스키', '웰시코기', '도베르만', '닥스훈트', '보더콜리',
  '시추', '프렌치 불독', '아키타', '시바견', '퍼그', '그레이트 데인', '로트와일러',
  '비숑프리제', '사모예드', '차우차우', '코커 스패니얼', '보르조이', '진돗개', '풍산개',
  '삽살개', '테리어 믹스', '믹스견', '골든두들', '말티푸', '토이 푸들', '미니어처 푸들',
  '잭 러셀 테리어', '페키니즈', '버니즈 마운틴 도그', '불마스티프', '달마시안', '오스트레일리안 셰퍼드',
  '파피용', '바셋하운드', '블랙 러시안 테리어', '이탈리안 그레이하운드', '도사견',
  '한국 토종개', '코리아 진도 독', '하바네즈', '미니어처 슈나우저', '스피츠',
];

const genders = ['수컷', '암컷'];

export default function UploadScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [breedInput, setBreedInput] = useState('');
  const [breeds, setBreeds] = useState(initialBreeds);
  const [filteredBreeds, setFilteredBreeds] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [customBreedMode, setCustomBreedMode] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCustomBreeds, setPendingCustomBreeds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const matches = breeds.filter((b) => b.startsWith(breedInput));
    const custom = breedInput.length > 0 ? ['기타'] : [];
    setFilteredBreeds([...matches, ...custom]);
    setShowDropdown(breedInput.length > 0);
  }, [breedInput, breeds]);

  const handleBreedSelect = (breed: string) => {
    if (breed === '기타') {
      setCustomBreedMode(true);
      setShowDropdown(false);
    } else {
      setBreedInput(breed);
      setSelectedBreed(breed);  // 이 줄이 있어야 한 번에 선택됨
      setShowDropdown(false);
      setCustomBreedMode(false);
    }
  };


  const handleRemoveCustomBreed = (breed: string) => {
    setPendingCustomBreeds(pendingCustomBreeds.filter((b) => b !== breed));
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const base64Image = result.assets[0].base64;
      const imageUri = `data:image/jpeg;base64,${base64Image}`;
      setImageUrl(imageUri);
      setModalVisible(false);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const base64Image = result.assets[0].base64;
      const imageUri = `data:image/jpeg;base64,${base64Image}`;
      setImageUrl(imageUri);
      setModalVisible(false);
    }
  };

  const uploadDog = async () => {
    if (!name || !selectedBreed || !age || !gender || !imageUrl) {
      return Alert.alert('모든 필수 정보를 입력해주세요.');
    }
    setUploading(true);

    const { data: insertData, error } = await supabase
      .from('dog_profiles')
      .insert({
        owner_id: user?.id,
        name,
        breed: selectedBreed,
        age: parseInt(age),
        gender,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error || !insertData) {
      setUploading(false);
      return Alert.alert('등록 실패', error?.message ?? '에러 발생');
    }

    // ✅ 내 집 위치 불러오기
    const { data: homeData, error: homeError } = await supabase
      .from('user_home_locations')
      .select('latitude, longitude')
      .eq('user_id', user?.id)
      .single();

    if (homeError || !homeData) {
      setUploading(false);
      return Alert.alert('위치 오류', '내 집 위치가 설정되지 않았습니다. 홈 화면에서 먼저 설정해주세요.');
    }

    await supabase.from('locations').insert({
      user_id: user?.id,
      owner_id: user?.id,
      dog_id: insertData.id,
      latitude: homeData.latitude,
      longitude: homeData.longitude,
      image_url: imageUrl,
      dog_name: name,
      breed: selectedBreed,
      age,
    });

    await supabase.from('dog_images').insert({
      dog_id: insertData.id,
      image_url: imageUrl,
    });

    Alert.alert('등록 완료', '강아지 정보가 등록되었습니다.');
    setUploading(false);
    router.push('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>🐶 강아지 등록</Text>

            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.imagePicker}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imageText}>사진 추가</Text>
              )}
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade">
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Pressable onPress={takePhoto} style={styles.modalButton}>
                    <Text>📷 사진 촬영</Text>
                  </Pressable>
                  <Pressable onPress={pickFromGallery} style={styles.modalButton}>
                    <Text>🖼 갤러리에서 선택</Text>
                  </Pressable>
                  <Pressable onPress={() => setModalVisible(false)} style={styles.modalButton}>
                    <Text style={{ color: 'red' }}>닫기</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <Text style={styles.label}>이름</Text>
            <TextInput value={name} onChangeText={setName} placeholder="이름 입력" style={styles.input} />

            <Text style={styles.label}>견종</Text>
            <TextInput
              value={breedInput}
              onChangeText={setBreedInput}
              placeholder="견종 입력"
              style={styles.input}
            />
            {showDropdown && (
              <View style={styles.dropdown}>
                <FlatList
                  data={filteredBreeds}
                  keyExtractor={(item) => item}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleBreedSelect(item)}>
                      <Text style={styles.dropdownItem}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {customBreedMode && (
              <View>
                <Text style={styles.label}>직접 입력</Text>
                <TextInput
                  value={customBreed}
                  onChangeText={setCustomBreed}
                  placeholder="견종 입력"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (customBreed.trim()) {
                      setSelectedBreed(customBreed);
                      setBreedInput(customBreed);
                      setPendingCustomBreeds([...pendingCustomBreeds, customBreed]);
                      setCustomBreed('');
                      setCustomBreedMode(false);
                    }
                  }}
                  style={styles.uploadButton}
                >
                  <Text style={styles.uploadText}>선택</Text>
                </TouchableOpacity>
              </View>
            )}

            {pendingCustomBreeds.length > 0 && (
              <View>
                <Text style={styles.label}>직접 추가한 견종</Text>
                {pendingCustomBreeds.map((b) => (
                  <View key={b} style={styles.customItem}>
                    <Text>{b}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCustomBreed(b)}>
                      <Text style={{ color: 'red' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>성별</Text>
            <View style={styles.optionsContainer}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.optionButton, gender === g && styles.selectedButton]}
                >
                  <Text>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>나이</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="숫자만 입력"
              keyboardType="numeric"
              style={styles.input}
            />

            <TouchableOpacity
              onPress={uploadDog}
              disabled={uploading}
              style={[styles.uploadButton, uploading && { opacity: 0.5 }]}
            >
              <Text style={styles.uploadText}>{uploading ? '업로드 중...' : '등록하기'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },
  imagePicker: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imageText: { color: '#888' },
  label: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    maxHeight: 200,
    marginBottom: 12,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  optionButton: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedButton: {
    backgroundColor: '#FFAB91',
  },
  uploadButton: {
    backgroundColor: '#FF7043',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: 250,
    alignItems: 'center',
  },
  modalButton: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  customItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFEFD5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
});