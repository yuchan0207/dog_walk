'use client';

import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

type DogLocation = {
  id: string;
  dog_id: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  dog_name: string | null;
  breed: string | null;
  age: number | null;
  owner_id: string;
};

type DogWithDistance = DogLocation & { distance: number };

export default function ExploreScreen() {
  const user = useUser();
  const router = useRouter();

  const [dogLocations, setDogLocations] = useState<DogLocation[]>([]);
  const [dogsWithDistance, setDogsWithDistance] = useState<DogWithDistance[]>([]);
  const [anchorLocation, setAnchorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [anchorSource, setAnchorSource] = useState<'mydog' | 'home' | 'none'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // ✅ 하버사인 거리 계산 (미터)
  const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ✅ (1) 가장 최근 등록한 "내 강아지" 1마리 id → 그 강아지 위치를 anchor로
  const fetchMyDogAnchor = async () => {
    if (!user?.id) return null;

    // 1) 내 강아지 중 최신 등록 1마리
    const { data: recentDog, error: dogErr } = await supabase
      .from('dog_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dogErr) {
      console.log('🐶 최근 강아지 조회 에러:', dogErr.message, dogErr);
      return null;
    }
    if (!recentDog?.id) return null;

    // 2) 그 강아지의 위치(뷰에서 1건)
    const { data: loc, error: locErr } = await supabase
      .from('locations_public')
      .select('latitude, longitude')
      .eq('dog_id', recentDog.id)
      .limit(1)
      .maybeSingle();

    if (locErr) {
      console.log('📍 최근 강아지 위치 조회 에러:', locErr.message, locErr);
      return null;
    }
    if (!loc || loc.latitude == null || loc.longitude == null) return null;

    return { latitude: loc.latitude, longitude: loc.longitude };
  };

  // ✅ (2) 집 위치 anchor (폴백)
  const fetchHomeAnchor = async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('user_home_locations')
      .select('latitude, longitude')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) // updated_at 없을 수 있어 created_at 사용
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log('🏠 집 위치 조회 에러:', error.message, error);
      return null;
    }
    if (!data || data.latitude == null || data.longitude == null) return null;

    return { latitude: data.latitude, longitude: data.longitude };
  };

  // ✅ 전체 강아지 위치(목록)
  const fetchDogLocations = async () => {
    const { data, error } = await supabase
      .from('locations_public')
      .select('id, latitude, longitude, image_url, dog_name, breed, age, owner_id, dog_id');

    if (error) {
      console.error(error);
      Alert.alert('데이터 불러오기 실패', error.message);
      setDogLocations([]);
    } else {
      setDogLocations((data ?? []) as unknown as DogLocation[]);
    }
  };

  // ✅ anchor + 리스트 초기 로드
  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) 가장 최근 등록한 내 강아지 기준 anchor
      const myDogAnchor = await fetchMyDogAnchor();
      if (myDogAnchor) {
        setAnchorLocation(myDogAnchor);
        setAnchorSource('mydog');
      } else {
        // 2) 없으면 집 위치로 폴백
        const homeAnchor = await fetchHomeAnchor();
        if (homeAnchor) {
          setAnchorLocation(homeAnchor);
          setAnchorSource('home');
        } else {
          setAnchorLocation(null);
          setAnchorSource('none');
        }
      }

      await fetchDogLocations();
      setLoading(false);
    })();
  }, [user?.id]);

  // ✅ 거리 + 검색 필터
  useEffect(() => {
    if (!dogLocations || dogLocations.length === 0) {
      setDogsWithDistance([]);
      return;
    }

    const withDistance: DogWithDistance[] = dogLocations.map((dog) => {
      const dist = anchorLocation
        ? distanceMeters(anchorLocation.latitude, anchorLocation.longitude, dog.latitude, dog.longitude)
        : Number.POSITIVE_INFINITY;
      return { ...dog, distance: dist };
    });

    const q = searchQuery.trim().toLowerCase();
    const searched = q.length
      ? withDistance.filter((d) => (d.breed ?? '').toLowerCase().includes(q))
      : withDistance;

    // 반경 5km 필터(기준점 있을 때만)
    const radiusFiltered = anchorLocation
      ? searched.filter((d) => d.distance < 5000)
      : searched;

    const sorted = radiusFiltered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    setDogsWithDistance(sorted);

    // 디버깅 로그
    console.log('🐶 전체 강아지:', dogLocations.length);
    console.log('🎯 기준점(source):', anchorSource, anchorLocation);
    console.log('🔍 검색어:', q);
    console.log(
      '✅ 최종 리스트:',
      sorted.map((d) => ({
        id: d.id,
        breed: d.breed,
        distance: isFinite(d.distance) ? Math.round(d.distance) : '∞',
      })),
    );
  }, [dogLocations, anchorLocation, searchQuery, anchorSource]);

  if (loading) {
    return <Text>로딩 중...</Text>;
  }

  const goDetail = (ownerId: string, dogId: string) => {
    router.push({
      pathname: '/request-detail-profile',
      params: { userId: ownerId, dogId, from: 'explore' },
    });
  };

  return (
    <View style={styles.container}>
      {/* 기준점 안내 배너 */}
      {anchorSource === 'mydog' && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>🎯 기준: 내 최근 등록 강아지</Text>
          <Text style={styles.bannerText}>반경 5km 안의 강아지만 보여줘요.</Text>
        </View>
      )}
      {anchorSource === 'home' && (
        <View style={styles.bannerAlt}>
          <Text style={styles.bannerTitle}>🎯 기준: 내 집 위치</Text>
          <Text style={styles.bannerText}>내 강아지 위치가 없어 집 위치로 비교했어요.</Text>
        </View>
      )}
      {anchorSource === 'none' && (
        <View style={styles.bannerWarn}>
          <Text style={styles.bannerTitle}>⚠️ 기준 위치가 없어요</Text>
          <Text style={styles.bannerText}>거리 계산 없이 전체 목록을 보여줘요.</Text>
        </View>
      )}

      <TextInput
        placeholder="견종 검색 (예: 푸들)"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
      />

      <FlatList
        data={dogsWithDistance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            {/* 이미지 크래시 가드 */}
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>🖼️</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.dog_name ?? '-'}</Text>
              <Text style={styles.itemSub}>
                {item.breed ?? '-'} / {item.age ?? '-'}살
              </Text>
              <Text style={styles.itemMeta}>
                {isFinite(item.distance) ? `${Math.round(item.distance)}m` : '기준 위치 없음'}
              </Text>

              <TouchableOpacity onPress={() => goDetail(item.owner_id, item.dog_id)} style={{ marginTop: 4 }}>
                <Text style={styles.link}>상세 보기 →</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.rowOverlay} onPress={() => goDetail(item.owner_id, item.dog_id)} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text>근처 강아지가 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  itemRow: {
    position: 'relative',
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    alignItems: 'center',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSub: {
    marginTop: 2,
    color: '#333',
  },
  itemMeta: {
    marginTop: 2,
    color: '#666',
    fontSize: 13,
  },
  link: {
    marginTop: 4,
    color: '#FF7043',
    fontWeight: '600',
  },
  rowOverlay: {
    position: 'absolute',
    inset: 0,
  },

  // 배너 스타일
  banner: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    marginBottom: 12,
  },
  bannerAlt: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    marginBottom: 12,
  },
  bannerWarn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    marginBottom: 12,
  },
  bannerTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerText: {
    color: '#555',
  },
});
