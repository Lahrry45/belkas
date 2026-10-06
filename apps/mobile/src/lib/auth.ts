import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import { supabase } from "./supabase";

GoogleSignin.configure({
  // The WEB client ID: Google issues an ID token for it, and Supabase verifies that audience.
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  scopes: ["email", "profile"],
});

/**
 * Native Google sign-in → Supabase signInWithIdToken.
 * The same Google account yields the same Supabase user as the website's OAuth flow.
 * Returns false if the user cancelled.
 */
export async function signInWithGoogle(): Promise<boolean> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return false;
    const idToken = res.data.idToken;
    if (!idToken) throw new Error("Google did not return an ID token. Check the web client ID.");
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) throw error;
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return false;
    throw e;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  try {
    await GoogleSignin.signOut();
  } catch {}
}
