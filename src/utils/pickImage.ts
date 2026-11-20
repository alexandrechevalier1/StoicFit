import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** Ouvre la galerie et renvoie l'URI d'une image carrée, ou `null` si annulé / refusé. */
export async function pickSquareImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission requise', "L'accès à la galerie photo est nécessaire pour choisir une image.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}
