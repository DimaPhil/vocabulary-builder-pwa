import { Pressable, StyleSheet } from "react-native";

import { Text } from "@/components/ui/Text";
import { useAppTheme } from "@/lib/theme";

type ChipProps = {
  active?: boolean;
  label: string;
  onPress?: () => void;
};

export function Chip({ active, label, onPress }: ChipProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? theme.colors.primarySoft
            : theme.colors.surface,
          borderColor: active ? theme.colors.borderStrong : theme.colors.border,
        },
      ]}
    >
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
