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
  created_at: string;
};

type DogImage = {
  id: string;
  dog_id: string;
  image_url: string;
};

export default function ViewScreen() {
  const { dogId, requestId } = useLocalSearchParams<{ dogId: string; requestId?: string }>();
  const router = useRouter();
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [images, setImages] = useState<DogImage[]>([]);
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
    if (dogId) {
      fetchDogImages(dogId);
    }
  }, [dogId]);

  useEffect(() => {
    if (dogId && myUserId !== null) {
      fetchDogInfo();
    }
  }, [dogId, myUserId]);

  const fetchDogInfo = async () => {
    const { data, error } = await supabase
      .from('dog_profiles')
      .select('id, name, breed, age, gender, created_at, owner_id') // 🔥 꼭 owner_id 포함
      .eq('id', dogId)
      .single();

    if (error || !data) {
      Alert.alert('불러오기 실패', '강아지 정보를 찾을 수 없습니다.');
      router.back();
      return;
    }

    console.log('✅ 불러온 dog 정보:', data); // ⬅ 로그로 확인
    setDog(data);
    setLoading(false);
  };


  const fetchDogImages = async (dogIdParam: string | string[]) => {
    const id = Array.isArray(dogIdParam) ? dogIdParam[0] : dogIdParam;

    // 1. locations의 대표 이미지 먼저 확인
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .select('image_url')
      .eq('dog_id', id)
      .single();

    if (locationData?.image_url) {
      setImages([{
        id: 'fallback',
        dog_id: id,
        image_url: locationData.image_url,
      }]);
      return;
    }

    // 2. 없으면 dog_images에서 가져오기
    const { data: imageData, error: imageError } = await supabase
      .from('dog_images')
      .select('id, dog_id, image_url')
      .eq('dog_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (imageData && imageData.length > 0 && imageData[0].image_url) {
      const cleaned = imageData.filter(img => img.image_url !== null) as DogImage[];
      setImages(cleaned);
      return;
    }

    console.error('대표 이미지 불러오기 실패:', imageError?.message || locationError?.message);
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

    // ✅ 1) 이미 보낸 '대기중' 요청이 있는지 먼저 확인
    const { data: existing, error: existErr } = await supabase
      .from('walk_requests')
      .select('id, status, created_at')
      .eq('from_user_id', user.id)
      .eq('to_user_id', dog.owner_id)
      .eq('my_dog_id', myDog.id)
      .eq('target_dog_id', dog.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existErr) {
      Alert.alert('신청 확인 실패', existErr.message);
      return;
    }

    if (existing && existing.status === 'pending') {
      Alert.alert('이미 신청됨', '이 상대에게 보낸 산책 신청이 대기중이에요.');
      return;
    }

    // (선택) 이미 수락된 적이 있다면 안내만 하고 끝낼 수도 있음
    // if (existing && existing.status === 'accepted') {
    //   Alert.alert('이미 수락됨', '이미 수락된 요청이 있어요. 채팅에서 이어가세요!');
    //   return;
    // }

    // ✅ 2) 새 요청 삽입
    const { error } = await supabase.from('walk_requests').insert({
      from_user_id: user.id,
      to_user_id: dog.owner_id,
      my_dog_id: myDog.id,
      target_dog_id: dog.id,
      status: 'pending',
    });

    if (error) {
      Alert.alert('신청 실패', error.message);
    } else {
      Alert.alert('신청 완료', '산책 신청을 보냈어요!');
      router.push('/home');
    }
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

      <View style={styles.singleImageWrapper}>
        <TouchableOpacity
          onPress={() => {
            setSelectedImage(images[0]?.image_url.trim());
            setModalVisible(true);
          }}
          style={styles.imageBox}
        >
          <Image
            source={{ uri: images[0]?.image_url.trim() }}
            style={styles.image}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <InfoItem label="🐾 견종" value={dog.breed} />
        <InfoItem label="🎂 나이" value={`${dog.age}살`} />
        <InfoItem label="🚻 성별" value={dog.gender} />
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4DB6AC' }]}
          onPress={() =>
            router.push({
              pathname: isMine ? '/history' : '/history-view',
              params: { dogId: dog.id },
            })
          }
        >
          <Text style={styles.buttonText}>📜 일지 보기</Text>
        </TouchableOpacity>

        {isMine ? (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#FFA726' }]}
              onPress={() =>
                router.push({
                  pathname: '/upload',
                  params: {
                    dogId: dog.id,
                    edit: '1',
                    name: dog.name,
                    breed: dog.breed,
                    gender: dog.gender,
                    age: String(dog.age),
                    imageUrl: images[0]?.image_url || '',
                  },
                })
              }
            >
              <Text style={styles.buttonText}>✏️ 수정하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#E57373' }]}
              onPress={() => {
                Alert.alert('정말 삭제하시겠어요?', '', [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                      await supabase.from('locations').delete().eq('dog_id', dog.id);
                      const { error } = await supabase.from('dog_profiles').delete().eq('id', dog.id);
                      if (error) {
                        Alert.alert('삭제 실패', error.message);
                      } else {
                        Alert.alert('삭제 완료');
                        router.replace('/home');
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.buttonText}>🗑️ 삭제하기</Text>
            </TouchableOpacity>
          </>
        ) : !requestId ? ( // ✅ requestId가 없을 때만 '산책 신청하기' 노출
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF7043' }]}
            onPress={requestWalk}
          >
            <Text style={styles.buttonText}>산책 신청하기</Text>
          </TouchableOpacity>
        ) : null}

      </View>

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
  singleImageWrapper: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: 260,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#ddd',
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
  buttonGroup: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
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
