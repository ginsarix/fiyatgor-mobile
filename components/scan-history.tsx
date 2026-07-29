import { ThemeColors, useTheme } from "@/constants/theme";
import { formatPrice } from "@/lib/format";
import { ScanEntry } from "@/types/scan-history";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Pressable, View, StyleSheet, Text } from "react-native";

export function ScanHistory({
  scanHistory,
  onChange,
  homeStyles,
}: {
  scanHistory: ScanEntry[];
  onChange: (newEntries: ScanEntry[]) => void;
  homeStyles: {
    tinyBtn: Record<string, unknown>;
    tinyBtnText: Record<string, unknown>;
  };
}) {
  const t = useTheme();
  const historyStyles = useMemo(() => makeHistoryStyles(t), [t]);

  return (
    <View style={historyStyles.historySection}>
      <View style={historyStyles.historySectionTitle}>
        <Text style={historyStyles.historyTitle}>Taranan Barkodlar</Text>
        <Pressable style={homeStyles.tinyBtn} onPress={() => onChange([])}>
          <Text style={homeStyles.tinyBtnText}>Temizle</Text>
          <MaterialIcons
            name="delete-sweep"
            color={t.deleteIcon}
            size={14}
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>
      {scanHistory.map((entry) => (
        <ScanHistoryItem
          key={entry.id}
          entry={entry}
          arrowIconColor={t.arrowIcon}
          styles={historyStyles}
        />
      ))}
    </View>
  );
}

function ScanHistoryItem({
  entry,
  arrowIconColor,
  styles,
}: {
  entry: ScanEntry;
  arrowIconColor: string;
  styles: ReturnType<typeof makeHistoryStyles>;
}) {
  const [open, setOpen] = useState(false);
  const found = entry.productName !== null;
  const discounted = found && entry.discountActive && entry.discountedPrice;

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((v) => !v)}>
        <MaterialIcons
          name={open ? "keyboard-arrow-down" : "keyboard-arrow-right"}
          size={20}
          color={arrowIconColor}
        />
        <Text style={styles.barcode} numberOfLines={1}>
          {entry.barcode}
        </Text>
        {discounted && (
          <View style={[styles.badge, styles.badgeDiscount]}>
            <Text style={styles.discountBadgeText}>İndirimde</Text>
          </View>
        )}
        <View
          style={[
            styles.badge,
            found ? styles.badgeFound : styles.badgeNotFound,
          ]}
        >
          <Text style={styles.badgeText}>
            {found ? (!entry.demo ? "Bulundu" : "Demo") : "Bulunamadı"}
          </Text>
        </View>
      </Pressable>

      {open && (
        <View style={styles.body}>
          {found ? (
            <>
              <Text style={styles.bodyName}>{entry.productName}</Text>
              {discounted && (
                <Text style={styles.bodyOriginalPrice}>
                  {formatPrice(entry.price!, entry.currency)}
                </Text>
              )}
              <Text
                style={[styles.bodyPrice, discounted && styles.bodyPriceDiscounted]}
              >
                {formatPrice(
                  discounted ? entry.discountedPrice! : entry.price!,
                  entry.currency,
                )}
              </Text>
            </>
          ) : (
            <Text style={styles.bodyNotFound}>Ürün bulunamadı</Text>
          )}
        </View>
      )}
    </View>
  );
}

function makeHistoryStyles(t: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.cardBg,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.cardBorder,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    barcode: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: t.textPrimary,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    badgeFound: {
      backgroundColor: t.badgeFoundBg,
    },
    badgeNotFound: {
      backgroundColor: t.badgeNotFoundBg,
    },
    badgeDiscount: {
      backgroundColor: t.discountBadgeBg,
      borderWidth: 1,
      borderColor: t.discountBadgeBorder,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: t.badgeText,
    },
    discountBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: t.discountAccent,
    },
    body: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: t.bodyBorder,
    },
    bodyName: {
      fontSize: 16,
      fontWeight: "700",
      color: t.textPrimary,
      marginBottom: 4,
    },
    bodyPrice: {
      fontSize: 22,
      fontWeight: "900",
      color: t.textPrimary,
    },
    bodyPriceDiscounted: {
      color: t.discountAccent,
    },
    bodyOriginalPrice: {
      fontSize: 14,
      fontWeight: "600",
      color: t.originalPriceText,
      textDecorationLine: "line-through",
      marginBottom: 2,
    },
    bodyNotFound: {
      fontSize: 14,
      color: t.textSecondary,
      fontStyle: "italic",
    },
    historySection: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      marginTop: 16,
    },
    historySectionTitle: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
      alignItems: "center",
    },
    historyTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: t.textSecondary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      includeFontPadding: false,
      textAlignVertical: "center",
    },
  });
}
