'use client';

import * as Location from 'expo-location';
import { useRouter } from 'expo-router'; // ✅ 추가
import { useEffect, useState } from 'react';
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
  const router = useRouter(); // ✅ 추가
  const [region, setRegion] = useState<Region | null>(null);
  const [marker, setMarker] = useState<MarkerPosition | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
        style={styles.map}
        initialRegion={region}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setMarker({ latitude, longitude });
        }}
      >
        {marker && <Marker coordinate={marker} />}
      </MapView>

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
});
