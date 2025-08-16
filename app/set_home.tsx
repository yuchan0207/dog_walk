'use client';

import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { supabase } from '../lib/supabase';

type MarkerPosition = {
  latitude: number;
  longitude: number;
};

type HomeLocation = {
  user_id: string;
  latitude: number;
  longitude: number;
};

export default function SetHomeScreen() {
  const router = useRouter(); 
  const [region, setRegion] = useState<Region | null>(null);
  const [marker, setMarker] = useState<MarkerPosition | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ 추가: 지도 참조
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한이 필요합니다.');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      setUserId(uid);

      const { data: existing } = await supabase
        .from('user_home_locations')
        .select('*')
        .eq('user_id', uid)
        .single<HomeLocation>();

      if (existing) {
        const { latitude, longitude } = existing;
        setMarker({ latitude, longitude });
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        const { coords } = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    })();
  }, []);

  const saveHomeLocation = async () => {
    if (!marker || !userId) return;

    const { data: existing } = await supabase
      .from('user_home_locations')
      .select('*')
      .eq('user_id', userId)
      .single<HomeLocation>();

    let error;

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_home_locations')
        .update({
          latitude: marker.latitude,
          longitude: marker.longitude,
        })
        .eq('user_id', userId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('user_home_locations')
        .insert({
          user_id: userId,
          latitude: marker.latitude,
          longitude: marker.longitude,
        });
      error = insertError;
    }

    if (error) {
      Alert.alert('저장 실패', error.message);
    } else {
      Alert.alert('저장 완료', '우리 집 위치가 설정되었습니다.');
    }
  };

  // ✅ 추가: 내 위치로 이동
  const goToMyLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert('위치 권한이 필요합니다.');
          return;
        }
      }

      const { coords } = await Location.getCurrentPositionAsync({});
      const nextRegion: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(nextRegion);
      setMarker({ latitude: coords.latitude, longitude: coords.longitude });
      mapRef.current?.animateToRegion(nextRegion, 600);
    } catch (e) {
      Alert.alert('현재 위치를 가져올 수 없습니다.');
    }
  };

  if (!region) {
    return (
      <View style={styles.center}>
        <Text>지도를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ 돌아가기 버튼 */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← 돌아가기</Text>
      </TouchableOpacity>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setMarker({ latitude, longitude });
        }}
      >
        {marker && <Marker coordinate={marker} />}
      </MapView>

      {/* ✅ 내 위치 버튼 (기존 UI를 해치지 않도록 플로팅) */}
      <TouchableOpacity style={styles.myLocationButton} onPress={goToMyLocation}>
        <Text style={styles.myLocationText}>📍 내 위치</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <Button title="이 위치로 저장" onPress={saveHomeLocation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backText: {
    color: '#FF7043',
    fontWeight: '600',
    fontSize: 16,
  },
  // ✅ 추가: 내 위치 버튼 스타일
  myLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 110, // 저장 버튼 위에 겹치지 않게
    zIndex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myLocationText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
});
