import React from "react";
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { useAuth } from "../hooks/useAuth";

// Auth
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

// Patient
import HomeScreen from "../screens/patient/HomeScreen";
import HistoryScreen from "../screens/patient/HistoryScreen";
import AlertScreen from "../screens/patient/AlertScreen";
import ProfileScreen from "../screens/patient/ProfileScreen";
import DoctorChatScreen from "../screens/patient/DoctorChatScreen";
import InputMeasurementPatientScreen from "../screens/patient/InputMeasurementPatientScreen";


// Nurse
import NursePatientListScreen from "../screens/nurse/NursePatientListScreen";
import MeasurementInputScreen from "../screens/nurse/MeasurementInputScreen";
import NurseProfileScreen from "../screens/nurse/NurseProfileScreen";
import PatientDetailScreen from "../screens/nurse/PatientDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// BOTTOM TABS: PATIENT
function PatientTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === "PatientHome") {
                        return <Ionicons name="home-outline" size={size} color={color} />;
                    }
                    if (route.name === "PatientHistory") {
                        return (
                            <Ionicons name="stats-chart-outline" size={size} color={color} />
                        );
                    }
                    if (route.name === "DoctorChat") {
                        return (
                            <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={size}
                                color={color}
                            />
                        );
                    }
                    if (route.name === "InputMeasurementPatientScreen") {
                        return (
                            <Ionicons
                                name="create-outline"
                                size={size}
                                color={color}
                            />
                        );
                    }
                    if (route.name === "PatientAlerts") {
                        return (
                            <Ionicons
                                name="alert-circle-outline"
                                size={size}
                                color={color}
                            />
                        );
                    }
                    if (route.name === "PatientProfile") {
                        return (
                            <Ionicons
                                name="person-circle-outline"
                                size={size}
                                color={color}
                            />
                        );
                    }
                    return null;
                },
            })}
        >
            <Tab.Screen
                name="PatientHome"
                component={HomeScreen}
                options={{ title: "Trang chủ" }}
            />
            <Tab.Screen
                name="InputMeasurementPatientScreen"
                component={InputMeasurementPatientScreen}
                options={{ title: "Nhập Liệu" }}
            />
            <Tab.Screen
                name="PatientHistory"
                component={HistoryScreen}
                options={{ title: "Lịch sử" }}
            />
            <Tab.Screen
                name="DoctorChat"
                component={DoctorChatScreen}
                options={{ title: "Tin nhắn" }}
            />
            <Tab.Screen
                name="PatientAlerts"
                component={AlertScreen}
                options={{ title: "Cảnh báo" }}
            />
            <Tab.Screen
                name="PatientProfile"
                component={ProfileScreen}
                options={{ title: "Hồ sơ" }}
            />
        </Tab.Navigator>
    );
}

// BOTTOM TABS: NURSE
function NurseTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === "NursePatients") {
                        return <Ionicons name="people-outline" size={size} color={color} />;
                    }
                    if (route.name === "NurseMeasurementInput") {
                        return (
                            <Ionicons name="create-outline" size={size} color={color} />
                        );
                    }
                    if (route.name === "NurseProfile") {
                        return (
                            <MaterialIcons
                                name="person-outline"
                                size={size}
                                color={color}
                            />
                        );
                    }
                    return null;
                },
            })}
        >
            <Tab.Screen
                name="NursePatients"
                component={NursePatientListScreen}
                options={{ title: "Bệnh nhân" }}
            />
            <Tab.Screen
                name="NurseMeasurementInput"
                component={MeasurementInputScreen}
                options={{ title: "Nhập liệu" }}
            />
            <Tab.Screen
                name="NurseProfile"
                component={NurseProfileScreen}
                options={{ title: "Hồ sơ" }}
            />
        </Tab.Navigator>
    );
}

// ROOT STACK
function RootNavigator() {
    const { user, initializing } = useAuth();

    if (initializing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Đang kiểm tra phiên đăng nhập…</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
            </Stack.Navigator>
        );
    }

    const role = user?.role || "patient";

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="MainTabs"
                component={
                    role === "user.nurse" || role === "nurse"
                        ? NurseTabNavigator
                        : PatientTabNavigator
                }
            />

            {/* <Stack.Screen
                name="PatientDetail"
                component={PatientDetailScreen}
            /> */}
            {/* <Stack.Screen
                name="DoctorChat"
                component={DoctorChatScreen}
            /> */}
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
    loadingContainer: {
        flex: 1,
        backgroundColor: "#F2F6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 8,
        fontSize: 13,
        color: "#4B5563",
    },
});
