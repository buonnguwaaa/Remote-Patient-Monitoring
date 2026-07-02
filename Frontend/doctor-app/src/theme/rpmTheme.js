/**
 * rpmTheme.js — RPM Unified Design System
 *
 * Single source of truth for all design tokens used across Patient, Nurse,
 * and Doctor UIs. Every value here was extracted from the patient app
 * (Frontend/mobile/src/screens/patient/*) and nurse app
 * (Frontend/doctor-app/src/screens/nurse/*) so that the doctor screens
 * can be refactored to match.
 *
 * Usage:
 *   import { colors, radius, spacing, typography, shadows, tabBar, chip, input } from "../theme/rpmTheme";
 */

// ─── Core Color Palette ──────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  background: "#F2F6FF",        // patient: SafeAreaView bg (#F2F4FF ≈ #F2F6FF, also used by nurse)
  surface: "#FFFFFF",            // card backgrounds
  surfaceMuted: "#F9FAFB",       // muted card / section bg (nurse safeArea, patient sectionStateCard)
  surfaceSoftBlue: "#EFF6FF",    // icon backgrounds, soft blue tint (patient greetingAvatar, referenceBadge)
  surfaceVital: "#F6F7FF",       // vital cards inner bg (patient vitalCard)

  // Primary brand
  primary: "#2563EB",            // accent color everywhere (patient, nurse)
  primaryDark: "#1D4ED8",        // active filter text, pressed states
  primarySoft: "#E5EDFF",        // soft badges, section badge bg (patient sectionBadge)
  primarySoftBg: "#DBEAFE",      // active filter chips (patient/nurse), avatar ring
  primaryTint: "#EEF2FF",        // info icon wrappers (patient infoIconWrapper)

  // Text hierarchy
  text: "#111827",               // primary text (patient greetingName, profileName, infoValue)
  textDark: "#1A2740",           // card titles (patient cardTitle, sectionTitle)
  textSecondary: "#6B7280",      // secondary / label text (patient contactLabel, headerSub)
  textMuted: "#9CA3AF",          // muted / placeholder (patient vitalMeta, tabBarInactive)
  textHint: "#4B5563",           // hint text (patient alertExtraText, nurse emptyTitle)

  // Borders
  border: "#E5E7EB",             // main border (patient, nurse)
  borderSoft: "#F3F4F6",         // soft border (tab bar top, card dividers)
  borderInput: "#D1D5DB",        // input borders (patient inputPrimary)

  // Status: Success
  success: "#16A34A",            // green text (patient checkmark)
  successDark: "#065F46",        // dark green for badges
  successSoft: "#DCFCE7",        // nurse success badge bg
  successSoftAlt: "#D1FAE5",     // prescription active badge
  successBg: "#F0FDF4",          // green alert box bg (patient greetingAlertBox)
  successBorder: "#BBF7D0",      // green alert box border

  // Status: Danger
  danger: "#DC2626",             // red text / icons
  dangerDark: "#B91C1C",        // dark red text (patient errors, validations)
  dangerDeep: "#991B1B",        // deep red for badges
  dangerSoft: "#FEE2E2",        // error boxes bg (nurse errorBox)
  dangerSoftAlt: "#FEF2F2",     // warning item high bg (patient warningItemHigh)
  dangerBg: "#FFF5F5",          // error card bg
  dangerBorder: "#FECACA",      // error card border (patient errorCard)
  dangerAccent: "#EF4444",       // retry button bg, bright red

  // Status: Warning
  warning: "#D97706",            // warning text
  warningDark: "#B45309",       // dark warning text
  warningSoft: "#FEF3C7",       // warning notice bg (nurse noticeBox)
  warningBg: "#FFFBEB",         // warning background
  warningAccent: "#F59E0B",     // bright warning

  // Status: Info
  info: "#316BFF",               // patient brand blue (patient greetingAvatar icon)

  // Misc
  disabled: "#D1D5DB",
  overlay: "rgba(15, 23, 42, 0.76)", // modal overlays (patient qrModalOverlay)
  overlayLight: "rgba(0,0,0,0.4)",   // lighter overlay
};

// ─── Border Radii ────────────────────────────────────────────────────────────

export const radius = {
  xs: 6,       // small inline elements
  sm: 8,       // nurse errorBox, small chips
  md: 12,      // card inner elements, inputs (patient inputPrimary), badges
  lg: 14,      // vital cards (patient vitalCard), section state cards
  xl: 16,      // info cards (patient infoCard, referenceCard), nurse groupContainer
  "2xl": 18,   // main cards (patient card, greetingCard, alertSectionCard)
  "3xl": 20,   // header cards (patient headerCard), filter chips
  "4xl": 24,   // modal cards (patient qrModalCard), avatar large
  pill: 999,   // pill / fully rounded (badges, progress bars)
};

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,      // standard card padding (patient profileCard, infoCard)
  xl: 18,      // large card padding (patient card, headerCard)
  "2xl": 20,   // screen horizontal padding (patient container)
  "3xl": 24,
  "4xl": 32,
  screen: 20,  // alias: screen edge padding
  card: 16,    // alias: card internal padding
  section: 20, // alias: vertical section spacing
};

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  // Screen-level titles
  screenTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  // Card titles, section titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textDark,
  },
  // Subsection / inner card titles
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  // Header sub-title (e.g. patient headerTitle)
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  // Body text
  body: {
    fontSize: 14,
    color: colors.text,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  // Small / secondary text
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Muted hint / timestamp text
  hint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Label text (form labels)
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Value text (form values)
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  // Large number display (vital values)
  vitalValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  // Badge / chip text
  badge: {
    fontSize: 11,
    fontWeight: "700",
  },
  // Tab bar label
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
};

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  // Standard card shadow (patient card, infoCard)
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Elevated card shadow (patient headerCard, greetingCard)
  cardElevated: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Subtle shadow (patient infoCard, referenceCard)
  cardSubtle: {
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // List item shadow (patient warningItem)
  listItem: {
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  // Nurse group card shadow
  group: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

// ─── Tab Bar Presets ─────────────────────────────────────────────────────────

export const tabBar = {
  activeTintColor: colors.primary,
  inactiveTintColor: colors.textMuted,
  labelStyle: {
    ...typography.tabLabel,
  },
  /** Factory: call with useSafeAreaInsets().bottom */
  style: (bottomInset = 0) => ({
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 60 + bottomInset,
    paddingBottom: bottomInset + 8,
    paddingTop: 6,
  }),
  badgeStyle: {
    fontSize: 10,
    fontWeight: "700",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    lineHeight: 18,
    backgroundColor: colors.dangerAccent,
  },
};

// ─── Card Presets ────────────────────────────────────────────────────────────

export const cards = {
  /** Standard white card with rounded corners and light shadow */
  standard: {
    backgroundColor: colors.surface,
    borderRadius: radius["2xl"],
    padding: spacing.xl,
    ...shadows.card,
  },
  /** Elevated card for hero sections (greeting, stats) */
  elevated: {
    backgroundColor: colors.surface,
    borderRadius: radius["2xl"],
    padding: spacing.xl,
    ...shadows.cardElevated,
  },
  /** Info/detail card */
  info: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.cardSubtle,
  },
  /** List item card */
  listItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.listItem,
  },
};

// ─── Chip / Filter Presets ───────────────────────────────────────────────────

export const chip = {
  container: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius["3xl"],
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  containerActive: {
    backgroundColor: colors.primarySoftBg,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 18,
  },
  textActive: {
    color: colors.primaryDark,
  },
};

// ─── Input Presets ───────────────────────────────────────────────────────────

export const input = {
  standard: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
};

// ─── Button Presets ──────────────────────────────────────────────────────────

export const button = {
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15,
  },
  danger: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  dangerText: {
    color: colors.dangerDark,
    fontWeight: "700",
  },
  small: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  smallText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 13,
  },
};

// ─── Status Badge Presets ────────────────────────────────────────────────────

export const statusBadge = {
  active: {
    bg: colors.successSoftAlt,
    text: colors.successDark,
    label: "Đang hoạt động",
  },
  completed: {
    bg: colors.primarySoftBg,
    text: colors.primaryDark,
    label: "Hoàn thành",
  },
  discontinued: {
    bg: colors.dangerSoft,
    text: colors.dangerDeep,
    label: "Ngưng dùng",
  },
  expired: {
    bg: colors.borderSoft,
    text: colors.textHint,
    label: "Hết hạn",
  },
  open: {
    bg: "#FFE5E5",
    text: "#D63031",
    label: "Chưa xác nhận",
  },
  acknowledged: {
    bg: "#E4FFE9",
    text: "#1A8F4A",
    label: "Đã xác nhận",
  },
};

// ─── Header Options (React Navigation) ──────────────────────────────────────

export const headerOptions = {
  headerTitleAlign: "center",
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  headerStyle: {
    backgroundColor: colors.surface,
  },
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
};

// ─── Convenience: create rootHeaderOptions for stack screens ─────────────────

export const rootHeaderOptions = (title) => ({
  headerShown: true,
  title,
  ...headerOptions,
});
