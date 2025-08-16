'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function ReviewScreen() {
    const { id: rawId } = useLocalSearchParams();
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const router = useRouter();
    const [review, setReview] = useState('');
    const [reportMode, setReportMode] = useState(false);
    const [reportReason, setReportReason] = useState('');

    const handleSubmit = async () => {
        if (!id) return;

        const { error } = await supabase
            .from('walk_schedules')
            .update({
                review_submitted: true,
                review,
                reported: reportMode,
                report_reason: reportMode ? reportReason : null,
            })
            .eq('id', id);

        if (error) {
            Alert.alert('제출 실패', error.message);
        } else {
            Alert.alert('제출 완료', '감사합니다! 소중한 피드백이 등록되었습니다.');
            router.replace('/'); // 홈으로 돌아감
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🐾 산책은 어땠나요?</Text>

            <Text style={styles.label}>후기</Text>
            <TextInput
                style={styles.input}
                placeholder="좋았던 점이나 느낀 점을 작성해주세요"
                value={review}
                onChangeText={setReview}
                multiline
            />

            <View style={styles.reportRow}>
                <Text style={styles.label}>신고하기</Text>
                <Switch
                    value={reportMode}
                    onValueChange={setReportMode}
                    trackColor={{ true: '#EF9A9A', false: '#ccc' }}
                    thumbColor={reportMode ? '#EF5350' : '#f4f3f4'}
                />
            </View>

            {reportMode && (
                <>
                    <Text style={styles.label}>신고 사유</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="무례한 언행, 약속 불이행 등"
                        value={reportReason}
                        onChangeText={setReportReason}
                        multiline
                    />
                </>
            )}

            <TouchableOpacity onPress={handleSubmit} style={styles.button}>
                <Text style={styles.buttonText}>제출하기</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7F1', padding: 24, paddingTop: 40 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 16, marginBottom: 8, color: '#444' },
    input: {
        backgroundColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        textAlignVertical: 'top',
    },
    reportRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#81C784',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
