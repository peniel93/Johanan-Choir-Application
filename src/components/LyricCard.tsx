import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { Lyric } from '../types';

interface Props {
  lyric: Lyric;
  liked: boolean;
  favorite: boolean;
  onLike: () => void;
  onFavorite: () => void;
}

export function LyricCard({ lyric, liked, favorite, onLike, onFavorite }: Props) {
  const transpose = lyric.transpose ?? 0;
  const transposeLabel = `${transpose > 0 ? '+' : ''}${transpose}`;

  return (
    <View style={styles.card}>
      <View style={styles.transposeBadge}>
        <Text style={styles.transposeText}>Transpose {transposeLabel}</Text>
      </View>
      <Text style={styles.title}>{lyric.title}</Text>
      <Text style={styles.meta}>#{lyric.number ?? '-'} • {lyric.scale} • {lyric.rhythm}</Text>
      <Text style={styles.content}>
        {lyric.content}
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={onLike} style={styles.iconButton}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#dc2626' : colors.blue700} />
          <Text style={styles.iconLabel}>ውድ</Text>
        </Pressable>

        <Pressable onPress={onFavorite} style={styles.iconButton}>
          <Ionicons name={favorite ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.blue700} />
          <Text style={styles.iconLabel}>አስቀምጥ</Text>
        </Pressable>

        <View style={styles.likesWrap}>
          <Ionicons name="musical-notes" size={18} color={colors.blue500} />
          <Text style={styles.likesText}>{lyric.likes_count ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFFEB',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.blue900,
    marginBottom: 4,
  },
  transposeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  transposeText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 12,
  },
  meta: {
    color: colors.textMuted,
    marginBottom: 10,
    fontSize: 12,
  },
  content: {
    color: colors.textDark,
    lineHeight: 22,
    fontSize: 12,
    textAlign: 'left',
    alignSelf: 'stretch',
    paddingLeft: 12,
    paddingRight: 6,
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
  },
  iconLabel: {
    color: colors.blue700,
    fontSize: 12,
    fontWeight: '600',
  },
  likesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
  },
  likesText: {
    color: colors.blue700,
    fontSize: 12,
    fontWeight: '700',
  },
});
