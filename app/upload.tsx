'use client';

import Slider from '@react-native-community/slider';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import 'react-native-url-polyfill/auto';
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
  const params = useLocalSearchParams();
  const isEdit = params.mode === 'edit' || params.edit === '1';
  const dogId = params.dogId as string | undefined;

  const [name, setName] = useState(params.name as string || '');
  const [age, setAge] = useState(params.age ? parseInt(params.age as string) : 1);
  const [gender, setGender] = useState(params.gender as string || '');
  const [breedInput, setBreedInput] = useState(params.breed as string || '');
  const [breeds, setBreeds] = useState(initialBreeds);
  const [filteredBreeds, setFilteredBreeds] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState(params.breed as string || '');
  const [customBreed, setCustomBreed] = useState('');
  const [customBreedMode, setCustomBreedMode] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>((params.imageUrl as string) || null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCustomBreeds, setPendingCustomBreeds] = useState<string[]>([]);

  const breedInputRef = useRef<TextInput>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (customBreedMode) {
      setShowDropdown(false);
      return;
    }

    const trimmedInput = (breedInput ?? '').trim();

    if (trimmedInput.length === 0) {
      setShowDropdown(false); // 입력 없으면 드롭다운 숨김
      return;
    }

    const matches = breeds.filter((b) =>
      b.toLowerCase().startsWith(trimmedInput.toLowerCase())
    );

    const showCustom =
      !pendingCustomBreeds.includes(trimmedInput) &&
      !breeds.includes(trimmedInput);

    const newFiltered = [...matches];

    if (showCustom) {
      newFiltered.push('기타'); // 항상 기타 추가 (중복 방지됨)
    }

    setFilteredBreeds(newFiltered);
    setShowDropdown(newFiltered.length > 0);
  }, [breedInput, breeds, customBreedMode, pendingCustomBreeds]);

  const handleBreedSelect = (breed: string) => {
    if (breed === '기타') {
      setSelectedBreed('기타');
      setBreedInput('기타');
      setCustomBreedMode(true);
      breedInputRef.current?.blur();
    } else {
      setBreedInput(breed);
      setSelectedBreed(breed);
      setCustomBreedMode(false);
      setTimeout(() => {
        setShowDropdown(false);
        breedInputRef.current?.blur();
      }, 50);
    }
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

  const uploadBase64ToSupabase = async (base64Uri: string, fileName: string) => {
    const base64Data = base64Uri.split(',')[1];
    const buffer = decode(base64Data);

    const { data, error } = await supabase.storage
      .from('dog-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from('dog-images').getPublicUrl(fileName);
    return publicUrl.publicUrl;
  };

  const uploadDog = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Alert.alert('로그인 정보 불러오기 실패', '다시 로그인해주세요.');
    }

    if (!name || !selectedBreed || !age || !gender || !imageUrl) {
      return Alert.alert('모든 필수 정보를 입력해주세요.');
    }

    setUploading(true);

    if (customBreedMode && customBreed.trim()) {
      setSelectedBreed(customBreed);
      setBreedInput(customBreed);
      setPendingCustomBreeds((prev) => [...prev, customBreed]);
    }

    if (!breeds.includes(selectedBreed)) {
      setBreeds((prev) => [...prev, selectedBreed]);
    }

    let uploadedImageUrl = imageUrl;
    // base64로 새로 선택한 경우만 업로드 수행
    if (imageUrl?.startsWith('data:image')) {
      try {
        uploadedImageUrl = await uploadBase64ToSupabase(imageUrl, `${user.id}_${Date.now()}.jpg`);
      } catch (e) {
        console.error('이미지 업로드 에러:', e);
        setUploading(false);
        return Alert.alert('이미지 업로드 실패', '다시 시도해주세요.');
      }
    }


    setImageUrl(uploadedImageUrl);

    if (isEdit && dogId) {
      const { error } = await supabase
        .from('dog_profiles')
        .update({
          name,
          breed: selectedBreed,
          age: age,
          gender,
          image_url: uploadedImageUrl,
        })
        .eq('id', dogId);

      if (error) {
        setUploading(false);
        return Alert.alert('수정 실패', error.message);
      }

      await supabase
        .from('locations')
        .update({
          image_url: uploadedImageUrl,
          dog_name: name,
          breed: selectedBreed,
          age: String(age),
        })
        .eq('dog_id', dogId);

      Alert.alert('수정 완료', '강아지 정보가 수정되었습니다.');
      setUploading(false);
      return router.push('/');
    }

    const { error: insertError, data } = await supabase
      .from('dog_profiles')
      .insert({
        owner_id: user.id,
        name,
        breed: selectedBreed,
        age: age,
        gender,
        image_url: uploadedImageUrl,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      setUploading(false);
      return Alert.alert('등록 실패', insertError?.message ?? '알 수 없는 오류');
    }

    const newDogId = data.id;

    const { data: homeData, error: homeError } = await supabase
      .from('user_home_locations')
      .select('latitude, longitude')
      .eq('user_id', user.id)
      .single();

    if (homeError || !homeData) {
      setUploading(false);
      return Alert.alert('위치 오류', '내 집 위치가 설정되지 않았습니다. 마이페이지에서 먼저 설정해주세요.');
    }


    console.log("🔥 user.id 확인:", user.id);
    const { error: locInsertError } = await supabase
      .from('locations')
      .upsert({
        user_id: user.id,
        owner_id: user.id,
        dog_id: newDogId,
        latitude: homeData.latitude,
        longitude: homeData.longitude,
        image_url: uploadedImageUrl,
        dog_name: name,
        breed: selectedBreed,
        age: String(age),
      }, { onConflict: 'dog_id' });

    if (locInsertError) {
      console.error('❌ locations upsert 실패:', locInsertError.message);
      Alert.alert('위치 등록 실패', locInsertError.message);
      setUploading(false);
      return;
    }

    const { data: dogImageData, error: imageInsertError } = await supabase
      .from('dog_images')
      .insert([
        {
          dog_id: newDogId,
          image_url: uploadedImageUrl,
          uploaded_at: new Date().toISOString(),
          user_id: user.id, // ✅ 꼭 있어야 RLS 통과
        }
      ])
      .select();

    console.log("🔥 user.id 확인:", user.id);

    if (imageInsertError) {
      console.error('❌ dog_images insert 실패:', imageInsertError.message);
    } else if (!dogImageData || dogImageData.length === 0) {
      console.error('❗ dog_images insert 반환 없음');
    } else {
      console.log('✅ dog_images insert 성공:', dogImageData);
    }


    Alert.alert('등록 완료', '강아지 정보가 등록되었습니다.');
    setUploading(false);
    router.push('/');
  };

  const handleRemoveCustomBreed = (b: string) => {
    setPendingCustomBreeds(prev => prev.filter(item => item !== b));

    if (breedInput === b) setBreedInput('');
    if (selectedBreed === b) setSelectedBreed('');
    if (customBreed === b) setCustomBreed('');
    setCustomBreedMode(false);
    setShowDropdown(false);
  };



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>🐶 강아지 등록</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 10 }}>
              <Text style={{ color: '#FF7043', fontWeight: '600' }}>{'← 돌아가기'}</Text>
            </TouchableOpacity>

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
              ref={breedInputRef}
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
                      setShowDropdown(false);
                      breedInputRef.current?.blur();
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

            <Text style={styles.label}>나이: {age}살</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={1}
              maximumValue={25}
              step={1}
              value={age}
              onValueChange={setAge}
              minimumTrackTintColor="#FF7043"
              maximumTrackTintColor="#FFDAB9"
              thumbTintColor="#FF7043"
            />

            <TouchableOpacity
              onPress={uploadDog}
              disabled={uploading}
              style={[styles.uploadButton, uploading && { opacity: 0.5 }]}
            >
              <Text style={styles.uploadText}>
                {uploading ? '업로드 중...' : isEdit ? '수정하기' : '등록하기'}
              </Text>
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
