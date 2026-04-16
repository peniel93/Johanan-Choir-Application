import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY = 'jc_device_id_v1';

function createFallbackId() {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const id = createFallbackId();
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}
