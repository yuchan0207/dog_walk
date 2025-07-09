'use client';

import { decode } from 'base64-arraybuffer';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function UploadScreen() {
  const router = useRouter();
  const { updateId } = useLocalSearchParams();
  const isUpdating = !!updateId;

  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [personality, setPersonality] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchDog = async () => {
      if (!updateId || typeof updateId !== 'string') return;

      const { data, error } = await supabase
        .from('dog_profiles')
        .select('*')
        .eq('id', updateId)
        .single();

      if (error || !data) return;

      setName(data.name);
      setBreed(data.breed);
      setAge(data.age?.toString() || '');
      setGender(data.gender);
      setHobbies(data.hobbies);
      setPersonality(data.personality);
      setImage(null); // 사진은 새로 선택해야 함
    };

    fetchDog();
  }, [updateId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('카메라 권한이 필요합니다.');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const uploadDog = async () => {
    if (!name || !breed || !age || !gender || !hobbies || !personality) {
      return Alert.alert('모든 정보를 입력해주세요!');
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // 위치 권한
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한이 필요합니다.');
      setUploading(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    let imageUrl = '';
    if (image?.base64) {
      const fileName = `${Date.now()}.jpg`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('dog-images')
        .upload(fileName, decode(image.base64), {
          contentType: 'image/jpeg',
        });
      if (storageError || !storageData) {
        Alert.alert('이미지 업로드 실패', storageError?.message);
        setUploading(false);
        return;
      }
      imageUrl = supabase.storage.from('dog-images').getPublicUrl(fileName).data.publicUrl;
    }

    if (isUpdating && typeof updateId === 'string') {
      // ✅ UPDATE
      const { error: updateError1 } = await supabase
        .from('dog_profiles')
        .update({
          name,
          breed,
          age: parseInt(age),
          gender,
          hobbies,
          personality,
          ...(imageUrl && { image_url: imageUrl }),
        })
        .eq('id', updateId);

      const { error: updateError2 } = await supabase
        .from('locations')
        .update({
          dog_name: name,
          breed,
          age: parseInt(age),
          latitude,
          longitude,
          ...(imageUrl && { image_url: imageUrl }),
          owner_id: user?.id, // ✅ 추가
        })
        .eq('user_id', user?.id); // 또는 eq('owner_id', user?.id)

      if (updateError1 || updateError2) {
        Alert.alert('업데이트 실패', updateError1?.message || updateError2?.message);
      } else {
        Alert.alert('수정 완료!', '홈으로 이동합니다.');
        router.push('/home');
      }
    } else {
      // ✅ INSERT
      const { data: newDog, error: dbError1 } = await supabase
        .from('dog_profiles')
        .insert([{
          owner_id: user?.id,
          name,
          breed,
          age: parseInt(age),
          gender,
          hobbies,
          personality,
          image_url: imageUrl,
        }])
        .select()
        .single();

      if (dbError1 || !newDog) {
        Alert.alert('등록 실패', dbError1?.message);
        setUploading(false);
        return;
      }

      const { error: dbError2 } = await supabase
        .from('locations')
        .insert([{
          user_id: user?.id,
          owner_id: user?.id, // ✅ 이 줄이 핵심!
          image_url: imageUrl,
          latitude,
          longitude,
          dog_name: name,
          breed,
          age: parseInt(age),
        }]);

      if (dbError2) {
        Alert.alert('위치 등록 실패', dbError2.message);
      } else {
        Alert.alert('등록 완료!', '홈에서 확인해보세요.');
        router.push('/home');
      }
    }

    setUploading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isUpdating ? '🐶 강아지 수정' : '🐶 강아지 등록'}</Text>

      <View style={styles.imageBox}>
        {image?.uri ? (
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
        ) : (
          <Text style={{ color: '#aaa' }}>사진을 선택하거나 찍어주세요</Text>
        )}
      </View>

      <View style={styles.imageButtons}>
        <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
          <Text style={styles.buttonText}>📁 갤러리</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
          <Text style={styles.buttonText}>📷 카메라</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="견종" value={breed} onChangeText={setBreed} />
      <TextInput style={styles.input} placeholder="나이 (숫자)" value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="성별" value={gender} onChangeText={setGender} />
      <TextInput style={styles.input} placeholder="취미" value={hobbies} onChangeText={setHobbies} />
      <TextInput style={styles.input} placeholder="성격" value={personality} onChangeText={setPersonality} />

      <TouchableOpacity
        style={[styles.button, uploading && { opacity: 0.5 }]}
        onPress={uploadDog}
        disabled={uploading}
      >
        <Text style={styles.buttonText}>
          {uploading ? '업로드 중...' : isUpdating ? '수정하기' : '등록하기'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    padding: 24,
    backgroundColor: '#FFF8F2',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF7043',
    marginBottom: 24,
    alignSelf: 'center',
  },
  imageBox: {
    height: 180,
    borderWidth: 1,
    borderColor: '#FFAB91',
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  smallButton: {
    backgroundColor: '#FFAB91',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderColor: '#FFAB91',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#FF7043',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
