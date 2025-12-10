import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

const extras = (Constants?.manifest?.extra) || (Constants?.expoConfig?.extra) || {};
const BASE_URL = process.env.BASE_URL || extras.BASE_URL || 'http://localhost:8080';

export async function loginWithGoogle() {
  const url = `${BASE_URL}/auth/google/login`;
  try {
    // Prefer opening in the system browser; the backend will handle redirects.
    await WebBrowser.openBrowserAsync(url);
    return { ok: true, opened: true };
  } catch (e) {
    // Fallback: try Linking if WebBrowser fails
    try {
      await Linking.openURL(url);
      return { ok: true, opened: true };
    } catch (err) {
      return { ok: false, error: 'failed_to_open_login', details: err };
    }
  }
}

export default { loginWithGoogle };
