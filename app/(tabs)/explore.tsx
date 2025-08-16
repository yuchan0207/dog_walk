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

  // 🔐 안전한 유저 ID 얻기 (useUser가 null일 때 대비)
  const getUid = async () => {
    const { data } = await supabase.auth.getUser();
    return user?.id ?? data.user?.id ?? null;
  };

  // ✅ (1) 가장 최근 등록한 "내 강아지" 위치 anchor
  const fetchMyDogAnchor = async () => {
    const uid = await getUid();
    if (!uid) return null;

    const tryOwnerQuery = async (orderBy?: 'updated_at' | 'created_at') => {
      let q = supabase
        .from('locations_public')
        .select('latitude, longitude')
        .eq('owner_id', uid);

      if (orderBy) q = q.order(orderBy, { ascending: false });

      const { data, error } = await q.limit(1).maybeSingle();
      if (!error && data?.latitude != null && data?.longitude != null) {
        return { latitude: data.latitude, longitude: data.longitude };
      }
      return null;
    };

    const ownerByUpdated = await tryOwnerQuery('updated_at');
    if (ownerByUpdated) return ownerByUpdated;

    const ownerByCreated = await tryOwnerQuery('created_at');
    if (ownerByCreated) return ownerByCreated;

    const ownerAny = await (async () => {
      const { data } = await supabase
        .from('locations_public')
        .select('latitude, longitude')
        .eq('owner_id', uid)
        .limit(1)
        .maybeSingle();
      if (data?.latitude != null && data?.longitude != null) {
        return { latitude: data.latitude, longitude: data.longitude };
      }
      return null;
    })();
    if (ownerAny) return ownerAny;

    const { data: recentDog, error: dogErr } = await supabase
      .from('dog_profiles')
      .select('id')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dogErr || !recentDog?.id) {
      if (dogErr) console.log('🐶 최근 강아지 조회 에러:', dogErr.message, dogErr);
      return null;
    }

    const tryDogQuery = async (orderBy?: 'updated_at' | 'created_at') => {
      let q = supabase
        .from('locations_public')
        .select('latitude, longitude')
        .eq('dog_id', recentDog.id);

      if (orderBy) q = q.order(orderBy, { ascending: false });

      const { data, error } = await q.limit(1).maybeSingle();
      if (!error && data?.latitude != null && data?.longitude != null) {
        return { latitude: data.latitude, longitude: data.longitude };
      }
      return null;
    };

    const dogByUpdated = await tryDogQuery('updated_at');
    if (dogByUpdated) return dogByUpdated;

    const dogByCreated = await tryDogQuery('created_at');
    if (dogByCreated) return dogByCreated;

    const dogAny = await (async () => {
      const { data } = await supabase
        .from('locations_public')
        .select('latitude, longitude')
        .eq('dog_id', recentDog.id)
        .limit(1)
        .maybeSingle();
      if (data?.latitude != null && data?.longitude != null) {
        return { latitude: data.latitude, longitude: data.longitude };
      }
      return null;
    })();
    if (dogAny) return dogAny;

    const { data: rawLoc } = await supabase
      .from('locations')
      .select('latitude, longitude')
      .eq('dog_id', recentDog.id)
      .limit(1)
      .maybeSingle();

    if (rawLoc?.latitude != null && rawLoc?.longitude != null) {
      return { latitude: rawLoc.latitude, longitude: rawLoc.longitude };
    }

    return null;
  };

  // ✅ (2) 집 위치 anchor
  const fetchHomeAnchor = async () => {
    const uid = await getUid();
    if (!uid) return null;

    const { data, error } = await supabase
      .from('user_home_locations')
      .select('latitude, longitude')
      .eq('user_id', uid)
      .single();

    if (error) {
      console.log('🏠 집 위치 조회 에러:', error.message, error);
      return null;
    }
    if (!data || data.latitude == null || data.longitude == null) return null;

    return { latitude: data.latitude, longitude: data.longitude };
  };

  // ✅ 전체 강아지 위치(목록) — 내 강아지는 제외
  const fetchDogLocations = async () => {
    const uid = await getUid(); // 내 id
    let q = supabase
      .from('locations_public')
      .select('id, latitude, longitude, image_url, dog_name, breed, age, owner_id, dog_id');

    // 서버 쿼리에서 바로 제외
    if (uid) {
      q = q.neq('owner_id', uid);
    }

    const { data, error } = await q;

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

      const myDogAnchor = await fetchMyDogAnchor();
      if (myDogAnchor) {
        setAnchorLocation(myDogAnchor);
        setAnchorSource('mydog');
      } else {
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

    const radiusFiltered = anchorLocation
      ? searched.filter((d) => d.distance < 5000)
      : searched;

    const sorted = radiusFiltered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    setDogsWithDistance(sorted);

    // 디버깅 로그
    console.log('🐶 전체 강아지(내 강아지 제외):', dogLocations.length);
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
