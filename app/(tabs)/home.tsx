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
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

type DogLocation = {
  id: string;
  dog_id?: string | null;
  user_id: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  dog_name?: string | null;
  breed?: string | null;
  age?: string | null;
  owner_id: string | null;
};

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [dogLocations, setDogLocations] = useState<DogLocation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  const fetchDogs = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, latitude, longitude, image_url, dog_name, breed, age, owner_id, dog_id, user_id');

    if (error) {
      console.error(error);
      Alert.alert('데이터 불러오기 실패', error.message);
    } else {
      setDogLocations(data as DogLocation[]);
    }
    setLoading(false);
  };

  const checkUnreadMessages = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    const { data, error: msgError } = await supabase
      .from('messages')
      .select('id')
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (!msgError && data && data.length > 0) {
      setHasUnread(true);
    } else {
      setHasUnread(false);
    }
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
        await checkUnreadMessages();
      })();
    }, [])
  );

  const handleMarkerPress = (dog: DogLocation) => {
    if (!currentUserId) return;

    if (currentUserId === dog.owner_id) {
      return;
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
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation
        >
          {dogLocations.map((dog, index) => {
            if (!dog.latitude || !dog.longitude || !dog.image_url) return null;

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
                    borderColor: dog.owner_id === currentUserId ? '#42A5F5' : '#FF7043',
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

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.bottomButton} onPress={() => router.push('/upload')}>
            <Text style={styles.bottomButtonText}>강아지 업로드</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: '#6FCF97' }]}
            onPress={() => router.push('/chat-list')}
          >
            <Text style={styles.bottomButtonText}>
              채팅목록 보러가기{hasUnread ? ' 🔴' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  myLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 160,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    elevation: 2,
  },
  myLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  bottomButtonContainer: {
    position: 'absolute',
    bottom: 65,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomButton: {
    flex: 1,
    backgroundColor: '#FF7043',
    paddingVertical: 14,
    marginHorizontal: 5,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
