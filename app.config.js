import 'dotenv/config';

export default {
  expo: {
    name: "dogwalk-app",
    slug: "dogwalk-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "dogwalkapp",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "이 앱은 사용자의 위치를 기반으로 주변 강아지를 보여줍니다."
        }
      ]
    ],
    android: {
      package: "com.yourname.dogwalkapp",
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    ios: {
      bundleIdentifier: "com.yourname.dogwalkapp",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "이 앱은 사용자의 위치를 기반으로 주변 강아지를 보여줍니다."
      }
    },
    extra: {
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    },
    runtimeVersion: {
      policy: "sdkVersion"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    jsEngine: "hermes"
  }
};
