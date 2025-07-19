'use client';

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: dogList } = await supabase
        .from('dog_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      setProfile(profileData);
      setName(profileData?.name ?? '');
      setAge(profileData?.age?.toString() ?? '');
      setGender(profileData?.gender ?? '');
      setDogs(dogList ?? []);
      setLoading(false);
    })();
  }, []);

  const saveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('로그인 정보 없음');
      return;
    }

    const numericAge = parseInt(age);
    if (isNaN(numericAge)) {
      Alert.alert('나이를 올바르게 입력해주세요.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name, age: numericAge, gender })
      .eq('id', user.id);

    if (error) {
      Alert.alert('수정 실패', error.message);
    } else {
      Alert.alert('저장 완료', '프로필이 저장되었습니다.');
      setEditMode(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>👤 내 정보</Text>

      <View style={styles.section}>
        <Text style={styles.label}>이름</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={editMode}
          style={[styles.input, !editMode && styles.disabledInput]}
        />

        <Text style={styles.label}>나이</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          editable={editMode}
          keyboardType="numeric"
          style={[styles.input, !editMode && styles.disabledInput]}
        />

        <Text style={styles.label}>성별</Text>
        <TextInput
          value={gender}
          onChangeText={setGender}
          editable={editMode}
          style={[styles.input, !editMode && styles.disabledInput]}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={editMode ? saveProfile : () => setEditMode(true)}
        >
          <Text style={styles.buttonText}>
            {editMode ? '저장하기' : '수정하기'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>🐶 내가 올린 강아지</Text>
      {dogs.length === 0 ? (
        <Text style={styles.noDog}>등록된 강아지가 없습니다.</Text>
      ) : (
        dogs.map((dog) => (
          <View key={dog.id} style={styles.dogItem}>
            <Image source={{ uri: dog.image_url }} style={styles.dogImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dogName}>{dog.name}</Text>
              <Text>{dog.breed} / {dog.age}살</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/view', params: { dogId: dog.id } })}
              >
                <Text style={styles.link}>상세 보기 →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 80, // 위로 더 내림
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 16,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 4,
  },
  disabledInput: {
    backgroundColor: '#f2f2f2',
    color: '#888',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#FF7043',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  noDog: {
    fontStyle: 'italic',
    color: '#888',
  },
  dogItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
  },
  dogImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  dogName: {
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    marginTop: 4,
    color: '#FF7043',
    fontWeight: '600',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
