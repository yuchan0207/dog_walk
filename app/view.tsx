'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const screenWidth = Dimensions.get('window').width;

type DogProfile = {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  hobbies: string;
  personality: string;
  created_at: string;
};

type DogImage = {
  id: string;
  dog_id: string;
  image_url: string;
};

type DogHistory = {
  id: string;
  dog_id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  hobbies: string;
  personality: string;
  image_url: string;
  created_at: string;
};

export default function ViewScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [images, setImages] = useState<DogImage[]>([]);
  const [histories, setHistories] = useState<DogHistory[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMyUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (dogId && myUserId !== null) {
      fetchDogInfo();
      fetchDogImages(dogId);
      fetchDogHistories(dogId);
    }
  }, [dogId, myUserId]);

  const fetchDogInfo = async () => {
    const { data, error } = await supabase
      .from('dog_profiles')
      .select('*')
      .eq('id', dogId)
      .single<DogProfile>();
    if (error || !data) {
      Alert.alert('불러오기 실패', '강아지 정보를 찾을 수 없습니다.');
      router.back();
      return;
    }
    setDog(data);
    setLoading(false);
  };

  const fetchDogImages = async (dogId: string) => {
    const { data } = await supabase
      .from('dog_images')
      .select('*')
      .eq('dog_id', dogId) as { data: DogImage[] | null; error: any };

    if (data) setImages(data);
  };

  const fetchDogHistories = async (dogId: string) => {
    const { data } = await supabase
      .from('dog_histories')
      .select('*')
      .eq('dog_id', dogId)
      .order('created_at', { ascending: false }) as { data: DogHistory[] | null; error: any };

    if (data) setHistories(data);
  };

  const requestWalk = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !dog) return;

    if (dog.owner_id === user.id) {
      Alert.alert('오류', '자신의 강아지에게는 산책 신청을 보낼 수 없습니다.');
      return;
    }

    const { data: myDog } = await supabase
      .from('dog_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    if (!myDog) {
      Alert.alert('먼저 내 강아지를 등록해주세요!');
      return;
    }

    await supabase
      .from('walk_requests')
      .delete()
      .eq('from_user_id', user.id)
      .eq('to_user_id', dog.owner_id)
      .eq('dog_id', myDog.id);

    const { error } = await supabase.from('walk_requests').insert({
      from_user_id: user.id,
      to_user_id: dog.owner_id,
      dog_id: myDog.id,
      status: 'pending',
    });

    if (error) {
      Alert.alert('신청 실패', error.message);
    } else {
      Alert.alert('신청 완료', '산책 신청을 보냈어요!');
      router.push('/home');
    }
  };

  const deleteDog = async () => {
    if (!dog) return;
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
        { text: '취소', onPress: () => resolve(false) },
        { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirm) return;

    await supabase.from('dog_profiles').delete().eq('id', dog.id);
    Alert.alert('삭제 완료');
    router.push('/home');
  };

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const isMine = !!dog && !!myUserId && dog.owner_id === myUserId;

  if (loading || !dog) {
    return (
      <View style={styles.center}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← 돌아가기</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🐶 {dog.name}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageContainer}>
        {images.map((img) => (
          <TouchableOpacity key={img.id} onPress={() => {
            setSelectedImage(img.image_url);
            setModalVisible(true);
          }}>
            <Image source={{ uri: img.image_url }} style={styles.image} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <InfoItem label="🐾 견종" value={dog.breed} />
        <InfoItem label="🎂 나이" value={`${dog.age}살`} />
        <InfoItem label="🚻 성별" value={dog.gender} />
        <InfoItem label="🎮 취미" value={dog.hobbies} />
        <InfoItem label="💖 성격" value={dog.personality} />
      </View>

      {isMine ? (
        <View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FFA726' }]}
            onPress={() => router.push({ pathname: '/upload', params: { updateId: dog.id } })}
          >
            <Text style={styles.buttonText}>수정하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF5252' }]}
            onPress={deleteDog}
          >
            <Text style={styles.buttonText}>삭제하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={requestWalk}>
          <Text style={styles.buttonText}>산책 신청하기</Text>
        </TouchableOpacity>
      )}

      {histories.length > 0 && (
        <View style={{ marginTop: 40 }}>
          <Text style={[styles.title, { fontSize: 22 }]}>📜 과거 정보 일지</Text>
          {histories.map((history) => (
            <View key={history.id} style={{ marginBottom: 24 }}>
              <Image
                source={{ uri: history.image_url }}
                style={[styles.image, { width: '100%', height: 180, borderRadius: 12 }]}
              />
              <Text style={{ marginTop: 8, color: '#999' }}>
                기록일: {new Date(history.created_at).toLocaleDateString()}
              </Text>
              <View style={{ marginTop: 8 }}>
                <InfoItem label="이름" value={history.name} />
                <InfoItem label="견종" value={history.breed} />
                <InfoItem label="나이" value={`${history.age}살`} />
                <InfoItem label="성별" value={history.gender} />
                <InfoItem label="취미" value={history.hobbies} />
                <InfoItem label="성격" value={history.personality} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={modalVisible} transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalContainer} onPress={() => setModalVisible(false)}>
          <Image
            source={{ uri: selectedImage ?? '' }}
            style={{ width: screenWidth - 40, height: 400, borderRadius: 12 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    padding: 24,
    backgroundColor: '#FFF8F2',
    flexGrow: 1,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#FF7043',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FF7043',
    marginBottom: 20,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  image: {
    width: 240,
    height: 180,
    borderRadius: 20,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
    paddingBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    fontSize: 16,
    color: '#555',
    width: '40%',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    width: '55%',
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#FF7043',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
});

