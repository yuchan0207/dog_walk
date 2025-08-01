'use client';

import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type DogProfile = {
  id: string;
  name: string | null;
  breed: string | null;
  age: number | null;
  gender: string | null;
  image_url: string | null;
  owner_id: string;
};

type Location = {
  dog_id: string;
  latitude: number | null;
  longitude: number | null;
};

type DogWithLocation = DogProfile & {
  location?: Location;
};

type DogWithDistance = DogWithLocation & {
  distance: number;
};

export default function ExploreScreen() {
  const user = useUser();
  const router = useRouter();

  const [dogsData, setDogsData] = useState<DogProfile[]>([]);
  const [locationsData, setLocationsData] = useState<Location[]>([]);
  const [dogsWithDistance, setDogsWithDistance] = useState<DogWithDistance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [home, setHome] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // 데이터 불러오기
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.id) return;

      // 내 집 위치 불러오기
      const { data: homeData, error: homeError } = await supabase
        .from('user_home_locations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (homeError || !homeData) {
        Alert.alert('오류', '내 집 위치가 설정되어 있지 않습니다.');
        return;
      }

      setHome({
        latitude: homeData.latitude ?? null,
        longitude: homeData.longitude ?? null,
      });

      // 강아지 정보 + 위치
      const { data: dogs } = await supabase.from('dog_profiles').select('*');
      const { data: locations } = await supabase.from('locations').select('*');

      setDogsData(dogs ?? []);
      setLocationsData(locations ?? []);
    };

    fetchData();
  }, [user]);

  // 거리 계산 + 필터링
  useEffect(() => {
    const dogsWithLoc = dogsData
      .map((dog) => {
        const loc = locationsData.find((l) => l.dog_id === dog.id);

        if (
          !loc ||
          loc.latitude == null || loc.longitude == null ||
          home.latitude == null || home.longitude == null
        ) return null;

        const distance = getDistance(home.latitude, home.longitude, loc.latitude, loc.longitude);

        return {
          ...dog,
          location: loc,
          distance,
        };
      })
      .filter(Boolean) as DogWithDistance[];

    const filtered = dogsWithLoc
      .filter((dog) => !searchQuery || dog.breed?.includes(searchQuery))
      .sort((a, b) => a.distance - b.distance);

    setDogsWithDistance(filtered);
  }, [dogsData, locationsData, searchQuery, home]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dx = lat1 - lat2;
    const dy = lon1 - lon2;
    return Math.sqrt(dx * dx + dy * dy) * 100000;
  };

  const handlePress = (dogId: string) => {
    router.push(`/view?dogId=${dogId}`);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="견종을 검색해보세요"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={dogsWithDistance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handlePress(item.id)}>
            <Image
              source={{ uri: item.image_url || 'https://place-puppy.com/100x100' }}
              style={styles.image}
            />
            <View style={styles.infoBox}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.breed}>{item.breed}</Text>
              <Text style={styles.distance}>{Math.round(item.distance)}m 거리</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#fff',
    marginTop: 40,
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    backgroundColor: '#eee',
  },
  infoBox: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  breed: {
    fontSize: 14,
    color: '#555',
  },
  distance: {
    fontSize: 12,
    color: '#999',
  },
});
