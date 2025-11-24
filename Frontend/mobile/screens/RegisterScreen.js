import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function RegisterScreen() {
  const [gender, setGender] = useState("Male");
  const [showGenderModal, setShowGenderModal] = useState(false);

  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>RPM</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          {/* FULL NAME */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput placeholder="Enter your full name" style={styles.input} />

          {/* CCCD */}
          <Text style={styles.label}>Citizen ID (CCCD)</Text>
          <TextInput
            placeholder="Enter your ID number"
            keyboardType="numeric"
            style={styles.input}
          />

          {/* EMAIL */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            keyboardType="email-address"
            style={styles.input}
          />

          {/* GENDER */}
          <Text style={styles.label}>Gender</Text>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setShowGenderModal(true)}
          >
            <Text>{gender}</Text>
          </TouchableOpacity>

          {/* Gender Modal */}
          <Modal
            transparent
            visible={showGenderModal}
            animationType="fade"
            onRequestClose={() => setShowGenderModal(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowGenderModal(false)}
            >
              <View style={styles.modalBox}>
                {["Male", "Female", "Other"].map((g) => (
                  <Pressable
                    key={g}
                    style={styles.option}
                    onPress={() => {
                      setGender(g);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.optionText}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

          {/* DOB */}
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{dob ? dob.toLocaleDateString() : "Pick a date"}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dob || new Date(2000, 0, 1)}
              mode="date"
              display="spinner"
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (selected) setDob(selected);
              }}
            />
          )}

          {/* PASSWORD */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Create a password"
            secureTextEntry
            style={styles.input}
          />
          <Text style={styles.helper}>Must be at least 8 characters</Text>

          {/* CONFIRM PASSWORD */}
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            placeholder="Confirm your password"
            secureTextEntry
            style={styles.input}
          />

          {/* BUTTON */}
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Create Account</Text>
          </TouchableOpacity>

          {/* TERMS */}
          <Text style={styles.terms}>
            By signing up, you agree to our <Text style={styles.link}>Terms</Text>{" "}
            and <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          {/* SIGN IN */}
          <Text style={styles.bottomText}>
            Already have an account? <Text style={styles.link}>Sign In</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff" },

  header: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },

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
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#777" },

  label: { fontWeight: "600", marginTop: 15, marginBottom: 5 },

  input: {
    backgroundColor: "#F4F4F5",
    padding: 14,
    borderRadius: 10,
  },

  selectBox: {
    backgroundColor: "#F4F4F5",
    padding: 14,
    borderRadius: 10,
  },

  helper: { color: "#666", fontSize: 12, marginTop: 4 },

  btn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 25,
  },

  btnText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "600",
  },

  terms: {
    textAlign: "center",
    marginTop: 15,
    color: "#666",
    fontSize: 12,
  },

  link: { color: "#0033cc", fontWeight: "600" },

  bottomText: {
    textAlign: "center",
    marginTop: 15,
    color: "#444",
    fontSize: 13,
    marginBottom: 40,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
  },

  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },

  optionText: {
    fontSize: 16,
  },
});
