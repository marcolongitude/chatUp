import { axiosInstance } from "@/shared/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_REFRESH = "auth.refreshToken";

export async function logoutApi(): Promise<void> {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH);
  try {
    await axiosInstance.post(
      "/auth/logout",
      { refreshToken: refreshToken || undefined },
      { headers: { "X-Skip-Auth-Refresh": "1" } }
    );
  } catch {
    // Local cleanup still proceeds in useLogout.
  }
}
