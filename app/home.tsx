'use client';

import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { supabase } from '../lib/supabase';

type DogLocation = {
  id: string;
  dog_id?: string;
  user_id: string;
  latitude: number;
  longitude: number;
  image_url: string;
  dog_name?: string;
  breed?: string;
  age?: string;
  owner_id: string;
};

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [dogLocations, setDogLocations] = useState<DogLocation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const fetchDogs = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, latitude, longitude, image_url, dog_name, breed, age, owner_id, dog_id, user_id') as unknown as {
        data: DogLocation[],
        error: any
      };

    if (error) {
      console.error(error);
      Alert.alert('데이터 불러오기 실패', error.message);
    } else {
      setDogLocations(data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한이 필요합니다.');
          return;
        }

        const [loc, { data: userData }] = await Promise.all([
          Location.getCurrentPositionAsync({}),
          supabase.auth.getUser(),
        ]);

        const newRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        setCurrentUserId(userData.user?.id ?? null);
        await fetchDogs();
      })();
    }, [])
  );

  const handleMarkerPress = (dog: DogLocation) => {
    if (!currentUserId) return;

    if (currentUserId === dog.owner_id) {
      Alert.alert('강아지 관리', '어떤 작업을 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제하기',
          style: 'destructive',
          onPress: async () => {
            const imagePath = dog.image_url.split('/').pop();
            if (dog.dog_id) {
              await supabase.from('dog_profiles').delete().eq('id', dog.dog_id);
            }
            await supabase.from('locations').delete().eq('id', dog.id);
            if (imagePath) {
              await supabase.storage.from('dog-images').remove([imagePath]);
            }
            Alert.alert('삭제 완료', '강아지가 삭제되었습니다.');
            fetchDogs();
          },
        },
        {
          text: '갱신하기',
          onPress: () => {
            router.push({ pathname: '/upload', params: { updateId: dog.id } });
          },
        },
      ]);
    } else {
      if (dog.dog_id) {
        router.push({ pathname: '/view', params: { dogId: dog.dog_id } });
      } else {
        Alert.alert('오류', '해당 강아지 정보가 연결되지 않았습니다.');
      }
    }
  };

  const moveToMyLocation = async () => {
    const loc = await Location.getCurrentPositionAsync({});
    const newRegion = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  if (loading || !region) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7043" />
        <Text style={{ marginTop: 10 }}>지도를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation
      >
        {dogLocations.map((dog, index) => {
          const offset = 0.0001 * index;
          const coordinate = {
            latitude: dog.latitude + offset,
            longitude: dog.longitude + offset,
          };

          const scale = 0.01 / region.latitudeDelta;
          const imageSize = Math.min(Math.max(scale * 50, 40), 90);

          return (
            <Marker key={dog.id} coordinate={coordinate} onPress={() => handleMarkerPress(dog)}>
              <View
                style={{
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: '#FF7043',
                }}
              >
                <Image
                  source={{ uri: dog.image_url }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: imageSize / 2,
                  }}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <TouchableOpacity style={styles.myLocationButton} onPress={moveToMyLocation}>
        <Text style={styles.myLocationText}>내 위치</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/upload')}>
          <Text style={styles.buttonText}>강아지 업로드</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6FCF97' }]}
          onPress={() => router.push('/walk_requests')}
        >
          <Text style={styles.buttonText}>산책 신청함</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#FF7043',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    elevation: 3,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  myLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
  },
  myLocationText: { fontSize: 14, fontWeight: '500' },
});
