import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import request from './httpClient';

const extras = (Constants?.manifest?.extra) || (Constants?.expoConfig?.extra) || {};
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || 'http://10.0.2.2:8080';

export async function loginWithGoogle() {
  const url = `${BASE_URL}/auth/google/login`;
  const redirectUrl = Linking.createURL('login-callback');

  try {
    const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

    if (result.type === 'success') {
      const parsedUrl = Linking.parse(result.url);
      const token = parsedUrl.queryParams?.accessToken;
      const refreshToken = parsedUrl.queryParams?.refreshToken;

      if (!token) {
        return {
          ok: false,
          error: `Không nhận được token từ hệ thống.\nLink BE gửi về là: ${result.url}`
        };
      }

      return { ok: true, data: { accessToken: token, refreshToken: refreshToken } };
    }

    return { ok: false, error: 'Người dùng huỷ đăng nhập' };
  } catch (e) {
    return { ok: false, error: `failed_to_open_login: ${e.message || e}`, details: e };
  }
}

export default { loginWithGoogle };
