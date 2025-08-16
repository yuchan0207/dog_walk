'use client';

import Slider from '@react-native-community/slider';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

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
      setCustomBreed((breedInput ?? '').trim());
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
    try {
      console.log('📤 [storage] 업로드 시작', fileName);
      const base64Data = base64Uri.split(',')[1];
      if (!base64Data) throw new Error('잘못된 base64 URI');

      const buffer = decode(base64Data);
      const { data, error } = await supabase.storage
        .from('dog-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('dog-images')
        .getPublicUrl(fileName);

      if (!publicUrl?.publicUrl) throw new Error('public URL 생성 실패');

      console.log('✅ [storage] 업로드 완료', publicUrl.publicUrl);
      return publicUrl.publicUrl;
    } catch (e: any) {
      console.error('❌ [storage] 업로드 실패:', e?.message || e);
      throw e;
    }
  };


  const uploadDog = async () => {
    console.log('🚀 업로드 시작');
    // 0) 사용자
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('로그인 정보 불러오기 실패', '다시 로그인해주세요.');
      return;
    }

    // 1) 커스텀 견종 확정 로직을 검증 이전에 반영
    let finalBreedInput = breedInput;
    let finalSelectedBreed = selectedBreed;

    if (customBreedMode && customBreed.trim()) {
      finalSelectedBreed = customBreed.trim();
      finalBreedInput = finalSelectedBreed;
    }

    // 2) 필수값 검증
    if (!name || !finalSelectedBreed || !age || !gender || !imageUrl) {
      Alert.alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    setUploading(true);

    try {
      // 3) 로컬 상태 정리(드롭다운/견종 목록 동기화)
      if (!breeds.includes(finalSelectedBreed)) {
        setBreeds(prev => [...prev, finalSelectedBreed]);
      }
      setSelectedBreed(finalSelectedBreed);
      setBreedInput(finalBreedInput);
      if (customBreedMode) {
        setPendingCustomBreeds(prev => prev.includes(finalSelectedBreed) ? prev : [...prev, finalSelectedBreed]);
        setCustomBreed('');
        setCustomBreedMode(false);
      }

      // 4) 이미지 업로드(필요 시)
      let uploadedImageUrl = imageUrl;
      if (imageUrl.startsWith('data:image')) {
        uploadedImageUrl = await uploadBase64ToSupabase(
          imageUrl,
          `${user.id}_${Date.now()}.jpg`
        );
        setImageUrl(uploadedImageUrl);
      }

      // 5) 수정 모드
      if (isEdit && dogId) {
        console.log('✏️ 수정 모드 업데이트 시작', dogId);
        const { error } = await supabase
          .from('dog_profiles')
          .update({
            name,
            breed: finalSelectedBreed,
            age,
            gender,
            image_url: uploadedImageUrl,
          })
          .eq('id', dogId);

        if (error) throw new Error(`[dog_profiles] ${error.message}`);

        const { error: locErr } = await supabase
          .from('locations')
          .update({
            image_url: uploadedImageUrl,
            dog_name: name,
            breed: finalSelectedBreed,
            age: String(age),
          })
          .eq('dog_id', dogId);

        if (locErr) throw new Error(`[locations] ${locErr.message}`);

        Alert.alert('수정 완료', '강아지 정보가 수정되었습니다.');
        router.push('/');
        return;
      }

      // 6) 신규 등록
      const newDogId = uuidv4();
      console.log('🆕 신규 등록 dog_id =', newDogId);

      // 6-1) dog_profiles
      const { error: insertError } = await supabase
        .from('dog_profiles')
        .insert({
          id: newDogId,
          owner_id: user.id,
          name,
          breed: finalSelectedBreed,
          age,
          gender,
          image_url: uploadedImageUrl,
        });

      if (insertError) throw new Error(`[dog_profiles] ${insertError.message}`);

      // 6-2) 집 위치
      const { data: homeData, error: homeError } = await supabase
        .from('user_home_locations')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .single();

      if (homeError || !homeData) {
        throw new Error('내 집 위치가 설정되지 않았습니다. 마이페이지에서 먼저 설정해주세요.');
      }

      // 6-3) locations upsert
      //  ⚠️ 실제 유니크 인덱스가 'dog_id'로 되어있는지 확인!
      //  만약 unique(user_id)라면 onConflict를 'user_id'로 바꿔야 합니다.
      console.log('📍 locations upsert 시작');
      const { error: upsertErr } = await supabase
        .from('locations')
        .upsert(
          {
            user_id: user.id,
            owner_id: user.id,
            dog_id: newDogId,
            latitude: homeData.latitude,
            longitude: homeData.longitude,
            image_url: uploadedImageUrl,
            dog_name: name,
            breed: finalSelectedBreed,
            age: String(age),
          },
          { onConflict: 'dog_id' }
        );

      if (upsertErr) {
        // 여기에서 자주 막힘 → 인덱스 불일치나 유니크 충돌 가능성
        throw new Error(`[locations] ${upsertErr.message}`);
      }
      console.log('✅ locations upsert 완료');

      // 6-4) dog_images (실패해도 치명적 X)
      const { error: imageInsertError } = await supabase
        .from('dog_images')
        .insert([{
          dog_id: newDogId,
          image_url: uploadedImageUrl,
          uploaded_at: new Date().toISOString(),
          user_id: user.id,
        }]);
      if (imageInsertError) {
        console.warn('⚠️ dog_images insert 실패:', imageInsertError.message);
      }

      Alert.alert('등록 완료', '강아지 정보가 등록되었습니다.');
      router.push('/');
    } catch (e: any) {
      console.error('❌ 업로드 실패:', e?.message || e);
      Alert.alert('업로드 실패', e?.message ?? '알 수 없는 오류가 발생했습니다.');
    } finally {
      // ✅ 어떤 경로로 끝나든 스피너 해제
      setUploading(false);
      console.log('🏁 업로드 종료');
    }
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
                  autoFocus
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