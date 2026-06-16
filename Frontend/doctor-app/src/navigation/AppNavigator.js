import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import DrawerContent from "./DrawerContent";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function HamburgerButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ marginLeft: 16, padding: 4 }}
    >
      <Ionicons name="menu-outline" size={26} color="#111827" />
    </TouchableOpacity>
  );
}

function DoctorDrawer() {
  const drawerScreenOptions = ({ navigation }) => ({
    headerShown: true,
    headerStyle: { backgroundColor: "#fff" },
    headerTitleStyle: { fontSize: 17, fontWeight: "700", color: "#111827" },
    headerShadowVisible: false,
    headerLeft: () => <HamburgerButton navigation={navigation} />,
  });

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        drawerType: "slide",
        drawerStyle: { width: 280 },
        overlayColor: "rgba(0,0,0,0.4)",
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Tổng quan",
        })}
      />
      <Drawer.Screen
        name="Patients"
        component={PlaceholderScreen}
        initialParams={{ title: "Hồ sơ bệnh nhân", icon: "people-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Hồ sơ bệnh nhân",
        })}
      />
      <Drawer.Screen
        name="Alerts"
        component={PlaceholderScreen}
        initialParams={{ title: "Quản lý cảnh báo", icon: "warning-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Cảnh báo",
        })}
      />
      <Drawer.Screen
        name="Chat"
        component={PlaceholderScreen}
        initialParams={{ title: "Tin nhắn", icon: "chatbubble-ellipses-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Tin nhắn",
        })}
      />
      <Drawer.Screen
        name="Thresholds"
        component={PlaceholderScreen}
        initialParams={{ title: "Cấu hình ngưỡng", icon: "options-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Cấu hình ngưỡng",
        })}
      />
      <Drawer.Screen
        name="Reminders"
        component={PlaceholderScreen}
        initialParams={{ title: "Nhắc nhở", icon: "alarm-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Nhắc nhở",
        })}
      />
      <Drawer.Screen
        name="Profile"
        component={PlaceholderScreen}
        initialParams={{ title: "Hồ sơ bác sĩ", icon: "person-circle-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Hồ sơ",
        })}
      />
      <Drawer.Screen
        name="Settings"
        component={PlaceholderScreen}
        initialParams={{ title: "Cài đặt", icon: "settings-outline" }}
        options={({ navigation }) => ({
          ...drawerScreenOptions({ navigation }),
          title: "Cài đặt",
        })}
      />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang kiểm tra phiên đăng nhập…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={DoctorDrawer} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#F2F6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#4B5563" },
});
