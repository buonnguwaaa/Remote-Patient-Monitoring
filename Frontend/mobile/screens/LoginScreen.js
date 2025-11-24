import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* HEADER */}
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoText}>RPM</Text>
                        </View>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue</Text>
                    </View>

                    {/* EMAIL */}
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        placeholder="Enter your email"
                        style={styles.input}
                        keyboardType="email-address"
                    />

                    {/* PASSWORD */}
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordBox}>
                        <TextInput
                            placeholder="Enter your password"
                            secureTextEntry={!showPassword}
                            style={{ flex: 1 }}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* FORGOT PASSWORD */}
                    <TouchableOpacity style={styles.forgotBtn}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* SIGN IN BUTTON */}
                    <TouchableOpacity style={styles.signInBtn}>
                        <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity>

                    {/* OR CONTINUE */}
                    <View style={styles.dividerWrap}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>Or continue with</Text>
                        <View style={styles.line} />
                    </View>

                    {/* SOCIAL BUTTONS */}
                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialBtn}>
                            <Text style={styles.socialIcon}>G</Text>
                            <Text style={styles.socialText}>Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.socialBtn}>
                            <Text style={styles.socialIcon}></Text>
                            <Text style={styles.socialText}>Apple</Text>
                        </TouchableOpacity>
                    </View>

                    {/* SIGN UP LINK */}
                    <Text style={styles.bottomText}>
                        Don't have an account? <Text style={styles.link}>Sign Up</Text>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: "#fff" },

    header: { alignItems: "center", marginBottom: 20, marginTop: 10 },

    logoBox: {
        width: 80,
        height: 80,
        backgroundColor: "#000",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },

    logoText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
    title: { fontSize: 22, fontWeight: "700", marginBottom: 10, marginTop: 10 },
    subtitle: { color: "#777" },

    label: { fontWeight: "600", marginTop: 15, marginBottom: 5 },

    input: {
        backgroundColor: "#F4F4F5",
        padding: 14,
        borderRadius: 10,
    },

    passwordBox: {
        backgroundColor: "#F4F4F5",
        padding: 14,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
    },

    eyeIcon: {
        fontSize: 16,
        paddingHorizontal: 6,
    },

    forgotBtn: {
        marginTop: 8,
        alignSelf: "flex-end",
    },

    forgotText: {
        color: "#0033cc",
        fontSize: 13,
        fontWeight: "500",
    },

    signInBtn: {
        backgroundColor: "#000",
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 25,
    },

    signInText: {
        textAlign: "center",
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },

    dividerWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 25,
    },

    line: {
        flex: 1,
        height: 1,
        backgroundColor: "#ddd",
    },

    dividerText: {
        marginHorizontal: 10,
        color: "#666",
    },

    socialRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    socialBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        width: "47%",
        justifyContent: "center",
    },

    socialIcon: {
        fontSize: 18,
        marginRight: 10,
    },

    socialText: {
        fontSize: 14,
        fontWeight: "500",
    },

    bottomText: {
        textAlign: "center",
        marginTop: 35,
        color: "#444",
        fontSize: 13,
        marginBottom: 30,
    },

    link: { color: "#0033cc", fontWeight: "600" },
});
