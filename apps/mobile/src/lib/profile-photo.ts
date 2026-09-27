// profile-photo.ts — learner avatar. Upload to the `avatars` bucket, then
// persist the public URL on user_metadata so it survives relaunch.
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { Alert, Linking } from "react-native";

import { supabase } from "./supabase";

export const AVATAR_BUCKET = "avatars";

type UserMeta = {
  avatar_url?: string;
  avatar_path?: string;
  picture?: string;
  display_name?: string;
  full_name?: string;
  name?: string;
};

export function avatarUrlFromMetadata(meta: Record<string, unknown> | undefined | null): string | null {
  const data = (meta ?? {}) as UserMeta;
  const custom = data.avatar_url?.trim();
  if (custom) return custom;
  const picture = data.picture?.trim();
  return picture || null;
}

export function avatarInitialFromMetadata(
  meta: Record<string, unknown> | undefined | null,
  email?: string | null,
): string {
  const data = (meta ?? {}) as UserMeta;
  const name = data.display_name?.trim() || data.full_name?.trim() || data.name?.trim() || email?.trim() || "S";
  return name.charAt(0).toUpperCase() || "S";
}

async function readBytes(uri: string): Promise<Uint8Array> {
  try {
    const file = new File(uri);
    if (file.exists) return await file.bytes();
  } catch {
    // Some picker URIs aren't File-backed; fetch below.
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Couldn’t read that photo.");
  return new Uint8Array(await response.arrayBuffer());
}

async function ensurePermission(origin: "library" | "camera"): Promise<boolean> {
  if (origin === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) return true;
    Alert.alert("Camera access needed", "Allow camera access to take a profile photo.", [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ]);
    return false;
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return true;
  Alert.alert("Photos access needed", "Allow photo access to set a profile photo.", [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: () => void Linking.openSettings() },
  ]);
  return false;
}

export async function pickAndUploadAvatar(origin: "library" | "camera"): Promise<string> {
  if (!(await ensurePermission(origin))) throw new Error("permission");
  const picked =
    origin === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          cameraType: ImagePicker.CameraType.front,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });
  if (picked.canceled) throw new Error("cancelled");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) throw new Error("You’re signed out.");

  const prepared = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 720 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  const bytes = await readBytes(prepared.uri);
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadError) {
    throw new Error(
      uploadError.message.includes("Bucket not found")
        ? "Couldn’t save your photo. Run supabase/migrations/026_avatars_bucket.sql in the SQL Editor first."
        : uploadError.message,
    );
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl, avatar_path: path },
  });
  if (updateError) throw updateError;
  return avatarUrl;
}

export async function clearUploadedAvatar(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) throw new Error("You’re signed out.");
  const meta = (session.user.user_metadata ?? {}) as UserMeta;
  const path = meta.avatar_path?.trim() || `${userId}/avatar.jpg`;
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: "", avatar_path: "" },
  });
  if (error) throw error;
}
