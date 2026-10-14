import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** iPhone: writes the file to the app's cache and opens the share sheet (Save to Files, AirDrop, Mail). */
export async function saveFile(name: string, contents: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: 'public.json', dialogTitle: name });
}
